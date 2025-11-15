# Rust Export Integration Design
## Pre-rendered HTML for Logseq Content

> **Core Principle**: Replace dynamic markdown parsing with pre-rendered HTML from the Rust export tool, keeping all infrastructure intact.

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Current vs New Architecture](#current-vs-new-architecture)
- [Rust Tool Deep Dive](#rust-tool-deep-dive)
- [Integration Design](#integration-design)
- [Database Changes](#database-changes)
- [Service Changes](#service-changes)
- [Component Changes](#component-changes)
- [Workflow Changes](#workflow-changes)
- [Migration Plan](#migration-plan)
- [Performance Impact](#performance-impact)

---

## Executive Summary

### The Problem

**Current State:**
- Dropz parses Logseq markdown on every request
- Custom Logseq syntax parser is incomplete
- Block references `((uuid))` don't work correctly
- Page rendering is slow (150ms+ parsing time)
- Maintenance burden of keeping parser up-to-date

**What We're Solving:**
- ✅ Complete Logseq syntax support (the Rust tool is battle-tested)
- ✅ Faster rendering (serve pre-rendered HTML, ~5ms vs 150ms)
- ✅ Better SEO (static HTML, fully rendered)
- ✅ Reduce maintenance (no custom parser to maintain)

### The Solution

**Integrate `export-logseq-notes` Rust tool:**

```
Logseq Graph Upload → Rust Tool Export → Pre-rendered HTML → Store in DB → Serve
```

**What Changes:**
- ❌ Dynamic markdown parsing (removed)
- ✅ Pre-rendered HTML serving (added)
- ✅ All infrastructure stays the same (routing, auth, caching, etc.)

**What Stays:**
- ✅ Database schema (nodes table)
- ✅ Namespace-based routing
- ✅ Sidebar, breadcrumbs, navigation
- ✅ Authentication, planets, users
- ✅ Performance optimizations (PPR, caching)

---

## Current vs New Architecture

### Current Flow

```
User uploads Logseq graph (.zip)
  ↓
Extract files
  ↓
Parse markdown files (custom parser)
  ↓
Store content in nodes.content (raw markdown)
  ↓
nodes.parsed_html = null (unused)
  ↓
ON REQUEST:
  ↓
Load nodes.content
  ↓
Parse markdown → HTML (150ms)
  ↓
Render to user
```

**Problems:**
- ⚠️ Parsing happens on every request (slow)
- ⚠️ Custom parser incomplete (missing features)
- ⚠️ No block reference resolution
- ⚠️ Cache misses are expensive

### New Flow

```
User uploads Logseq graph (.zip)
  ↓
Extract files to temp directory
  ↓
Run Rust export tool on directory
  ↓
Rust tool generates HTML files
  ↓
Store content in nodes.content (raw markdown, backup)
  ↓
Store HTML in nodes.parsed_html (pre-rendered)
  ↓
ON REQUEST:
  ↓
Load nodes.parsed_html
  ↓
Serve HTML directly (5ms)
  ↓
Render to user
```

**Benefits:**
- ✅ Parsing happens once (at upload time)
- ✅ Requests are fast (just DB fetch + serve)
- ✅ Complete Logseq support (Rust tool handles everything)
- ✅ Block refs, embeds all work perfectly

---

## Rust Tool Deep Dive

### What is `export-logseq-notes`?

A Rust CLI tool that converts Logseq graphs to static HTML pages.

**GitHub:** https://github.com/dimfeld/export-logseq-notes

**Key Features:**
- ✅ Parses Logseq markdown files
- ✅ Resolves block references `((block-uuid))`
- ✅ Resolves page references `[[Page Name]]`
- ✅ Expands block embeds `{{embed ((uuid))}}`
- ✅ Expands page embeds `{{embed [[Page]]}}`
- ✅ Syntax highlighting (code blocks)
- ✅ KaTeX support (math equations)
- ✅ Customizable templates (Handlebars)
- ✅ Tag filtering (export only tagged pages)
- ✅ Namespace support (hierarchical pages)

### How It Works

**Input:**
```
/path/to/logseq-graph/
  ├── pages/
  │   ├── intro.md
  │   ├── guides___setup.md
  │   └── references___api.md
  └── journals/
      └── 2025_11_15.md
```

**Configuration (TOML):**
```toml
# export-config.toml
data = "/path/to/logseq-graph"
product = "logseq"
output = "/path/to/output"
template = "full_html"
extension = "html"

# Filter by tags
include_tags = ["public", "published"]
exclude_tags = ["private", "draft"]

# Link handling
base_url = "https://dropz.app/planet"
filter_link_only_blocks = true

# Namespace handling
namespace_dirs = true  # guides/setup.html vs guides___setup.html
```

**Execution:**
```bash
export-logseq-notes \
  --config export-config.toml
```

**Output:**
```
/path/to/output/
  ├── intro.html
  ├── guides/
  │   └── setup.html
  └── references/
      └── api.html
```

**Generated HTML Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Page Title</title>
</head>
<body>
  <article>
    <header>
      <h1>Page Title</h1>
      <div class="dates">
        <time>Created: 2025-11-15</time>
        <time>Updated: 2025-11-15</time>
      </div>
    </header>

    <div class="content">
      <!-- Fully rendered Logseq content -->
      <p>This is content with <a href="/planet/other-page">[[links]]</a></p>

      <!-- Block references expanded -->
      <blockquote class="block-ref">
        <p>Referenced block content appears here</p>
      </blockquote>

      <!-- Syntax highlighted code -->
      <pre><code class="language-typescript hljs">
        <span class="hljs-keyword">const</span> x = <span class="hljs-number">42</span>;
      </code></pre>

      <!-- Math equations -->
      <span class="katex">...</span>
    </div>
  </article>
</body>
</html>
```

### Template System

**Available Templates:**

1. **`full_html.tmpl`** - Complete HTML document
   ```handlebars
   <!DOCTYPE html>
   <html>
   <head>
     <title>{{title}}</title>
   </head>
   <body>
     <article>
       <header>
         <h1>{{title}}</h1>
         {{#if created_time}}
         <div class="dates">
           <time>Created: {{date_format created_time "%Y-%m-%d"}}</time>
           <time>Updated: {{date_format edited_time "%Y-%m-%d"}}</time>
         </div>
         {{/if}}
       </header>
       {{{body}}}
     </article>
   </body>
   </html>
   ```

2. **`front_matter.tmpl`** - Markdown with YAML frontmatter
   ```handlebars
   ---
   title: {{replace title "/" "-"}}
   tags: {{tags}}
   {{#if created_time}}
   created: {{date_format created_time "%Y-%m-%d"}}
   edited: {{date_format edited_time "%Y-%m-%d"}}
   {{/if}}
   ---

   {{{body}}}
   ```

**For Dropz:** We'll create a **custom template** that outputs just the content (no `<html>` wrapper) so we can embed it in our layout.

**Custom Dropz Template (`templates/dropz.tmpl`):**
```handlebars
<article class="logseq-content" data-page="{{title}}">
  {{#if created_time}}
  <div class="hidden metadata">
    <meta name="created" content="{{date_format created_time "%Y-%m-%d"}}">
    <meta name="updated" content="{{date_format edited_time "%Y-%m-%d"}}">
    <meta name="tags" content="{{tags}}">
  </div>
  {{/if}}

  {{{body}}}
</article>
```

This gives us just the content HTML without the document wrapper.

### Variable Reference

**Available in templates:**
- `{{title}}` - Page name (e.g., "Getting Started")
- `{{body}}` - Rendered HTML content (use `{{{body}}}` for unescaped)
- `{{tags}}` - Comma-separated list of tags
- `{{created_time}}` - ISO timestamp (if available)
- `{{edited_time}}` - ISO timestamp (if available)
- `{{date_format time "%Y-%m-%d"}}` - Format helper

### Processing Details

**Block Reference Resolution:**
```markdown
Input:  See ((6549a2f1-8b3c-4d5e-9a1f-2c3d4e5f6a7b))
Output: <blockquote class="block-ref" data-block-id="6549a2f1-8b3c-4d5e-9a1f-2c3d4e5f6a7b">
          <p>The referenced block content</p>
        </blockquote>
```

**Page Reference Resolution:**
```markdown
Input:  Check out [[Getting Started]]
Output: <a href="/getting-started">Getting Started</a>
```

**Block Embeds:**
```markdown
Input:  {{embed ((uuid))}}
Output: <div class="embed-block">
          <p>Full block content embedded here</p>
        </div>
```

**Namespace Handling:**
```
Input:  pages/guides___setup___intro.md
Output: guides/setup/intro.html  (if namespace_dirs = true)
Output: guides___setup___intro.html  (if namespace_dirs = false)
```

For Dropz, we want `namespace_dirs = true` to match our URL structure.

---

## Integration Design

### High-Level Approach

**Three-Layer Architecture (unchanged):**

```
┌─────────────────────────────────────┐
│  Layer 1: Auth & User Management    │  ← NO CHANGE
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│  Layer 2: Navigation & Structure    │  ← NO CHANGE
│  (sidebar, breadcrumbs, routing)    │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│  Layer 3: Content Display           │  ← ONLY THIS CHANGES
│  OLD: LogseqMarkdownPreview         │
│  NEW: StaticContentRenderer         │
└─────────────────────────────────────┘
```

### Installation & Setup

**1. Install Rust Tool**

```bash
# On server (or Docker container)
cargo install export-logseq-notes

# Verify installation
export-logseq-notes --version
```

**2. Create Dropz Template**

```bash
mkdir -p templates/
cat > templates/dropz.tmpl << 'EOF'
<article class="logseq-content prose dark:prose-invert max-w-none" data-page="{{title}}">
  {{#if created_time}}
  <div class="hidden metadata"
       data-created="{{date_format created_time "%Y-%m-%d"}}"
       data-updated="{{date_format edited_time "%Y-%m-%d"}}"
       data-tags="{{tags}}">
  </div>
  {{/if}}

  {{{body}}}
</article>
EOF
```

**3. Create Config Template**

```bash
cat > export-config.template.toml << 'EOF'
# This will be populated at runtime
data = "{{INPUT_DIR}}"
product = "logseq"
output = "{{OUTPUT_DIR}}"
template = "dropz"
extension = "html"

# Namespace handling
namespace_dirs = true

# Link handling
filter_link_only_blocks = true

# No base_url - we'll rewrite links in post-processing

# CSS classes (match Tailwind/Dropz styles)
class_bold = "font-bold"
class_italic = "italic"
class_strikethrough = "line-through"
class_highlight = "bg-yellow-200 dark:bg-yellow-800"
class_page_link = "text-blue-600 hover:underline"
class_tag = "text-sm text-gray-600 dark:text-gray-400"

# Syntax highlighting
highlight_class_prefix = "hljs-"
EOF
```

---

## Database Changes

### Schema Updates

**No schema changes needed!** The `nodes` table already has everything we need:

```typescript
export const nodes = pgTable("nodes", {
  // ... existing fields

  content: text("content"),        // ← Keep original markdown (backup)
  parsed_html: text("parsed_html"), // ← Store Rust tool output HERE

  // Optional: Add metadata from export
  metadata: jsonb("metadata").$type<{
    // ... existing metadata fields

    // NEW: Extracted during export
    page_refs?: string[];      // [[Page]] references found
    block_refs?: string[];     // ((uuid)) references found
    tags?: string[];           // #tags found
    export_date?: string;      // When this was exported
    rust_tool_version?: string; // Version of export tool used
  }>(),

  // ... rest of fields
});
```

**Why no changes?**
- `content` already stores raw markdown (we keep this as backup)
- `parsed_html` already exists (we'll use it for Rust output)
- `metadata` already stores JSON (we can add export metadata)

---

## Service Changes

### New Service: Rust Export Service

```typescript
// src/services/rust-export/index.ts

export const RustExportService = {
  exportGraph,
  exportSinglePage,
  validateInstallation,
} as const;

/**
 * Export entire Logseq graph to HTML using Rust tool
 */
async function exportGraph(
  graphPath: string,
  options?: ExportOptions
): Promise<ExportResult> {
  // 1. Validate Rust tool is installed
  await validateInstallation();

  // 2. Create temp output directory
  const outputDir = await createTempDir();

  // 3. Generate config file
  const configPath = await createConfig(graphPath, outputDir, options);

  // 4. Run export
  const startTime = Date.now();
  const { stdout, stderr } = await execAsync(
    `export-logseq-notes --config ${configPath}`
  );

  console.log('[Rust Export] Completed in', Date.now() - startTime, 'ms');

  // 5. Read exported files
  const htmlFiles = await readExportedFiles(outputDir);

  // 6. Parse and structure results
  const results: ExportedPage[] = [];

  for (const file of htmlFiles) {
    const pageName = file.path.replace('.html', '').replace(/\//g, '/');
    const html = await fs.readFile(file.fullPath, 'utf-8');

    // Extract metadata from HTML
    const metadata = extractMetadata(html);

    // Post-process HTML (fix links, etc.)
    const processedHtml = await postProcessHtml(html, options);

    results.push({
      pageName,
      namespace: getNamespace(pageName),
      slug: getSlug(pageName),
      html: processedHtml,
      originalMarkdown: file.originalMarkdown,
      metadata,
    });
  }

  // 7. Cleanup
  await cleanup(outputDir, configPath);

  return {
    pages: results,
    stats: {
      total: results.length,
      duration: Date.now() - startTime,
    },
  };
}

/**
 * Create export config file
 */
async function createConfig(
  inputDir: string,
  outputDir: string,
  options?: ExportOptions
): Promise<string> {
  const configPath = path.join(os.tmpdir(), `export-${Date.now()}.toml`);

  const config = `
data = "${inputDir}"
product = "logseq"
output = "${outputDir}"
template = "${options?.template || 'dropz'}"
extension = "html"
namespace_dirs = true
filter_link_only_blocks = true

${options?.includeTags ? `include_tags = ${JSON.stringify(options.includeTags)}` : ''}
${options?.excludeTags ? `exclude_tags = ${JSON.stringify(options.excludeTags)}` : ''}

# Tailwind CSS classes
class_bold = "font-bold"
class_italic = "italic"
class_strikethrough = "line-through"
class_highlight = "bg-yellow-200 dark:bg-yellow-800"
class_page_link = "text-blue-600 hover:underline dark:text-blue-400"
class_tag = "inline-block px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800"
`;

  await fs.writeFile(configPath, config);
  return configPath;
}

/**
 * Post-process HTML to fix links and add Dropz-specific features
 */
async function postProcessHtml(
  html: string,
  options?: ExportOptions
): Promise<string> {
  let processed = html;

  // 1. Rewrite page links to include planet slug
  if (options?.planetSlug) {
    // [[Page]] becomes <a href="/page">Page</a>
    // We need: <a href="/planet/pages/page">Page</a>
    processed = processed.replace(
      /href="\/([^"]+)"/g,
      `href="/${options.planetSlug}/pages/$1"`
    );
  }

  // 2. Add target="_blank" to external links
  processed = processed.replace(
    /href="(https?:\/\/[^"]+)"/g,
    'href="$1" target="_blank" rel="noopener noreferrer"'
  );

  // 3. Add data attributes for interactivity
  processed = processed.replace(
    /<a href="\/([^"]+)"([^>]*)>/g,
    '<a href="/$1" data-prefetch$2>'
  );

  return processed;
}

/**
 * Extract metadata from exported HTML
 */
function extractMetadata(html: string): PageMetadata {
  const metadata: PageMetadata = {};

  // Extract from hidden metadata div
  const metaMatch = html.match(
    /<div class="hidden metadata"[^>]*data-created="([^"]*)"[^>]*data-updated="([^"]*)"[^>]*data-tags="([^"]*)"[^>]*>/
  );

  if (metaMatch) {
    metadata.created = metaMatch[1];
    metadata.updated = metaMatch[2];
    metadata.tags = metaMatch[3]?.split(',').map(t => t.trim()).filter(Boolean);
  }

  // Extract page references
  const pageRefs = new Set<string>();
  const linkRegex = /href="\/([^"]+)"/g;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    if (!match[1].startsWith('http')) {
      pageRefs.add(match[1]);
    }
  }
  metadata.page_refs = Array.from(pageRefs);

  // Extract block references
  const blockRefs = new Set<string>();
  const blockRefRegex = /data-block-id="([^"]+)"/g;
  while ((match = blockRefRegex.exec(html)) !== null) {
    blockRefs.add(match[1]);
  }
  metadata.block_refs = Array.from(blockRefs);

  return metadata;
}
```

### Updated Ingestion Service

```typescript
// src/services/ingestion/logseq-importer.ts

import { RustExportService } from '@/services/rust-export';

/**
 * Import Logseq graph using Rust export tool
 */
export async function importLogseqGraph(
  planetId: number,
  graphFiles: File[]
): Promise<IngestionResult> {
  const startTime = Date.now();

  try {
    // 1. Extract uploaded files to temp directory
    const tempDir = await extractFiles(graphFiles);

    // 2. Validate Logseq structure
    validateLogseqStructure(tempDir);

    // 3. Run Rust export
    console.log('[Import] Running Rust export...');
    const exportResult = await RustExportService.exportGraph(tempDir, {
      planetSlug: await getPlanetSlug(planetId),
      template: 'dropz',
    });

    console.log(`[Import] Exported ${exportResult.pages.length} pages`);

    // 4. Import to database
    const imported = {
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const page of exportResult.pages) {
      // Check if page exists
      const existing = await db.query.nodes.findFirst({
        where: and(
          eq(nodes.planet_id, planetId),
          eq(nodes.page_name, page.pageName)
        ),
      });

      const nodeData = {
        planet_id: planetId,
        page_name: page.pageName,
        namespace: page.namespace,
        slug: page.slug,
        title: page.pageName.split('/').pop() || page.pageName,
        type: 'file',
        depth: page.namespace.split('/').filter(Boolean).length,

        // Store both original and rendered
        content: page.originalMarkdown,  // Backup
        parsed_html: page.html,          // Pre-rendered ← KEY CHANGE

        // Metadata from export
        metadata: {
          ...page.metadata,
          export_date: new Date().toISOString(),
          rust_tool_version: await getRustToolVersion(),
        },

        source_folder: page.pageName.startsWith('journals/') ? 'journals' : 'pages',
        is_journal: page.pageName.startsWith('journals/'),

        updated_at: new Date(),
      };

      if (existing) {
        // Update existing
        await db.update(nodes)
          .set(nodeData)
          .where(eq(nodes.id, existing.id));
        imported.updated++;
      } else {
        // Create new
        await db.insert(nodes).values({
          ...nodeData,
          created_at: new Date(),
        });
        imported.created++;
      }
    }

    // 5. Create virtual folder nodes for /pages and /journals
    await createLogseqFolders(planetId);

    // 6. Invalidate cache
    revalidateTag(`planet-${planetId}`);

    // 7. Cleanup
    await cleanup(tempDir);

    return {
      success: true,
      stats: {
        ...imported,
        duration: Date.now() - startTime,
      },
    };

  } catch (error) {
    console.error('[Import] Error:', error);
    throw error;
  }
}
```

---

## Component Changes

### New Component: StaticContentRenderer

```tsx
// src/components/static-content-renderer.tsx

interface StaticContentRendererProps {
  html: string;
  className?: string;
  planetSlug?: string;
}

/**
 * Renders pre-compiled HTML from Rust export tool
 * Replaces LogseqMarkdownPreview component
 */
export function StaticContentRenderer({
  html,
  className,
  planetSlug,
}: StaticContentRendererProps) {
  // Optional: Add client-side enhancements
  // (e.g., link prefetching, interactive elements)

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// Optional: Add interactivity with client component
'use client';

export function InteractiveContentRenderer({ html }: { html: string }) {
  useEffect(() => {
    // Add event listeners for Logseq-specific features
    // e.g., collapsible blocks, tooltips, etc.

    // Example: Add link prefetching
    const links = document.querySelectorAll('a[data-prefetch]');
    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        const href = link.getAttribute('href');
        if (href) prefetchPage(href);
      });
    });
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### Updated Page Component

```tsx
// src/app/[planet]/[[...path]]/page.tsx

export default async function Page({ params }) {
  const { planet, path = [] } = params;

  // All this stays the same
  const user = await getUser();
  const planetData = await getPlanetBySlug(planet);
  const node = await getNodeByPath(planet, path);
  const sidebar = await buildSidebar(planetData.id);
  const breadcrumbs = getNodeBreadcrumbs(node);

  if (!node) notFound();

  // Check if this is a Logseq page
  const isLogseqPage = Boolean(node.parsed_html);

  return (
    <>
      {isOwnWorkspace && <EditingToolbar ... />}

      <main className="flex">
        <Sidebar items={sidebar} />

        <div className="flex-1">
          <Breadcrumbs items={breadcrumbs} />

          {/* ONLY THIS CHANGES: */}
          {isLogseqPage ? (
            // NEW: Serve pre-rendered HTML
            <StaticContentRenderer
              html={node.parsed_html!}
              planetSlug={planet}
              className="prose dark:prose-invert max-w-none"
            />
          ) : (
            // FALLBACK: Legacy markdown rendering
            <LogseqMarkdownPreview
              content={node.content}
              planetId={planetData.id}
              planetSlug={planet}
              pageName={node.page_name!}
            />
          )}

          {/* These still work - they query node.metadata */}
          <CitedPagesCards
            planetId={planetData.id}
            pageRefs={node.metadata?.page_refs || []}
          />
        </div>
      </main>
    </>
  );
}
```

---

## Workflow Changes

### Upload Workflow

**Before:**
```
1. User uploads .zip
2. Extract files
3. Parse markdown with custom parser
4. Store in nodes.content
5. Done (parsing happens on each request)
```

**After:**
```
1. User uploads .zip
2. Extract files to temp directory
3. Run Rust export tool
4. Parse exported HTML
5. Store original markdown in nodes.content
6. Store HTML in nodes.parsed_html
7. Extract metadata (page_refs, tags, etc.)
8. Done (HTML served directly on requests)
```

### Request Workflow

**Before:**
```
Request /planet/pages/intro
  ↓
Fetch node (20ms)
  ↓
Parse markdown → HTML (150ms)
  ↓
Render (10ms)
  ↓
Total: ~180ms
```

**After:**
```
Request /planet/pages/intro
  ↓
Fetch node (20ms)
  ↓
Serve parsed_html (5ms)
  ↓
Render (10ms)
  ↓
Total: ~35ms
```

**5x faster!**

### Update Workflow

**If user updates their graph:**

**Option A: Manual re-upload**
```
1. User uploads new .zip
2. Re-run export process
3. Update database
4. Invalidate cache
```

**Option B: Git integration (future)**
```
1. User pushes to git
2. Webhook triggers
3. Auto re-export
4. Auto update database
```

---

## Migration Plan

### Phase 1: Setup (Week 1)

**Goals:**
- Install Rust tool
- Create custom template
- Test export locally

**Tasks:**
1. Install `export-logseq-notes` on server
   ```bash
   cargo install export-logseq-notes
   ```

2. Create Dropz template
   ```bash
   mkdir -p templates/
   # Create dropz.tmpl
   ```

3. Test with sample graph
   ```bash
   export-logseq-notes --config test-config.toml
   ```

4. Verify HTML output quality

### Phase 2: Service Implementation (Week 2)

**Goals:**
- Build RustExportService
- Update ingestion pipeline
- Test end-to-end

**Tasks:**
1. Create `src/services/rust-export/`
   - Implement `exportGraph()`
   - Implement `postProcessHtml()`
   - Implement `extractMetadata()`

2. Update `src/services/ingestion/logseq-importer.ts`
   - Replace custom parser with Rust export
   - Update database inserts

3. Add API endpoint
   ```typescript
   // src/app/api/ingest-logseq/route.ts
   export async function POST(req: Request) {
     const files = await req.formData();
     const result = await importLogseqGraph(planetId, files);
     return Response.json(result);
   }
   ```

4. Test with real Logseq graph

### Phase 3: Component Updates (Week 3)

**Goals:**
- Create StaticContentRenderer
- Update page component
- Test rendering

**Tasks:**
1. Create `src/components/static-content-renderer.tsx`

2. Update `src/app/[planet]/[[...path]]/page.tsx`
   - Check for `node.parsed_html`
   - Use StaticContentRenderer if exists
   - Fallback to old renderer

3. Test all pages render correctly

4. Verify links work
   - Internal links
   - External links
   - Block references
   - Page embeds

### Phase 4: Migration (Week 4)

**Goals:**
- Migrate existing Logseq pages
- Remove old parser
- Cleanup

**Tasks:**
1. Create migration script
   ```typescript
   // scripts/migrate-to-rust-export.ts
   async function migrateAllPages() {
     const planets = await getAllPlanets();

     for (const planet of planets) {
       console.log(`Migrating planet: ${planet.slug}`);

       // Export all nodes back to temp Logseq structure
       const tempGraph = await exportToLogseqStructure(planet.id);

       // Re-run Rust export
       const result = await RustExportService.exportGraph(tempGraph);

       // Update database
       await updateNodes(planet.id, result.pages);

       console.log(`✓ Migrated ${result.pages.length} pages`);
     }
   }
   ```

2. Run migration on staging

3. Verify everything works

4. Run migration on production

5. Remove old code:
   - Delete `src/lib/logseq/render.ts` (old parser)
   - Delete `src/components/logseq-markdown-preview.tsx`
   - Delete `src/lib/remark-logseq.ts`

### Phase 5: Polish (Week 5)

**Goals:**
- Performance testing
- SEO verification
- Documentation

**Tasks:**
1. Performance benchmarks
   - Measure page load times
   - Compare before/after
   - Verify < 100ms TTFB

2. SEO checks
   - Verify HTML is fully rendered
   - Check internal links
   - Test with Google Search Console

3. Documentation
   - Update README
   - Document new upload flow
   - API documentation

---

## Performance Impact

### Rendering Performance

**Before (Dynamic Parsing):**
```
TTFB Breakdown:
- Auth check: 10ms
- DB query: 20ms
- Markdown parsing: 150ms
- Template rendering: 10ms
- Response: 10ms
Total: 200ms
```

**After (Pre-rendered HTML):**
```
TTFB Breakdown:
- Auth check: 10ms
- DB query: 20ms
- Serve HTML: 5ms
- Template rendering: 10ms
- Response: 10ms
Total: 55ms
```

**Improvement: 3.6x faster (200ms → 55ms)**

### Cache Hit Performance

**Before:**
```
Cache hit: 50ms (still needs markdown parsing)
```

**After:**
```
Cache hit: 20ms (just serve HTML)
```

**Improvement: 2.5x faster**

### Upload Performance

**Before:**
```
Upload time: ~2 seconds for 100 pages
(Fast because no processing)
```

**After:**
```
Upload time: ~10 seconds for 100 pages
(Slower because Rust export runs)
```

**Trade-off:** Upload is slower, but requests are MUCH faster.

**This is the right trade-off because:**
- Uploads happen once
- Requests happen thousands of times
- Pre-rendering is essentially caching at upload time

### Storage Impact

**Before:**
```
nodes.content: ~2KB per page (markdown)
nodes.parsed_html: null
Total: ~2KB per page
```

**After:**
```
nodes.content: ~2KB per page (markdown, backup)
nodes.parsed_html: ~5KB per page (HTML)
Total: ~7KB per page
```

**3.5x more storage**, but:
- Storage is cheap
- Enables 3.6x faster requests
- Worth the trade-off

**For 10,000 pages:**
- Before: 20 MB
- After: 70 MB
- Additional: 50 MB (~$0.01/month on most hosts)

---

## Edge Cases & Solutions

### 1. Very Large Graphs

**Problem:** Exporting 10,000+ pages might timeout

**Solution:**
- Process in batches (1000 pages at a time)
- Show progress indicator
- Use background job queue

```typescript
async function exportLargeGraph(graphPath: string, planetId: number) {
  const totalPages = await countPages(graphPath);
  const batchSize = 1000;

  for (let i = 0; i < totalPages; i += batchSize) {
    console.log(`Processing batch ${i / batchSize + 1}...`);

    await RustExportService.exportGraph(graphPath, {
      skip: i,
      limit: batchSize,
    });
  }
}
```

### 2. Broken Links

**Problem:** Rust tool might generate broken links if pages are missing

**Solution:**
- Post-process to detect broken links
- Generate warnings
- Optionally remove or mark broken links

```typescript
async function validateLinks(html: string, allPages: Set<string>) {
  const links = extractLinks(html);
  const broken: string[] = [];

  for (const link of links) {
    if (!allPages.has(link)) {
      broken.push(link);
    }
  }

  if (broken.length > 0) {
    console.warn(`Found ${broken.length} broken links:`, broken);
  }

  return broken;
}
```

### 3. Custom Logseq Features

**Problem:** Some Logseq features might not export correctly

**Solution:**
- Identify missing features
- Add to Rust tool (contribute upstream)
- Or post-process HTML to add features

**Examples:**
- Queries: `{{query (and [[tag]] [[other-tag]])}}`
- TODO markers: `TODO`, `DOING`, `DONE`
- Custom properties: `property:: value`

### 4. Images

**Problem:** Images in Logseq graph need to be accessible

**Solution:**
- Copy images to Dropz public directory
- Update image paths in HTML
- Or use Vercel Blob for image storage

```typescript
async function processImages(html: string, graphPath: string) {
  const imageRegex = /<img src="..\/assets\/([^"]+)"/g;

  let processed = html;
  let match;

  while ((match = imageRegex.exec(html)) !== null) {
    const imagePath = match[1];
    const sourcePath = path.join(graphPath, 'assets', imagePath);

    // Upload to Vercel Blob
    const url = await uploadToBlob(sourcePath);

    // Update HTML
    processed = processed.replace(
      `src="../assets/${imagePath}"`,
      `src="${url}"`
    );
  }

  return processed;
}
```

### 5. Syntax Highlighting Styles

**Problem:** Rust tool's syntax highlighting might not match Dropz styles

**Solution:**
- Use same highlight.js theme in both
- Or customize Rust tool CSS classes
- Or post-process to change class names

```toml
# In config.toml
highlight_class_prefix = "hljs-"
```

Then in CSS:
```css
/* Match Dropz theme */
.hljs-keyword { color: #569cd6; }
.hljs-string { color: #ce9178; }
/* etc. */
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/services/rust-export.test.ts

describe('RustExportService', () => {
  test('exports simple page', async () => {
    const result = await RustExportService.exportGraph(
      './fixtures/simple-graph'
    );

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].html).toContain('<article');
  });

  test('resolves block references', async () => {
    const result = await RustExportService.exportGraph(
      './fixtures/graph-with-block-refs'
    );

    expect(result.pages[0].html).toContain('class="block-ref"');
  });

  test('extracts metadata', async () => {
    const html = '<div class="hidden metadata" data-tags="tag1,tag2"></div>';
    const metadata = extractMetadata(html);

    expect(metadata.tags).toEqual(['tag1', 'tag2']);
  });
});
```

### Integration Tests

```typescript
// tests/integration/logseq-import.test.ts

describe('Logseq Import', () => {
  test('full import workflow', async () => {
    // 1. Create test planet
    const planet = await createTestPlanet();

    // 2. Upload graph
    const files = await readTestGraph('./fixtures/test-graph');
    const result = await importLogseqGraph(planet.id, files);

    // 3. Verify pages created
    expect(result.stats.created).toBeGreaterThan(0);

    // 4. Verify HTML is stored
    const page = await db.query.nodes.findFirst({
      where: eq(nodes.planet_id, planet.id),
    });

    expect(page?.parsed_html).toBeTruthy();
    expect(page?.parsed_html).toContain('<article');
  });
});
```

### E2E Tests

```typescript
// tests/e2e/rendering.test.ts

describe('Page Rendering', () => {
  test('renders Logseq page correctly', async () => {
    const page = await browser.goto('/test-planet/pages/intro');

    // Verify content is visible
    await expect(page.locator('article')).toBeVisible();

    // Verify links work
    await page.click('a:has-text("Next Page")');
    await expect(page).toHaveURL('/test-planet/pages/next-page');
  });

  test('block references display correctly', async () => {
    const page = await browser.goto('/test-planet/pages/with-block-refs');

    await expect(page.locator('.block-ref')).toBeVisible();
  });
});
```

---

## Rollback Plan

**If something goes wrong:**

### Immediate Rollback

1. **Revert component change:**
   ```tsx
   // In page.tsx, change back to:
   <LogseqMarkdownPreview content={node.content} ... />
   ```

2. **Deploy:**
   ```bash
   git revert <commit-sha>
   git push
   ```

3. **System recovers immediately** (old parser still works)

### Data Recovery

**Good news:** We keep `nodes.content` (original markdown) as backup!

```typescript
// If needed, clear parsed_html and revert
await db.update(nodes)
  .set({ parsed_html: null })
  .where(eq(nodes.planet_id, planetId));
```

System automatically falls back to markdown parsing.

---

## Success Metrics

### Performance Targets

- ✅ TTFB < 100ms (currently ~50ms, will stay the same)
- ✅ Page rendering < 50ms (currently ~150ms)
- ✅ Cache hit < 20ms

### Feature Completeness

- ✅ All Logseq syntax renders correctly
- ✅ Block references work
- ✅ Page references work
- ✅ Embeds work
- ✅ Syntax highlighting works
- ✅ Math equations work

### Quality Metrics

- ✅ Zero parsing errors
- ✅ All links work correctly
- ✅ No broken images
- ✅ SEO scores maintained (100/100 PageSpeed)

---

## Future Enhancements

### 1. Incremental Exports

**Current:** Re-export entire graph on every upload

**Future:** Export only changed pages
```typescript
async function incrementalExport(graphPath: string, changedFiles: string[]) {
  // Only export pages that changed
  // Much faster for large graphs
}
```

### 2. Custom Rust Tool Fork

**Possibility:** Fork the Rust tool and add Dropz-specific features
- Direct database integration (skip file intermediary)
- Dropz-specific optimizations
- Additional Logseq features

### 3. Server-Side Caching

**Enhancement:** Cache Rust exports on server
```typescript
// Cache exports to avoid re-running tool
const cacheKey = hashDirectory(graphPath);
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### 4. Live Preview

**Feature:** Show preview during upload
```typescript
// Stream export progress
socket.emit('export-progress', {
  current: 50,
  total: 100,
  currentPage: 'intro',
});
```

---

## Conclusion

### Summary

**This integration:**
- ✅ Replaces custom markdown parser with battle-tested Rust tool
- ✅ Improves performance (3.6x faster page loads)
- ✅ Adds complete Logseq feature support
- ✅ Keeps all infrastructure unchanged (routing, auth, caching)
- ✅ Minimal code changes (swap one component)
- ✅ Easy rollback (original markdown preserved)

### Why This Works

**The key insight:**
> We're not changing the architecture. We're just pre-rendering content at upload time instead of request time.

**Everything else stays the same:**
- Database schema ✅
- Routing logic ✅
- Authentication ✅
- Caching ✅
- Navigation ✅

**We're literally just swapping:**
```diff
- <LogseqMarkdownPreview content={node.content} />
+ <StaticContentRenderer html={node.parsed_html} />
```

### Next Steps

1. **Review this design** with team
2. **Test Rust tool locally** with sample graph
3. **Start Phase 1** (setup and testing)
4. **Iterate based on results**

---

**Questions?** Ready to start implementation?

---

**Last Updated:** 2025-11-15
**Version:** 1.0.0
**Author:** Claude (Anthropic AI)
