# CRUD Guidelines for Dropz

Modern conventions and best practices for Create, Read, Update, Delete operations in this codebase.

> **Status:** Post-MVP Stabilization Phase
> **Next.js Version:** 16 (using `"use cache"` directive)
> **Last Updated:** 2025-11-16

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Design Principles](#design-principles)
- [CREATE Operations](#create-operations)
- [READ Operations](#read-operations)
- [UPDATE Operations](#update-operations)
- [DELETE Operations](#delete-operations)
- [Error Handling](#error-handling)
- [Performance & Caching](#performance--caching)
- [Security & Authorization](#security--authorization)

---

## Architecture Overview

### Data Layer Structure

```
src/lib/queries.ts          ← Single source of truth for all queries
src/db/schema.ts            ← Database schema definitions
src/app/api/*/route.ts      ← API endpoints (client interactions)
src/app/(login)/actions.ts  ← Server Actions (auth mutations)
drizzle/                    ← Migrations
```

**Key Principle:** All database reads go through `queries.ts`, mutations through Server Actions or API routes.

### Database Schema

**Core Tables:**
- `users` - User accounts
- `planets` - Top-level workspaces (one per user)
- `nodes` - Unified content (Logseq pages + virtual folders)
- `nodeLinks` - Bidirectional page/block references
- `editingSessions` - Track editing mode sessions
- `nodeBackups` - Backup snapshots for undo/restore

---

## Design Principles

### 1. Query Centralization
✅ **DO:** Define all read queries in `src/lib/queries.ts`
❌ **DON'T:** Scatter database queries across components

```typescript
// ✅ GOOD - Centralized query
export async function getNodeByPath(planetSlug: string, pathSegments: string[]) {
  return await db.query.nodes.findFirst({
    where: and(
      eq(nodes.planet_id, planetId),
      eq(nodes.namespace, namespace),
      eq(nodes.slug, slug)
    ),
  });
}

// ❌ BAD - Query in component
const MyComponent = async () => {
  const data = await db.query.nodes.findFirst({ ... }); // Don't do this!
}
```

### 2. Virtual Namespace Hierarchy (Logseq Paradigm)
✅ **DO:** Use `page_name` for Logseq pages, `namespace` for virtual hierarchy
❌ **DON'T:** Use parent_id foreign keys (inflexible, slow)

```typescript
// ✅ GOOD - Logseq page approach (flat storage, virtual hierarchy)
{
  page_name: "guides/setup/intro",      // Full Logseq page name
  namespace: "guides/setup",             // Extracted parent path
  slug: "intro",                         // Leaf name
  depth: 2,                              // Calculated from namespace
  type: "file"                           // All pages are files
}

// Logseq file convention: pages/guides___setup___intro.md → page_name: "guides/setup/intro"

// ❌ BAD - Parent ID approach (rigid, requires recursive queries)
{
  parent_id: 123,  // Limited depth, slow queries
}
```

### 3. Optimistic Updates with Backups
✅ **DO:** Save backups before mutations, apply changes immediately
❌ **DON'T:** Use pessimistic locking or complex rollback logic

```typescript
// ✅ GOOD - Backup-before-modify pattern
await db.insert(nodeBackups).values({
  node_id: nodeId,
  original_data: JSON.stringify(currentState),
  session_id: sessionId,
});
await db.update(nodes).set({ ...changes });

// ❌ BAD - No backup
await db.update(nodes).set({ ...changes }); // Can't undo!
```

### 4. Editing Session Guards
✅ **DO:** Require active editing sessions for mutations
❌ **DON'T:** Allow direct mutations without session tracking

```typescript
// ✅ GOOD - Check editing session
const session = await getActiveEditingSession(user.id, planetId);
if (!session) {
  return Response.json({ error: "No active editing session" }, { status: 403 });
}

// ❌ BAD - No session check
await db.update(nodes).set({ ... }); // Untracked changes!
```

### 5. Performance-First with Caching
✅ **DO:** Cache reads aggressively, invalidate on mutations
❌ **DON'T:** Skip caching or use stale data

```typescript
// ✅ GOOD - Cached query (Next.js 16)
"use cache";

export async function getCachedNodes(planetId: string) {
  return await db.query.nodes.findMany({
    where: eq(nodes.planet_id, planetId),
  });
}

// Configure cache behavior
export const revalidate = 7200; // 2 hours

// Then invalidate on mutation
await db.update(nodes).set({ ... });
revalidateTag("nodes");
```

---

## CREATE Operations

### Modern Conventions

1. **Idempotent Upsert** - Check exists before insert/update
2. **Pre-rendered Content** - Store `parsed_html` from Rust export tool
3. **Automatic Fields** - Set `created_at`, `updated_at`, `depth` automatically
4. **Namespace Extraction** - Extract from `page_name` or file path
5. **Logseq Compatibility** - Handle `___` file naming convention

### Example: Logseq Graph Ingestion

**API Endpoint:** `POST /api/ingest-logseq`

```typescript
export async function POST(req: NextRequest) {
  // 1. Authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get user's workspace
  const workspace = await getUserWorkspace(user.id);
  if (!workspace) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
  }

  // 3. Get uploaded files
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];

  // 4. Process each markdown file
  for (const file of files) {
    if (!file.name.endsWith('.md')) continue;

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString('utf-8');

    // Parse frontmatter
    const { data: frontmatter, content: markdownContent } = matter(content);

    // Determine if journal page
    const isJournal = /^\d{4}_\d{2}_\d{2}\.md$/.test(file.name);

    // Extract page_name from Logseq file naming
    // pages/guides___setup___intro.md → "guides/setup/intro"
    const fileName = file.name.split('/').pop()!.replace('.md', '');
    const pageName = isJournal
      ? fileName.replace(/_/g, '-')  // 2025_11_16 → 2025-11-16
      : fileName.replace(/___/g, '/'); // guides___setup → guides/setup

    // Extract namespace and slug
    const segments = pageName.split('/');
    const slug = segments[segments.length - 1];
    const namespace = segments.slice(0, -1).join('/');
    const depth = namespace ? namespace.split('/').length : 0;

    // Convert markdown to HTML (unified pipeline)
    const parsed_html = await markdownToHtml(markdownContent);

    // 5. Idempotent upsert
    const existing = await db.query.nodes.findFirst({
      where: and(
        eq(nodes.planet_id, workspace.id),
        eq(nodes.page_name, pageName)
      )
    });

    if (existing) {
      // Update existing node
      await db.update(nodes)
        .set({
          parsed_html,
          title: frontmatter.title || slug,
          metadata: frontmatter,
          updated_at: new Date(),
        })
        .where(eq(nodes.id, existing.id));
    } else {
      // Insert new node
      await db.insert(nodes).values({
        planet_id: workspace.id,
        page_name: pageName,
        namespace,
        slug,
        title: frontmatter.title || slug,
        parsed_html,
        type: 'file',
        depth,
        is_journal: isJournal,
        journal_date: isJournal ? new Date(pageName) : null,
        source_folder: isJournal ? 'journals' : 'pages',
        metadata: frontmatter,
        file_path: file.name,
      });
    }
  }

  // 6. Invalidate cache
  revalidateTag(`planet-${workspace.id}`);

  return NextResponse.json({ success: true });
}
```

### Validation Rules

**Required Fields:**
- `planet_id` - Must be a valid planet ID the user owns
- `page_name` - Logseq page identifier (e.g., "guides/setup")
- `slug` - Extracted from page_name
- `parsed_html` - Pre-rendered HTML content

**Optional Fields:**
- `namespace` - Extracted from page_name (defaults to "")
- `is_journal` - Boolean, true for journal pages
- `journal_date` - Date for journal pages
- `metadata` - Extracted from frontmatter

**Page Name Validation:**
```typescript
// Logseq page_name convention: hierarchical with /
// Example: "guides/setup/intro"
function extractNamespaceAndSlug(pageName: string) {
  const segments = pageName.split('/');
  return {
    slug: segments[segments.length - 1],
    namespace: segments.slice(0, -1).join('/'),
    depth: segments.length - 1
  };
}
```

---

## READ Operations

### Modern Conventions

1. **Centralized Queries** - All in `src/lib/queries.ts`
2. **Aggressive Caching** - Cache with `unstable_cache`, 2-hour default
3. **Composite Indexes** - Leverage `(planet_id, namespace, slug)` for O(1) lookups
4. **Lazy Loading** - Load only what's needed, when needed
5. **Breadcrumb Building** - Reconstruct hierarchy from namespace

### Query Patterns

#### Pattern 1: Get Node by Path (O(1) Lookup)

```typescript
export async function getNodeByPath(
  planetSlug: string,
  pathSegments: string[]
): Promise<Node | undefined> {
  const planet = await getPlanetBySlug(planetSlug);
  if (!planet) return undefined;

  const slug = pathSegments.at(-1) || "";
  const namespace = pathSegments.slice(0, -1).join("/");

  return await db.query.nodes.findFirst({
    where: and(
      eq(nodes.planet_id, planet.id),
      eq(nodes.namespace, namespace),
      eq(nodes.slug, slug)
    ),
  });
}
```

**Why O(1)?** Uses composite index, no recursion needed.

#### Pattern 2: Get Children (Single Level)

```typescript
export async function getNodeChildren(
  planetId: string,
  namespace: string,
  type?: "file" | "folder"
): Promise<Node[]> {
  const whereConditions = [
    eq(nodes.planet_id, planetId),
    eq(nodes.namespace, namespace),
  ];

  if (type) {
    whereConditions.push(eq(nodes.type, type));
  }

  return await db.query.nodes.findMany({
    where: and(...whereConditions),
    orderBy: [asc(nodes.order), asc(nodes.title)],
  });
}
```

#### Pattern 3: Build Breadcrumbs

```typescript
export async function getNodeBreadcrumbs(node: Node): Promise<Breadcrumb[]> {
  if (!node.namespace) return []; // Root level

  const segments = node.namespace.split('/');
  const breadcrumbs: Breadcrumb[] = [];

  for (let i = 0; i < segments.length; i++) {
    const slug = segments[i];
    const namespace = segments.slice(0, i).join('/');

    const breadcrumbNode = await db.query.nodes.findFirst({
      where: and(
        eq(nodes.planet_id, node.planet_id),
        eq(nodes.namespace, namespace),
        eq(nodes.slug, slug)
      ),
    });

    if (breadcrumbNode) {
      breadcrumbs.push({
        title: breadcrumbNode.title,
        slug: breadcrumbNode.slug,
        href: buildNodeHref(node.planet_id, [...segments.slice(0, i), slug]),
      });
    }
  }

  return breadcrumbs;
}
```

### Caching Strategy

```typescript
// Next.js 16: Use "use cache" directive
"use cache";

export async function getCachedPlanets() {
  return await db.query.planets.findMany({
    orderBy: (planets, { asc }) => [asc(planets.created_at)],
  });
}

// Configure cache behavior at file level
export const revalidate = 7200; // 2 hours

// Invalidate on mutation
await db.update(nodes).set({ ... });
revalidateTag("planets");
```

---

## UPDATE Operations

### Modern Conventions

1. **Backup-Before-Modify** - Always create backup before updates
2. **Cascade Namespace Changes** - Update entire subtree when slug changes
3. **Session Validation** - Require active editing session
4. **Partial Updates** - Only update provided fields
5. **Metadata Merging** - Merge new metadata with existing

### Example: Updating a Node

**API Endpoint:** `PUT /api/nodes/[id]`

```typescript
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  // 1. Authentication
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get existing node
  const nodeId = parseInt(params.id);
  const existingNode = await db.query.nodes.findFirst({
    where: eq(nodes.id, nodeId),
  });

  if (!existingNode) {
    return Response.json({ error: "Node not found" }, { status: 404 });
  }

  // 3. Validate editing session
  const session = await getActiveEditingSession(user.id, existingNode.planet_id);
  if (!session) {
    return Response.json({ error: "No active editing session" }, { status: 403 });
  }

  // 4. Parse updates
  const updates = await req.json();
  const { slug, content, metadata, title } = updates;

  // 5. Create backup
  await db.insert(nodeBackups).values({
    node_id: nodeId,
    planet_id: existingNode.planet_id,
    session_id: session.id,
    original_data: JSON.stringify(existingNode),
    created_at: new Date(),
  });

  // 6. Handle slug change (cascades to children)
  if (slug && slug !== existingNode.slug) {
    const oldNamespace = existingNode.namespace
      ? `${existingNode.namespace}/${existingNode.slug}`
      : existingNode.slug;
    const newNamespace = existingNode.namespace
      ? `${existingNode.namespace}/${slug}`
      : slug;

    // Update all children's namespaces
    await db.update(nodes)
      .set({
        namespace: sql`replace(${nodes.namespace}, ${oldNamespace}, ${newNamespace})`,
      })
      .where(
        and(
          eq(nodes.planet_id, existingNode.planet_id),
          like(nodes.namespace, `${oldNamespace}%`)
        )
      );
  }

  // 7. Update node
  const [updatedNode] = await db
    .update(nodes)
    .set({
      slug: slug || existingNode.slug,
      title: title || existingNode.title,
      content: content !== undefined ? content : existingNode.content,
      metadata: metadata
        ? { ...existingNode.metadata, ...metadata }
        : existingNode.metadata,
      updated_at: new Date(),
    })
    .where(eq(nodes.id, nodeId))
    .returning();

  // 8. Invalidate cache
  revalidateTag(`planet-${existingNode.planet_id}`);

  return Response.json(updatedNode);
}
```

### Cascade Update Pattern

When updating a folder's slug, all descendant nodes' namespaces must update:

```typescript
// Old namespace: courses/cs101
// New namespace: courses/cs102

// Before:
// - courses/cs101/week1 → namespace: "courses/cs101"
// - courses/cs101/week1/lecture1 → namespace: "courses/cs101/week1"

// After slug change from cs101 → cs102:
UPDATE nodes
SET namespace = replace(namespace, 'courses/cs101', 'courses/cs102')
WHERE planet_id = ? AND namespace LIKE 'courses/cs101%';

// After:
// - courses/cs102/week1 → namespace: "courses/cs102"
// - courses/cs102/week1/lecture1 → namespace: "courses/cs102/week1"
```

---

## DELETE Operations

### Modern Conventions

1. **Backup-Before-Delete** - Create backup before deletion
2. **Cascade Deletes** - Database handles child deletion via constraints
3. **Soft Delete Option** - Use `deleted_at` field for soft deletes (future)
4. **Ownership Validation** - Verify user owns the resource
5. **Session Required** - All deletes require active editing session

### Example: Deleting a Node

**API Endpoint:** `DELETE /api/nodes/[id]`

```typescript
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  // 1. Authentication
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get node
  const nodeId = parseInt(params.id);
  const node = await db.query.nodes.findFirst({
    where: eq(nodes.id, nodeId),
  });

  if (!node) {
    return Response.json({ error: "Node not found" }, { status: 404 });
  }

  // 3. Validate editing session
  const session = await getActiveEditingSession(user.id, node.planet_id);
  if (!session) {
    return Response.json({ error: "No active editing session" }, { status: 403 });
  }

  // 4. Create backup (for undo)
  await db.insert(nodeBackups).values({
    node_id: nodeId,
    planet_id: node.planet_id,
    session_id: session.id,
    original_data: JSON.stringify(node),
    operation_type: "delete",
    created_at: new Date(),
  });

  // 5. Delete node (cascades to children via DB constraints)
  await db.delete(nodes).where(eq(nodes.id, nodeId));

  // 6. Invalidate cache
  revalidateTag(`planet-${node.planet_id}`);

  return Response.json({ success: true });
}
```

### Soft Delete Pattern (Alternative)

For important data that shouldn't be permanently deleted:

```typescript
// Add to schema
export const nodes = pgTable("nodes", {
  // ... other fields
  deleted_at: timestamp("deleted_at"),
});

// Soft delete
await db.update(nodes)
  .set({ deleted_at: new Date() })
  .where(eq(nodes.id, nodeId));

// Filter out soft-deleted in queries
export async function getActiveNodes(planetId: string) {
  return await db.query.nodes.findMany({
    where: and(
      eq(nodes.planet_id, planetId),
      isNull(nodes.deleted_at) // Only active nodes
    ),
  });
}
```

---

## Error Handling

### Standard Error Responses

```typescript
// 400 - Bad Request
return Response.json(
  { error: "Invalid slug format" },
  { status: 400 }
);

// 401 - Unauthorized
return Response.json(
  { error: "Authentication required" },
  { status: 401 }
);

// 403 - Forbidden
return Response.json(
  { error: "No active editing session" },
  { status: 403 }
);

// 404 - Not Found
return Response.json(
  { error: "Node not found" },
  { status: 404 }
);

// 409 - Conflict
return Response.json(
  { error: "Node with this slug already exists" },
  { status: 409 }
);

// 500 - Server Error
return Response.json(
  { error: "Internal server error", details: error.message },
  { status: 500 }
);
```

### Try-Catch Pattern

```typescript
export async function POST(req: Request) {
  try {
    // ... operation
    return Response.json(result);
  } catch (error) {
    console.error("Error creating node:", error);
    return Response.json(
      {
        error: "Failed to create node",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
```

---

## Performance & Caching

### Cache Levels

1. **Function Cache** - `"use cache"` directive (Next.js 16)
2. **React Server Component Cache** - Automatic per-request deduplication
3. **Partial Pre-rendering (PPR)** - Static shell + dynamic content
4. **CDN Cache** - Vercel Edge Network

### Performance Targets

- **Time to First Byte (TTFB):** < 100ms
- **First Contentful Paint (FCP):** < 500ms
- **Largest Contentful Paint (LCP):** < 1.5s
- **API Response Time:** < 200ms

### Optimization Patterns

```typescript
// ✅ Parallel queries
const [planet, nodes, siblings] = await Promise.all([
  getPlanet(planetId),
  getNodes(planetId),
  getSiblings(nodeId),
]);

// ❌ Sequential queries (slow)
const planet = await getPlanet(planetId);
const nodes = await getNodes(planetId);
const siblings = await getSiblings(nodeId);
```

### Index Strategy

**Required Indexes:**
```sql
-- Composite index for O(1) path lookups
CREATE INDEX idx_nodes_planet_namespace_slug
ON nodes(planet_id, namespace, slug);

-- Full-text search
CREATE INDEX idx_nodes_title_gin ON nodes USING GIN(to_tsvector('english', title));
CREATE INDEX idx_nodes_content_gin ON nodes USING GIN(to_tsvector('english', content));

-- Common filters
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_updated_at ON nodes(updated_at DESC);
```

---

## Security & Authorization

### Authentication Flow

1. User signs in → creates session cookie
2. Every request checks `getUser()` from session
3. Mutations require active editing session
4. Editing sessions expire after 30 minutes of inactivity

### Authorization Layers

```typescript
// Layer 1: User authentication
const user = await getUser();
if (!user) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

// Layer 2: Resource ownership
const planet = await getPlanetById(planetId);
if (planet.user_id !== user.id) {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

// Layer 3: Editing session
const session = await getActiveEditingSession(user.id, planetId);
if (!session) {
  return Response.json({ error: "No active editing session" }, { status: 403 });
}
```

### Input Sanitization

```typescript
import { sanitizeHtml } from "@/lib/sanitize";

// Sanitize user input before storage
const sanitizedContent = sanitizeHtml(content);

// Validate slugs
function validateSlug(slug: string): boolean {
  if (slug.length > 100) return false;
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  if (slug.startsWith('-') || slug.endsWith('-')) return false;
  return true;
}
```

### Rate Limiting (Future)

```typescript
// To be implemented
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  const { success } = await rateLimit.check(ip, {
    limit: 100,
    window: "1m",
  });

  if (!success) {
    return Response.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // ... continue with operation
}
```

---

## Quick Reference

### CRUD Checklist

**CREATE:**
- [ ] Validate authentication
- [ ] Check editing session
- [ ] Validate input (slug format, required fields)
- [ ] Extract frontmatter (for markdown)
- [ ] Calculate depth from namespace
- [ ] Use upsert pattern
- [ ] Create backup
- [ ] Invalidate cache
- [ ] Return created resource

**READ:**
- [ ] Define query in `queries.ts`
- [ ] Use composite indexes
- [ ] Wrap with `unstable_cache`
- [ ] Set appropriate revalidation time
- [ ] Add cache tags for invalidation
- [ ] Handle not found cases
- [ ] Return typed data

**UPDATE:**
- [ ] Validate authentication
- [ ] Check editing session
- [ ] Verify resource exists
- [ ] Create backup before update
- [ ] Handle slug changes (cascade)
- [ ] Merge metadata (don't overwrite)
- [ ] Update `updated_at` timestamp
- [ ] Invalidate cache
- [ ] Return updated resource

**DELETE:**
- [ ] Validate authentication
- [ ] Check editing session
- [ ] Verify resource exists
- [ ] Create backup
- [ ] Delete resource (cascades handled by DB)
- [ ] Invalidate cache
- [ ] Return success confirmation

---

## Migration Guide

### From Old Pattern to New Pattern

**Old (E-commerce):**
```typescript
// Separate tables for each level
products, collections, categories, subcategories

// Recursive parent_id queries
WITH RECURSIVE tree AS (
  SELECT * FROM products WHERE parent_id = ?
  UNION ALL
  SELECT p.* FROM products p JOIN tree t ON p.parent_id = t.id
)
```

**New (Unified Nodes):**
```typescript
// Single nodes table
nodes { namespace, slug, depth, type }

// O(1) path lookup
SELECT * FROM nodes
WHERE planet_id = ?
  AND namespace = 'courses/cs101/week1'
  AND slug = 'lecture1';
```

### Benefits

1. **Performance:** O(1) lookups vs recursive queries
2. **Flexibility:** Support any depth without schema changes
3. **Simplicity:** One table vs multiple tables
4. **Scalability:** Namespace indexing scales linearly

---

## Additional Resources

- [Database Schema Documentation](./DATABASE_REVAMP_COMPLETE.md)
- [Performance Optimization Guide](./PERFORMANCE_REVAMP.md)
- [User Profile & Editing Mode](./USER_PROFILE_AND_EDITING.md)
- [API Reference](./API_REFERENCE.md) _(coming soon)_

---

**Last Updated:** 2025-11-16
**Version:** 2.0.0 (Next.js 16, Post-MVP)
