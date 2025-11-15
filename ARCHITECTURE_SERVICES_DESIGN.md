# Dropz Service Architecture Design
## Fullstack Modular Monolith

> **Design Philosophy**: Organize Dropz as a modular monolith with clear service boundaries, enabling independent development while maintaining deployment simplicity.

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Service Map](#service-map)
- [Core Services](#core-services)
- [Service Interactions](#service-interactions)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Implementation Structure](#implementation-structure)
- [Migration Strategy](#migration-strategy)

---

## Executive Summary

### Current State
Dropz is a high-performance knowledge management system with:
- Namespace-based hierarchical content (unlimited depth)
- Logseq graph integration
- Real-time editing with backup/restore
- Sub-100ms page loads via aggressive caching and PPR

### Proposed Architecture
Organize into **7 core services** within a modular monolith:

1. **Authentication Service** - User identity and session management
2. **Workspace Service** - Planet (workspace) management
3. **Content Service** - Node CRUD and hierarchy management
4. **Markdown Service** - MDX/Markdown rendering and caching
5. **Logseq Service** - Logseq-specific features (graphs, blocks, references)
6. **Editing Service** - Edit sessions, backups, and version control
7. **Ingestion Service** - Bulk content import and processing

---

## Service Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                       │
│                    (Next.js App Router + RSC)                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ HTTP/API Calls
             │
┌────────────┴────────────────────────────────────────────────────┐
│                        SERVICE LAYER                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Service │  │  Workspace   │  │   Content    │          │
│  │              │  │   Service    │  │   Service    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐          │
│  │  Markdown    │  │   Logseq     │  │   Editing    │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│  ┌──────┴──────────────────┴──────────────────┴───────┐         │
│  │              Ingestion Service                      │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ SQL Queries
             │
┌────────────┴────────────────────────────────────────────────────┐
│                         DATA LAYER                               │
│   PostgreSQL (Drizzle ORM) + Next.js Cache + Vercel Edge        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Core Services

### 1. Authentication Service

**Responsibility**: User identity, sessions, and authorization

**Domain**:
- User registration and login
- Session management (Iron Session)
- Password hashing and verification
- Authorization checks (ownership, permissions)

**API Surface**:
```typescript
interface AuthService {
  // User Management
  register(username: string, password: string, email?: string): Promise<User>
  login(username: string, password: string): Promise<SessionToken>
  logout(sessionToken: string): Promise<void>

  // Session Management
  getUser(sessionToken: string): Promise<User | null>
  verifySession(sessionToken: string): Promise<boolean>
  refreshSession(sessionToken: string): Promise<SessionToken>

  // Authorization
  canEditPlanet(userId: number, planetId: number): Promise<boolean>
  canViewPlanet(userId: number, planetId: number): Promise<boolean>
}
```

**Current Location**:
- `src/lib/session.ts` - Session utilities
- `src/lib/queries.ts` - `getUser()`, user queries
- `src/app/api/user/*` - User API endpoints

**Suggested Refactor**:
```
src/services/auth/
├── index.ts              # Public API surface
├── user-repository.ts    # Database queries for users
├── session-manager.ts    # Session creation/validation
├── authorization.ts      # Permission checks
└── types.ts             # Auth-specific types
```

---

### 2. Workspace Service

**Responsibility**: Planet (workspace) lifecycle management

**Domain**:
- Planet CRUD operations
- User workspace initialization
- Planet metadata and settings
- Planet discovery and navigation

**API Surface**:
```typescript
interface WorkspaceService {
  // Planet Management
  createPlanet(userId: number, name: string, slug: string): Promise<Planet>
  getPlanet(slug: string): Promise<Planet | null>
  updatePlanet(planetId: number, updates: Partial<Planet>): Promise<Planet>
  deletePlanet(planetId: number): Promise<void>

  // User Workspaces
  getUserWorkspace(userId: number): Promise<Planet | null>
  ensureUserWorkspace(userId: number, username: string): Promise<Planet>
  listUserPlanets(userId: number): Promise<Planet[]>

  // Discovery
  getAllPlanets(limit?: number): Promise<Planet[]>
  searchPlanets(query: string): Promise<Planet[]>
}
```

**Current Location**:
- `src/lib/queries.ts` - Planet queries
- `src/app/api/planets/*` - Planet API endpoints
- `src/components/planet-manager.tsx` - Planet UI

**Suggested Refactor**:
```
src/services/workspace/
├── index.ts                  # Public API surface
├── planet-repository.ts      # Database queries
├── workspace-initializer.ts  # Workspace setup
├── planet-validator.ts       # Slug validation, etc.
└── types.ts                 # Workspace-specific types
```

---

### 3. Content Service

**Responsibility**: Node CRUD, hierarchy, and navigation

**Domain**:
- Node creation, reading, updating, deletion
- Namespace-based hierarchy management
- Path resolution (URL → Node)
- Breadcrumb generation
- Node search and filtering

**API Surface**:
```typescript
interface ContentService {
  // CRUD Operations
  createNode(planet: Planet, node: NewNode): Promise<Node>
  getNode(nodeId: number): Promise<Node | null>
  getNodeByPath(planetSlug: string, pathSegments: string[]): Promise<Node | null>
  updateNode(nodeId: number, updates: Partial<Node>): Promise<Node>
  deleteNode(nodeId: number): Promise<void>

  // Hierarchy Navigation
  getNodeChildren(planetId: number, namespace: string, type?: 'file' | 'folder'): Promise<Node[]>
  getNodeParent(node: Node): Promise<Node | null>
  getNodeBreadcrumbs(node: Node): Promise<Breadcrumb[]>
  getNodeSiblings(node: Node): Promise<Node[]>

  // Bulk Operations
  moveNode(nodeId: number, newNamespace: string): Promise<void>
  copyNode(nodeId: number, targetNamespace: string): Promise<Node>

  // Search
  searchNodes(planetId: number, query: string): Promise<Node[]>
  getRecentNodes(planetId: number, limit: number): Promise<Node[]>
}
```

**Current Location**:
- `src/lib/queries.ts` - Node queries (main logic)
- `src/app/api/nodes/*` - Node API endpoints
- `src/components/editable-card.tsx` - Node UI

**Suggested Refactor**:
```
src/services/content/
├── index.ts                # Public API surface
├── node-repository.ts      # Database queries
├── hierarchy-manager.ts    # Namespace operations
├── path-resolver.ts        # URL → Node mapping
├── search-engine.ts        # Full-text search
└── types.ts               # Content-specific types
```

---

### 4. Markdown Service

**Responsibility**: Markdown/MDX rendering, caching, and optimization

**Domain**:
- MDX compilation (server-side)
- Syntax highlighting
- Frontmatter extraction
- Rendering cache management
- First-visible-lines optimization (PPR)

**API Surface**:
```typescript
interface MarkdownService {
  // Rendering
  renderMarkdown(content: string): Promise<RenderedContent>
  renderMDX(content: string): Promise<ReactElement>

  // Caching & Optimization
  getFirstVisibleLines(filePath: string, lines: number): Promise<string>
  getCachedRenderedContent(contentHash: string): Promise<RenderedContent | null>
  invalidateCache(contentHash: string): Promise<void>

  // Frontmatter
  extractFrontmatter(content: string): { frontmatter: Metadata; content: string }

  // Utilities
  calculateReadingTime(content: string): number
  extractHeadings(content: string): Heading[]
  generateTableOfContents(content: string): TOCItem[]
}
```

**Current Location**:
- `src/lib/markdown-cache.ts` - Markdown caching
- `src/components/markdown-page.tsx` - Markdown rendering
- `src/components/mdx-component.tsx` - MDX styling
- `src/components/full-markdown-content.tsx` - Suspense rendering

**Suggested Refactor**:
```
src/services/markdown/
├── index.ts                    # Public API surface
├── renderer.ts                 # MDX compilation
├── cache-manager.ts            # Caching logic
├── frontmatter-parser.ts       # Metadata extraction
├── optimization.ts             # First-visible-lines, etc.
└── types.ts                   # Markdown-specific types
```

---

### 5. Logseq Service

**Responsibility**: Logseq-specific features and integrations

**Domain**:
- Block references `((uuid))`
- Page references `[[page]]`
- Graph upload and parsing
- Logseq syntax rendering
- Bidirectional links
- Block-level operations

**API Surface**:
```typescript
interface LogseqService {
  // Graph Import
  parseLogseqGraph(files: File[]): Promise<ParsedLogseqFile[]>
  importGraph(planetId: number, files: ParsedLogseqFile[]): Promise<void>

  // Block Management
  getBlockIndex(planetId: number): Promise<BlockIndex>
  resolveBlockReference(planetId: number, blockId: string): Promise<Block | null>
  createBlockLink(fromBlockId: string, toBlockId: string): Promise<void>

  // Page References
  extractPageReferences(content: string): string[]
  convertPageReferences(content: string, planetSlug: string, currentPage: string): string
  getBacklinks(pageId: number): Promise<Node[]>

  // Rendering
  renderLogseqMarkdown(content: string, context: RenderContext): Promise<string>
}
```

**Current Location**:
- `src/lib/logseq/*` - All Logseq logic
  - `parser.ts` - Graph parsing
  - `render.ts` - Logseq syntax rendering
  - `references.ts` - Block/page references
  - `cache.ts` - Block index caching
  - `extract-page-refs.ts` - Page reference extraction
- `src/components/logseq-markdown-preview.tsx` - UI
- `src/components/logseq-page-links.tsx` - Page links UI

**Suggested Refactor**:
```
src/services/logseq/
├── index.ts                  # Public API surface
├── graph-importer.ts         # Graph upload/parsing
├── block-manager.ts          # Block operations
├── reference-resolver.ts     # Links and references
├── renderer.ts              # Logseq-specific rendering
├── parser.ts                # File parsing (already exists)
└── types.ts                 # Logseq-specific types
```

---

### 6. Editing Service

**Responsibility**: Edit sessions, backups, and version control

**Domain**:
- Editing session lifecycle
- Backup creation before mutations
- Apply/discard workflow
- Version history tracking
- Conflict resolution

**API Surface**:
```typescript
interface EditingService {
  // Session Management
  startEditingSession(userId: number, planetId: number): Promise<EditingSession>
  getActiveSession(userId: number, planetId: number): Promise<EditingSession | null>
  endEditingSession(sessionId: number): Promise<void>

  // Backup Operations
  createBackup(sessionId: number, node: Node, type: 'create' | 'update' | 'delete'): Promise<NodeBackup>
  listBackups(sessionId: number): Promise<NodeBackup[]>

  // Apply/Discard Workflow
  applyChanges(sessionId: number): Promise<void>
  discardChanges(sessionId: number): Promise<void>

  // Version History
  getNodeHistory(nodeId: number): Promise<NodeBackup[]>
  restoreFromBackup(backupId: number): Promise<Node>
}
```

**Current Location**:
- `src/lib/queries.ts` - Session queries
- `src/app/api/editing/*` - Editing API endpoints
- `src/components/editing-toolbar.tsx` - Editing UI

**Suggested Refactor**:
```
src/services/editing/
├── index.ts                    # Public API surface
├── session-manager.ts          # Session lifecycle
├── backup-manager.ts           # Backup operations
├── version-control.ts          # History tracking
└── types.ts                   # Editing-specific types
```

---

### 7. Ingestion Service

**Responsibility**: Bulk content import and processing

**Domain**:
- Folder ingestion (recursive)
- File parsing (markdown, MDX)
- Metadata extraction
- Hierarchy reconstruction
- Progress tracking
- Error handling and rollback

**API Surface**:
```typescript
interface IngestionService {
  // Folder Ingestion
  ingestFolder(planetId: number, folderPath: string): Promise<IngestionResult>
  ingestFiles(planetId: number, files: File[]): Promise<IngestionResult>

  // Logseq Graph Import
  ingestLogseqGraph(planetId: number, graphFolder: File[]): Promise<IngestionResult>

  // Progress Tracking
  getIngestionStatus(jobId: string): Promise<IngestionStatus>
  cancelIngestion(jobId: string): Promise<void>

  // Validation
  validateFiles(files: File[]): Promise<ValidationResult>
  previewImport(files: File[]): Promise<ImportPreview>
}
```

**Current Location**:
- `src/lib/ingestion/ingest-folder.ts` - Folder ingestion
- `src/app/api/ingest/route.ts` - Ingestion API
- `src/components/file-upload-dropzone.tsx` - Upload UI
- `src/components/logseq-graph-upload.tsx` - Logseq upload

**Suggested Refactor**:
```
src/services/ingestion/
├── index.ts                    # Public API surface
├── folder-processor.ts         # Recursive folder processing
├── file-parser.ts              # Markdown/MDX parsing
├── logseq-importer.ts          # Logseq graph import
├── progress-tracker.ts         # Job status tracking
└── types.ts                   # Ingestion-specific types
```

---

## Service Interactions

### Typical Request Flows

#### 1. User Views a Page (`/planet/docs/guide`)

```
┌──────────┐
│  Browser │
└────┬─────┘
     │ GET /planet/docs/guide
     ▼
┌──────────────────────────┐
│   App Router (RSC)       │
│  [planet]/[[...path]]    │
└────┬─────────────────────┘
     │
     ├──► Auth Service.getUser() ───────────────┐
     │                                          │
     ├──► Workspace Service.getPlanet("planet") │
     │                                          │
     └──► Content Service.getNodeByPath(        │
          "planet", ["docs", "guide"]           │
        ) ──────────────────────────────────────┤
                                                 │
          ┌──────────────────────────────────────┘
          │ Node found
          ▼
     ┌─────────────────────────┐
     │  Is Logseq page?        │
     └────┬─────────────┬──────┘
          │ YES         │ NO
          ▼             ▼
     ┌──────────────┐  ┌─────────────────┐
     │ Logseq       │  │ Markdown        │
     │ Service.     │  │ Service.        │
     │ render()     │  │ render()        │
     └──────────────┘  └─────────────────┘
          │                    │
          └────────┬───────────┘
                   ▼
          ┌──────────────────┐
          │  Render HTML     │
          │  Send to client  │
          └──────────────────┘
```

#### 2. User Edits a Node

```
┌──────────┐
│  Browser │
└────┬─────┘
     │ Click "Edit Mode"
     ▼
┌──────────────────────────┐
│ Editing Service          │
│ .startEditingSession()   │
└────┬─────────────────────┘
     │ Session created
     ▼
┌──────────────────────────┐
│  User edits content      │
│  (client-side)           │
└────┬─────────────────────┘
     │ PUT /api/nodes/123
     ▼
┌──────────────────────────┐
│ Auth Service             │
│ .canEditPlanet()         │ ──── Verify ownership
└────┬─────────────────────┘
     │ Authorized
     ▼
┌──────────────────────────┐
│ Editing Service          │
│ .createBackup()          │ ──── Backup before change
└────┬─────────────────────┘
     │ Backup saved
     ▼
┌──────────────────────────┐
│ Content Service          │
│ .updateNode()            │ ──── Perform update
└────┬─────────────────────┘
     │ Updated
     ▼
┌──────────────────────────┐
│ Markdown Service         │
│ .invalidateCache()       │ ──── Clear old cache
└────┬─────────────────────┘
     │ Cache invalidated
     ▼
┌──────────────────────────┐
│  Return updated node     │
└──────────────────────────┘
```

#### 3. User Uploads Logseq Graph

```
┌──────────┐
│  Browser │
└────┬─────┘
     │ Upload graph.zip
     ▼
┌──────────────────────────┐
│ Ingestion Service        │
│ .ingestLogseqGraph()     │
└────┬─────────────────────┘
     │ Unzip & parse files
     ▼
┌──────────────────────────┐
│ Logseq Service           │
│ .parseLogseqGraph()      │ ──── Parse pages & journals
└────┬─────────────────────┘
     │ Parsed files
     ▼
┌──────────────────────────┐
│ Content Service          │
│ .createNode() [bulk]     │ ──── Create nodes
└────┬─────────────────────┘
     │ Nodes created
     ▼
┌──────────────────────────┐
│ Logseq Service           │
│ .createBlockLinks()      │ ──── Build references
└────┬─────────────────────┘
     │ Links created
     ▼
┌──────────────────────────┐
│  Return success          │
└──────────────────────────┘
```

---

## Data Flow Diagrams

### Read Path (Cached)

```
Request → Auth Check → Cache Hit → Return (< 50ms)
```

### Read Path (Uncached)

```
Request → Auth Check → Cache Miss → DB Query → Render → Cache → Return (< 200ms)
```

### Write Path

```
Request → Auth Check → Session Check → Create Backup → Mutate DB → Invalidate Cache → Return
```

### PPR (Partial Pre-rendering) Path

```
Request → Static Shell (instant) → Suspense Boundary → Dynamic Content (streamed)
```

---

## Implementation Structure

### Proposed Directory Layout

```
src/
├── services/                    # SERVICE LAYER
│   ├── auth/
│   │   ├── index.ts            # Public exports
│   │   ├── user-repository.ts
│   │   ├── session-manager.ts
│   │   ├── authorization.ts
│   │   └── types.ts
│   │
│   ├── workspace/
│   │   ├── index.ts
│   │   ├── planet-repository.ts
│   │   ├── workspace-initializer.ts
│   │   ├── planet-validator.ts
│   │   └── types.ts
│   │
│   ├── content/
│   │   ├── index.ts
│   │   ├── node-repository.ts
│   │   ├── hierarchy-manager.ts
│   │   ├── path-resolver.ts
│   │   ├── search-engine.ts
│   │   └── types.ts
│   │
│   ├── markdown/
│   │   ├── index.ts
│   │   ├── renderer.ts
│   │   ├── cache-manager.ts
│   │   ├── frontmatter-parser.ts
│   │   ├── optimization.ts
│   │   └── types.ts
│   │
│   ├── logseq/
│   │   ├── index.ts
│   │   ├── graph-importer.ts
│   │   ├── block-manager.ts
│   │   ├── reference-resolver.ts
│   │   ├── renderer.ts
│   │   ├── parser.ts
│   │   └── types.ts
│   │
│   ├── editing/
│   │   ├── index.ts
│   │   ├── session-manager.ts
│   │   ├── backup-manager.ts
│   │   ├── version-control.ts
│   │   └── types.ts
│   │
│   └── ingestion/
│       ├── index.ts
│       ├── folder-processor.ts
│       ├── file-parser.ts
│       ├── logseq-importer.ts
│       ├── progress-tracker.ts
│       └── types.ts
│
├── app/                         # PRESENTATION LAYER
│   ├── [planet]/[[...path]]/   # Dynamic pages (uses services)
│   ├── api/                     # API endpoints (thin wrappers)
│   └── ...
│
├── components/                  # UI COMPONENTS
│   └── ...                      # React components (use services via server actions)
│
├── db/                          # DATA LAYER
│   ├── schema.ts               # Database schema
│   └── index.ts                # DB connection
│
└── lib/                         # SHARED UTILITIES
    ├── utils.ts                # General utilities
    ├── unstable-cache.ts       # Cache wrapper
    └── ...
```

### Service Layer Principles

1. **Single Responsibility**: Each service handles one domain
2. **Dependency Injection**: Services depend on abstractions, not implementations
3. **Testability**: Services are pure functions, easily unit testable
4. **Composability**: Services can call other services
5. **Caching**: Services integrate with Next.js cache layer
6. **Error Handling**: Services return typed errors, not throw

### Example Service Implementation

```typescript
// src/services/content/index.ts
import { db } from '@/db';
import { nodes, type Node, type NewNode } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { unstable_cache } from '@/lib/unstable-cache';
import { revalidateTag } from 'next/cache';

/**
 * Content Service
 * Handles all node CRUD operations and hierarchy management
 */

// ============================================
// PUBLIC API
// ============================================

export const ContentService = {
  createNode,
  getNode,
  getNodeByPath,
  updateNode,
  deleteNode,
  getNodeChildren,
  searchNodes,
} as const;

// ============================================
// IMPLEMENTATIONS
// ============================================

async function createNode(planetId: number, nodeData: NewNode): Promise<Node> {
  const [node] = await db
    .insert(nodes)
    .values({
      ...nodeData,
      planet_id: planetId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  // Invalidate cache
  revalidateTag(`planet-${planetId}-nodes`);

  return node;
}

const getCachedNode = unstable_cache(
  async (nodeId: number) => {
    return await db.query.nodes.findFirst({
      where: eq(nodes.id, nodeId),
    });
  },
  ['node-by-id'],
  { revalidate: 7200, tags: ['nodes'] }
);

async function getNode(nodeId: number): Promise<Node | null> {
  return (await getCachedNode(nodeId)) || null;
}

async function getNodeByPath(
  planetSlug: string,
  pathSegments: string[]
): Promise<Node | null> {
  // Implementation from queries.ts
  // ...
}

// ... more implementations
```

---

## Migration Strategy

### Phase 1: Extract Auth Service (Week 1)
- Move all auth logic from `lib/queries.ts` to `services/auth/`
- Update all imports
- Add unit tests
- Zero breaking changes (same API surface)

### Phase 2: Extract Workspace Service (Week 1)
- Move planet logic to `services/workspace/`
- Update imports
- Add tests

### Phase 3: Extract Content Service (Week 2)
- Move node CRUD to `services/content/`
- This is the largest service
- Incremental migration (move one function at a time)

### Phase 4: Extract Markdown Service (Week 2)
- Move rendering logic to `services/markdown/`
- Update components
- Add tests

### Phase 5: Extract Logseq Service (Week 3)
- Consolidate existing `lib/logseq/*` into `services/logseq/`
- Minimal changes (mostly organization)

### Phase 6: Extract Editing Service (Week 3)
- Move session/backup logic to `services/editing/`
- Update API endpoints

### Phase 7: Extract Ingestion Service (Week 4)
- Move ingestion logic to `services/ingestion/`
- Add progress tracking
- Improve error handling

### Testing Strategy
- **Unit Tests**: Each service method
- **Integration Tests**: Service interactions
- **E2E Tests**: Critical user flows
- **Performance Tests**: Ensure no regression

### Rollout Strategy
- **Feature Flags**: Toggle new services on/off
- **Gradual Migration**: One page at a time
- **Monitoring**: Track performance metrics
- **Rollback Plan**: Keep old code until verified

---

## Benefits of This Architecture

### Development Velocity
- **Clear Boundaries**: Developers know where code belongs
- **Parallel Development**: Teams can work on different services
- **Easier Onboarding**: New developers understand structure quickly

### Maintainability
- **Single Responsibility**: Each service has one job
- **Testability**: Services are isolated and easy to test
- **Refactoring**: Changes contained within service boundaries

### Performance
- **Caching**: Services integrate with Next.js cache
- **Optimization**: Each service can optimize independently
- **Monitoring**: Per-service performance tracking

### Scalability
- **Horizontal Scaling**: Services can scale independently (if needed)
- **Microservices Ready**: Can extract services later if needed
- **Database Sharding**: Services define data boundaries

### Code Quality
- **Type Safety**: TypeScript interfaces for all services
- **Consistent Patterns**: Same structure across services
- **Documentation**: Each service is self-documenting

---

## Anti-Patterns to Avoid

### ❌ Don't: Mix Concerns
```typescript
// BAD: Auth logic in Content Service
async function createNode(userId: number, node: NewNode) {
  // Don't verify auth here!
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error('Unauthorized');
  // ...
}
```

### ✅ Do: Compose Services
```typescript
// GOOD: Separate concerns
async function createNodeHandler(req: Request) {
  const user = await AuthService.getUser(sessionToken);
  if (!user) return unauthorized();

  const node = await ContentService.createNode(planetId, nodeData);
  return json(node);
}
```

### ❌ Don't: Create Circular Dependencies
```typescript
// BAD: ContentService imports AuthService which imports ContentService
```

### ✅ Do: Use Dependency Injection
```typescript
// GOOD: Pass dependencies explicitly
async function createNode(node: NewNode, deps: { auth: AuthService }) {
  // ...
}
```

### ❌ Don't: Bypass Services
```typescript
// BAD: Direct DB access in components
async function MyComponent() {
  const nodes = await db.query.nodes.findMany(...);
}
```

### ✅ Do: Always Use Services
```typescript
// GOOD: Use service layer
async function MyComponent() {
  const nodes = await ContentService.getNodeChildren(planetId, namespace);
}
```

---

## Future Enhancements

### Potential Service Additions

1. **Search Service**: Full-text search, filters, facets
2. **Analytics Service**: Usage tracking, insights
3. **Notification Service**: Real-time updates, webhooks
4. **Export Service**: PDF, EPUB, HTML export
5. **AI Service**: Embeddings, semantic search, chat
6. **Collaboration Service**: Real-time editing, comments

### Microservices Migration Path

If the monolith becomes too large:

1. Extract services to separate packages (`@dropz/auth`, `@dropz/content`)
2. Add service discovery (HTTP, gRPC)
3. Deploy services independently
4. Use shared data store or event sourcing

**But don't do this unless necessary!** Modular monolith is usually sufficient.

---

## Conclusion

This service-based architecture provides:

✅ **Clear separation of concerns**
✅ **Easy to understand and navigate**
✅ **Testable and maintainable**
✅ **Scales with team size**
✅ **Preserves deployment simplicity**
✅ **Maintains current performance**

The modular monolith approach gives you the benefits of microservices (modularity, testability) without the operational complexity (networking, deployment, debugging).

---

**Next Steps**:
1. Review this architecture with the team
2. Prioritize service extraction order
3. Start with Auth Service (smallest, easiest)
4. Iterate and improve based on learnings

**Questions?** Let's discuss specific services or migration strategies!

---

**Last Updated**: 2025-11-15
**Version**: 1.0.0
**Author**: Claude (Anthropic AI)
