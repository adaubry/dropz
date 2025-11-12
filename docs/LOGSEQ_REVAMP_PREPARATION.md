# Logseq Revamp Preparation Document

**Project:** Dropz - Transition from Folder Paradigm to Full Logseq Compatibility
**Date:** 2025-11-12
**Status:** Planning Phase - Do Not Implement Yet

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Architecture](#current-system-architecture)
3. [Target Logseq System](#target-logseq-system)
4. [Critical Differences & Paradigm Shifts](#critical-differences--paradigm-shifts)
5. [What I Need From You](#what-i-need-from-you)
6. [Migration Strategy Overview](#migration-strategy-overview)
7. [Database Schema Changes](#database-schema-changes)
8. [File Format Transformation](#file-format-transformation)
9. [Implementation Phases](#implementation-phases)
10. [Risk Assessment](#risk-assessment)
11. [Testing Requirements](#testing-requirements)
12. [Rollback Strategy](#rollback-strategy)

---

## Executive Summary

### Current State
Your system is a **hierarchical folder-based document management system** with:
- Explicit folder nodes (type: 'folder')
- File nodes (type: 'file')
- Namespace-based hierarchy using strings (`guides/setup/intro`)
- Traditional markdown with YAML frontmatter
- Virtual folders auto-generated from file paths

### Target State
Logseq is a **flat graph-based knowledge management system** with:
- Everything is a page (no folder concept)
- Namespaces create virtual hierarchies via page names (`guides/setup/intro.md`)
- Block-based content structure (every line = bullet point)
- Properties instead of frontmatter (`property:: value`)
- Journal pages (daily notes)
- UUID-based block references

### The Fundamental Shift
**FROM:** Folders contain files contain content
**TO:** Pages contain blocks, linked by references

This is not just a format change—it's a complete conceptual transformation from tree-based to graph-based knowledge management.

---

## Current System Architecture

### 1. Data Model (Folder Paradigm)

#### Node Types
```typescript
{
  type: 'folder' | 'file',  // Explicit distinction
  slug: 'intro',
  namespace: 'guides/setup',  // Parent path
  depth: 2,                   // Nesting level
  file_path: 'guides/setup/intro.md',
  content: string | null,     // Only for files
  metadata: {                 // YAML frontmatter
    cover?: string,
    summary?: string,
    tags?: string[],
    sidebar_position?: number
  }
}
```

#### Hierarchy Mechanism
- **Namespace strings**: `guides/setup/intro` → stored as separate fields
- **Explicit folders**: Created as nodes with `type: 'folder'`
- **Parent-child via path matching**: Children found by matching namespace prefix
- **Depth tracking**: Integer field for nesting level (0 = root)

#### File Format
```markdown
---
title: Introduction
tags: [guide, setup]
sidebar_position: 1
---

# Introduction

This is a paragraph.

## Section

More content here.
```

### 2. Current Logseq Support (Partial)

✅ **Already Implemented:**
- Logseq markdown syntax parsing (`remark-logseq` plugin)
- Page references `[[page name]]`
- Block references `((block-id))`
- Task markers (TODO, DOING, DONE, LATER, NOW)
- Highlights `==text==`
- Properties `property:: value` (parsed in content)
- Callouts `> [!NOTE]`
- YouTube embeds `{{youtube URL}}`
- Super/subscript syntax

❌ **Not Yet Implemented:**
- Block-based content structure (bullet points)
- Flat file system (pages/journals structure)
- Journal pages (daily notes)
- UUID generation for blocks
- Block embeds (actual content insertion)
- Page embeds (actual content insertion)
- Namespace as page names (currently folder paths)

---

## Target Logseq System

### 1. Core Concepts

#### Everything is a Page
```
NO folders, only pages:
- Regular pages (stored in pages/)
- Journal pages (stored in journals/)
- Namespaced pages (stored as flat files: guides.setup.intro.md)
```

#### Everything is a Block
```markdown
- This is a block
  - This is a nested block
    - Deeply nested block
- Another root block
  - With children
```

Every paragraph, every line, every item is a block with:
- Unique UUID
- Parent-child relationships via indentation
- Ability to be referenced from anywhere

### 2. File System Structure

```
my-graph/
├── assets/              # Images, attachments
├── journals/            # Daily notes
│   ├── 2025_11_12.md
│   ├── 2025_11_11.md
│   └── ...
├── pages/               # All pages (flat!)
│   ├── Getting Started.md
│   ├── Project.md
│   ├── guides___setup___intro.md    # Namespace using ___
│   └── ...
└── logseq/              # Config files
    ├── config.edn
    └── ...
```

**Critical:** Files in `pages/` are **flat**. Hierarchy is virtual, created by namespaces in page names.

### 3. Namespace System

#### Page Naming Convention
Logseq uses forward slashes in page names to create virtual hierarchies:

```
[[guides/setup/intro]]  → File: pages/guides___setup___intro.md
[[project/tasks]]       → File: pages/project___tasks.md
[[meetings/2024/Q1]]    → File: pages/meetings___2024___Q1.md
```

The forward slash character creates hierarchy, but files are stored flat using `___` as separator.

#### Namespace Features
- Parent pages auto-generated if they don't exist
- Namespace queries: `{{namespace guides/setup}}`
- Breadcrumb navigation automatically generated
- Sidebar shows hierarchy tree

### 4. Block Structure

#### Every Line is a Block
```markdown
- This is block-1 (UUID: 656f8e3e-e8f3-4a6b-9f3e-0123456789ab)
  - This is block-2 (UUID: 756f8e3e-e8f3-4a6b-9f3e-0123456789cd)
  - This is block-3 (UUID: 856f8e3e-e8f3-4a6b-9f3e-0123456789ef)
- This is block-4 (UUID: 956f8e3e-e8f3-4a6b-9f3e-0123456789gh)
```

#### Block References
```markdown
- Original content here
  id:: 656f8e3e-e8f3-4a6b-9f3e-0123456789ab

- Reference to that block: ((656f8e3e-e8f3-4a6b-9f3e-0123456789ab))
```

When rendered, the reference shows the original block's content inline.

### 5. Properties (Not Frontmatter)

Logseq does NOT use YAML frontmatter. Instead:

```markdown
- title:: My Page Title
  tags:: tag1, tag2, tag3
  author:: John Doe
  status:: published
  date:: [[2025-11-12]]
- The actual content starts here
  - With nested blocks
```

Properties are **inline blocks** at the top of the page using `property:: value` syntax.

### 6. Journal Pages

Daily notes stored in `journals/`:

```markdown
# journals/2025_11_12.md

- Monday, November 12, 2025
- ## Meeting Notes
  - Discussed project timeline
  - Action items:
    - TODO Review [[Project/Roadmap]]
    - TODO Update [[Documentation]]
- ## Ideas
  - New feature concept: [[Feature Ideas/Auto Sync]]
```

Journal pages:
- Created automatically when referenced
- Named by date (YYYY_MM_DD.md)
- Can link to regular pages
- Support all Logseq features

### 7. Graph Visualization

Logseq builds a knowledge graph from:
- `[[Page References]]` → edges between page nodes
- `((Block References))` → edges to specific blocks
- #tags → tag nodes connecting tagged pages

---

## Critical Differences & Paradigm Shifts

### 1. Folder vs. Page Paradigm

| Current System | Logseq System |
|----------------|---------------|
| Folders are containers | Pages are first-class entities |
| Files live inside folders | All pages are flat |
| Hierarchy from directory structure | Hierarchy from page names |
| Can have empty folders | No concept of empty containers |
| Folder can have README.md | Namespace parent page |

**Example:**

**Current:**
```
guides/
├── setup/
│   ├── intro.md
│   └── config.md
└── tutorials/
    └── first-steps.md
```

**Logseq:**
```
pages/
├── guides.md                      (optional parent page)
├── guides___setup.md              (optional parent)
├── guides___setup___intro.md      (actual page)
├── guides___setup___config.md     (actual page)
├── guides___tutorials.md          (optional parent)
└── guides___tutorials___first-steps.md
```

### 2. Content Structure

| Current System | Logseq System |
|----------------|---------------|
| Free-form markdown | Block-based (bullet points) |
| Paragraphs are continuous text | Every paragraph is a block |
| Headings as structure | Headings as special blocks |
| No inherent reusability | Every block is referenceable |

**Example:**

**Current:**
```markdown
# Introduction

This is a paragraph about the topic.

It continues here.

## Subsection

More content.
```

**Logseq:**
```markdown
- # Introduction
- This is a paragraph about the topic.
- It continues here.
- ## Subsection
- More content.
```

### 3. Metadata

| Current System | Logseq System |
|----------------|---------------|
| YAML frontmatter block | Inline properties |
| Parsed separately | Properties are blocks |
| Keys use snake_case | Keys use any case |
| Hidden from content | Visible (but hideable) |

**Example:**

**Current:**
```markdown
---
title: Getting Started
tags: [guide, beginner]
author: John Doe
---

Content starts here.
```

**Logseq:**
```markdown
- title:: Getting Started
  tags:: guide, beginner
  author:: John Doe
- Content starts here.
```

### 4. References & Links

| Current System | Logseq System |
|----------------|---------------|
| Links to files | Links to pages |
| No block references | Block references everywhere |
| Static links | Bidirectional links |
| No auto-backlinks | Automatic backlinks |

**Example:**

**Current:**
```markdown
See [Configuration Guide](./config.md) for details.
```

**Logseq:**
```markdown
- See [[guides/setup/config]] for details.
- Specifically: ((656f8e3e-block-uuid))
```

### 5. Database Schema Impact

| Current Schema | Required for Logseq |
|----------------|---------------------|
| `type: 'folder' \| 'file'` | `type: 'page' \| 'journal'` |
| `namespace: string` (path) | `namespace: string` (from page name) |
| `slug: string` | `page_name: string` (can include `/`) |
| `depth: number` | Calculated from namespace |
| `content: string` | `blocks: Block[]` |
| `file_path: string` | `file_path: string` (in pages/ or journals/) |
| `metadata: jsonb` | Parsed from property blocks |

### 6. Query & Search

| Current System | Logseq System |
|----------------|---------------|
| Search files and folders | Search pages and blocks |
| Namespace prefix matching | Namespace queries |
| Content search in files | Block-level search |
| No graph queries | Advanced query language |

---

## What I Need From You

### Decision Points

#### 1. **Backward Compatibility**
- **Do we maintain the old folder system alongside Logseq?**
  - Option A: Hard cutover (migrate all existing data)
  - Option B: Dual-mode support (folders AND pages)
  - Option C: Gradual migration (flag nodes as migrated)

**My Recommendation:** Option C (gradual migration) with feature flag

#### 2. **File Storage Strategy**
- **Where do Logseq pages live?**
  - Option A: Keep in database only (current approach)
  - Option B: Database + sync to disk (pages/ and journals/)
  - Option C: Disk-first, database as cache

**My Recommendation:** Option B (database + sync) for Logseq compatibility

#### 3. **Namespace Delimiter**
- **How do we store namespace in page names?**
  - Logseq displays: `[[guides/setup/intro]]`
  - Logseq files: `guides___setup___intro.md` (triple underscore)
  - Or: `guides.setup.intro.md` (dots)
  - Or: `guides/setup/intro.md` (actual folders, breaks flat structure)

**My Recommendation:** Triple underscore (`___`) for true Logseq compatibility

#### 4. **Block Storage**
- **How do we store individual blocks?**
  - Option A: Parse on-demand from markdown
  - Option B: Separate `blocks` table with parent-child relationships
  - Option C: JSONB array in `nodes.blocks`

**My Recommendation:** Option B (separate table) for query performance

#### 5. **UUID Generation**
- **Block ID format:**
  - Logseq uses: `656f8e3e-e8f3-4a6b-9f3e-0123456789ab`
  - We need: Compatible UUID v4 generation

**My Recommendation:** Use crypto.randomUUID() with Logseq format

#### 6. **Migration Path for Existing Content**
- **How to convert current markdown to block-based?**
  - Auto-wrap paragraphs with `- ` prefix?
  - Manual conversion required?
  - Keep original, show warning?

**My Recommendation:** Auto-convert with validation and rollback

#### 7. **Journal Pages**
- **Do we want daily notes feature?**
  - Full journal support (new table?)
  - Basic date-based pages only?
  - Skip journals entirely?

**My Recommendation:** Full support, separate `journal_pages` table

#### 8. **Graph Features**
- **What level of graph support?**
  - Visual graph (d3.js/cytoscape)?
  - Backlinks only?
  - Full advanced queries?

**My Recommendation:** Start with backlinks, then visual graph

### Information Required

#### 1. **Current Data Inventory**
- How many nodes exist in the current system?
- How many are folders vs. files?
- What's the deepest namespace depth?
- Are there any empty folders we need to preserve?

**Action:** Run query to get statistics

#### 2. **User Expectations**
- Will users import existing Logseq graphs?
- Do they expect 100% Logseq compatibility?
- Can we have breaking changes?
- Is export to Logseq format required?

**Action:** Define compatibility requirements

#### 3. **Performance Constraints**
- How large can pages get (block count)?
- Expected number of concurrent editors?
- Graph size limits (node/edge count)?
- Query performance requirements?

**Action:** Define performance benchmarks

#### 4. **Feature Priorities**
What's most important? (Rank 1-5):
- [ ] Block references working
- [ ] Page embeds working
- [ ] Journal pages
- [ ] Visual graph
- [ ] Advanced queries
- [ ] Logseq import/export
- [ ] Mobile compatibility
- [ ] Real-time collaboration

**Action:** Prioritize feature list

#### 5. **Testing Data**
- Do you have sample Logseq graphs to test with?
- Can we create test fixtures?
- Do we need migration dry-run tools?

**Action:** Prepare test datasets

---

## Migration Strategy Overview

### Phase 1: Schema Extension (No Breaking Changes)
1. Add new fields to `nodes` table:
   - `page_name` (for namespace-inclusive names)
   - `is_journal` boolean
   - `logseq_format` boolean (migration flag)
2. Create `blocks` table
3. Add indexes for block queries
4. Keep existing `type`, `namespace`, `slug` for backward compatibility

### Phase 2: Block Storage Implementation
1. Create block parser (markdown → block tree)
2. Implement block CRUD operations
3. Add block reference resolution
4. Build block search

### Phase 3: Logseq Content Format
1. Support both formats during transition:
   - Old: Traditional markdown with frontmatter
   - New: Block-based with properties
2. Add format converter utilities
3. Implement content migration scripts

### Phase 4: Page System
1. Implement namespace-as-page-name logic
2. Add journal page creation
3. Build parent page auto-generation
4. Update routing to handle `/` in slugs

### Phase 5: References & Graph
1. Implement block reference resolution
2. Add page/block embeds
3. Build backlinks system
4. Create graph data structure

### Phase 6: UI Updates
1. Block-based editor
2. Page reference autocomplete
3. Namespace browser
4. Graph visualization
5. Journal navigation

### Phase 7: Migration Tools
1. Content converter (folder → page)
2. Bulk migration script
3. Validation tools
4. Rollback mechanism

---

## Database Schema Changes

### New Tables

#### 1. `blocks` Table
```sql
CREATE TABLE blocks (
  id SERIAL PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,           -- Logseq-compatible UUID
  page_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
  parent_block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,               -- Block content (single line/paragraph)
  format TEXT DEFAULT 'markdown',      -- markdown | org

  -- Position in tree
  depth INTEGER NOT NULL DEFAULT 0,    -- Indentation level
  position INTEGER NOT NULL DEFAULT 0, -- Order among siblings

  -- Properties
  properties JSONB DEFAULT '{}',       -- Block-level properties

  -- References
  outgoing_refs TEXT[] DEFAULT '{}',   -- Page/block refs this block links to

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX blocks_page_id_idx ON blocks(page_id);
CREATE INDEX blocks_parent_id_idx ON blocks(parent_block_id);
CREATE INDEX blocks_uuid_idx ON blocks(uuid);
CREATE INDEX blocks_refs_idx ON blocks USING gin(outgoing_refs);
```

#### 2. `journal_pages` Table (Optional - or use nodes)
```sql
-- Option A: Separate table
CREATE TABLE journal_pages (
  id SERIAL PRIMARY KEY,
  planet_id INTEGER REFERENCES planets(id) ON DELETE CASCADE,
  date DATE NOT NULL UNIQUE,
  page_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Option B: Add to nodes table
ALTER TABLE nodes ADD COLUMN is_journal BOOLEAN DEFAULT FALSE;
ALTER TABLE nodes ADD COLUMN journal_date DATE;
CREATE INDEX nodes_journal_date_idx ON nodes(journal_date) WHERE is_journal = TRUE;
```

#### 3. `page_references` Table (Materialized Backlinks)
```sql
CREATE TABLE page_references (
  id SERIAL PRIMARY KEY,
  source_page_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
  target_page_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL,        -- 'page' | 'block'
  source_block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(source_page_id, target_page_id, source_block_id)
);

CREATE INDEX page_refs_source_idx ON page_references(source_page_id);
CREATE INDEX page_refs_target_idx ON page_references(target_page_id);
```

### Modified `nodes` Table

```sql
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS page_name TEXT;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_journal BOOLEAN DEFAULT FALSE;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS journal_date DATE;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS logseq_format BOOLEAN DEFAULT FALSE;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS block_count INTEGER DEFAULT 0;

-- New index for page name lookups
CREATE INDEX nodes_page_name_idx ON nodes(page_name) WHERE page_name IS NOT NULL;

-- Transition strategy: Keep old fields, add new ones
-- type: 'folder' | 'file'  →  Keep for backward compat
-- Add: page_name for Logseq-style names like "guides/setup/intro"
```

### Migration Queries

```sql
-- Example: Convert file nodes to pages
UPDATE nodes
SET
  page_name = CASE
    WHEN namespace != '' THEN namespace || '/' || slug
    ELSE slug
  END,
  logseq_format = FALSE  -- Mark as not yet converted
WHERE type = 'file';

-- Example: Mark folders for review
UPDATE nodes
SET logseq_format = NULL  -- NULL = needs decision (convert/merge/delete)
WHERE type = 'folder';
```

---

## File Format Transformation

### Conversion Logic

#### Input: Traditional Markdown
```markdown
---
title: Getting Started
tags: [guide, setup]
author: John Doe
sidebar_position: 1
---

# Getting Started

Welcome to our platform. This guide will help you get started.

## Installation

First, install the dependencies:

```bash
npm install
```

Then run the development server.

## Configuration

Edit the config file at `config.json`.
```

#### Output: Logseq Block Format
```markdown
- title:: Getting Started
  tags:: guide, setup
  author:: John Doe
  sidebar_position:: 1
- # Getting Started
  id:: 656f8e3e-0001-4a6b-9f3e-0123456789ab
- Welcome to our platform. This guide will help you get started.
  id:: 656f8e3e-0002-4a6b-9f3e-0123456789ab
- ## Installation
  id:: 656f8e3e-0003-4a6b-9f3e-0123456789ab
- First, install the dependencies:
  id:: 656f8e3e-0004-4a6b-9f3e-0123456789ab
- ```bash
  npm install
  ```
  id:: 656f8e3e-0005-4a6b-9f3e-0123456789ab
- Then run the development server.
  id:: 656f8e3e-0006-4a6b-9f3e-0123456789ab
- ## Configuration
  id:: 656f8e3e-0007-4a6b-9f3e-0123456789ab
- Edit the config file at `config.json`.
  id:: 656f8e3e-0008-4a6b-9f3e-0123456789ab
```

### Conversion Rules

1. **Frontmatter → Properties**
   - Each YAML key-value → `key:: value` block
   - Arrays → comma-separated: `tags:: tag1, tag2, tag3`
   - Nested objects → flatten or JSON string

2. **Paragraphs → Blocks**
   - Each paragraph becomes a block (line starting with `- `)
   - Empty lines ignored
   - Preserve paragraph breaks as separate blocks

3. **Headings → Blocks**
   - Keep `#` but wrap in block: `- ## Heading`
   - Heading blocks don't create children automatically
   - Next blocks at same level, not nested under heading

4. **Code Blocks → Multi-line Blocks**
   - Entire code block as single block content
   - Preserve language tag
   - Keep indentation within code

5. **Lists → Nested Blocks**
   - Unordered list items → nested blocks with indentation
   - Ordered lists → same, keep numbering

6. **Block IDs**
   - Generate UUID v4 for every block
   - Format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
   - Add as property: `id:: uuid`

### Conversion Utilities Needed

```typescript
// 1. Parse traditional markdown to AST
function parseMarkdown(content: string): MarkdownAST

// 2. Convert AST to Logseq block tree
function astToBlocks(ast: MarkdownAST): BlockTree

// 3. Generate block UUIDs
function generateBlockUUID(): string

// 4. Serialize blocks to Logseq markdown
function blocksToLogseqMarkdown(blocks: BlockTree): string

// 5. Convert frontmatter to properties
function frontmatterToProperties(frontmatter: object): PropertyBlock[]

// 6. Full conversion pipeline
function convertToLogseqFormat(
  markdown: string,
  frontmatter: object
): { blocks: Block[], content: string }
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Add Logseq data structures without breaking existing system

**Tasks:**
- [ ] Create `blocks` table schema
- [ ] Add new columns to `nodes` table
- [ ] Create migration for schema changes
- [ ] Write block CRUD operations
- [ ] Implement UUID generation
- [ ] Create format detection utility

**Deliverables:**
- Database schema migration
- Block model and queries
- Unit tests for block operations

**Risk:** Medium - Database changes require careful testing

---

### Phase 2: Content Conversion (Week 3-4)
**Goal:** Build tools to transform existing content to Logseq format

**Tasks:**
- [ ] Implement markdown → block parser
- [ ] Create frontmatter → properties converter
- [ ] Build block tree serializer
- [ ] Write conversion validation
- [ ] Create dry-run migration script
- [ ] Implement rollback mechanism

**Deliverables:**
- Content conversion library
- CLI migration tool
- Conversion test suite
- Migration documentation

**Risk:** High - Data transformation is complex and error-prone

---

### Phase 3: Page System (Week 5-6)
**Goal:** Implement Logseq page paradigm

**Tasks:**
- [ ] Add namespace parsing from page names
- [ ] Implement page name → file path conversion
- [ ] Create journal page generator
- [ ] Build namespace hierarchy resolver
- [ ] Update routing for `/` in page names
- [ ] Add parent page auto-creation

**Deliverables:**
- Page management API
- Journal page system
- Namespace utilities
- Updated routing

**Risk:** Medium - Routing changes may affect existing URLs

---

### Phase 4: References (Week 7-8)
**Goal:** Make block and page references functional

**Tasks:**
- [ ] Implement block reference parser
- [ ] Create reference resolution engine
- [ ] Build backlinks index
- [ ] Add page embed rendering
- [ ] Add block embed rendering
- [ ] Create reference update triggers

**Deliverables:**
- Reference system
- Backlinks API
- Embed rendering
- Reference indexes

**Risk:** Medium - Performance optimization needed for large graphs

---

### Phase 5: Editor & UI (Week 9-11)
**Goal:** Update UI to support block-based editing

**Tasks:**
- [ ] Build block-based editor component
- [ ] Add outliner functionality (indent/outdent)
- [ ] Create page reference autocomplete
- [ ] Implement block reference picker
- [ ] Add namespace browser
- [ ] Update file upload to create pages
- [ ] Build journal page navigation

**Deliverables:**
- Block editor component
- Reference UI components
- Namespace navigation
- Updated upload flow

**Risk:** High - Major UI changes, UX complexity

---

### Phase 6: Graph Features (Week 12-14)
**Goal:** Add knowledge graph capabilities

**Tasks:**
- [ ] Build graph data structure
- [ ] Implement backlinks panel
- [ ] Create graph visualization (D3.js/Cytoscape)
- [ ] Add graph filters and search
- [ ] Implement local graph (node-specific)
- [ ] Build graph statistics

**Deliverables:**
- Graph visualization
- Backlinks UI
- Graph explorer
- Graph API

**Risk:** Medium - Performance with large graphs

---

### Phase 7: Advanced Features (Week 15-16)
**Goal:** Polish and advanced Logseq features

**Tasks:**
- [ ] Implement advanced queries
- [ ] Add task management (TODO aggregation)
- [ ] Create templates system
- [ ] Build export to Logseq format
- [ ] Add import from Logseq graph
- [ ] Implement page properties panel

**Deliverables:**
- Query language
- Template system
- Import/export tools
- Full Logseq compatibility

**Risk:** Low - Nice-to-have features

---

### Phase 8: Migration & Cleanup (Week 17-18)
**Goal:** Migrate existing data and deprecate old system

**Tasks:**
- [ ] Run full migration on staging data
- [ ] Validate all conversions
- [ ] Update documentation
- [ ] Deprecate folder-based API
- [ ] Remove old code paths
- [ ] Performance optimization

**Deliverables:**
- Production migration script
- Migration report
- Updated documentation
- Clean codebase

**Risk:** High - Data migration to production

---

## Risk Assessment

### Critical Risks

#### 1. Data Loss During Migration
**Probability:** Medium
**Impact:** Critical
**Mitigation:**
- Full database backups before migration
- Dry-run migrations on copies
- Rollback scripts tested
- Gradual migration with validation
- Keep original format alongside new format during transition

#### 2. Breaking Existing URLs
**Probability:** High
**Impact:** High
**Mitigation:**
- Maintain redirect mapping from old paths
- Keep `slug` and `namespace` fields for backward compat
- Add URL aliases
- Implement 301 redirects
- Update sitemap

#### 3. Performance Degradation
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Benchmark before/after
- Index optimization for block queries
- Caching strategy for reference resolution
- Lazy loading for large pages
- Pagination for block lists

#### 4. Incomplete Logseq Compatibility
**Probability:** High
**Impact:** Medium
**Mitigation:**
- Document exact compatibility level
- Test with real Logseq graphs
- Provide import/export validation
- Maintain compatibility matrix
- Regular testing with Logseq updates

#### 5. User Confusion During Transition
**Probability:** High
**Impact:** Medium
**Mitigation:**
- Clear migration guide
- In-app tutorials
- Format converter tools
- Support documentation
- Gradual rollout with feature flags

### Medium Risks

- **Block ID collisions:** Use UUID v4 to prevent
- **Reference resolution performance:** Cache and index
- **Editor complexity:** Extensive testing and UX research
- **Graph visualization performance:** Limit visible nodes
- **Import parsing errors:** Robust error handling and validation

---

## Testing Requirements

### Unit Tests

#### 1. Block Operations
```typescript
describe('Block CRUD', () => {
  test('Create block with UUID')
  test('Update block content')
  test('Delete block cascade')
  test('Move block (change parent)')
  test('Reorder blocks (change position)')
})

describe('Block Parser', () => {
  test('Parse markdown to blocks')
  test('Handle nested blocks')
  test('Preserve code blocks')
  test('Parse properties')
  test('Generate UUIDs')
})
```

#### 2. Content Conversion
```typescript
describe('Format Conversion', () => {
  test('Frontmatter to properties')
  test('Paragraphs to blocks')
  test('Lists to nested blocks')
  test('Preserve code blocks')
  test('Handle edge cases')
})
```

#### 3. Reference System
```typescript
describe('References', () => {
  test('Parse page references')
  test('Parse block references')
  test('Resolve references')
  test('Build backlinks')
  test('Detect circular references')
})
```

#### 4. Namespace System
```typescript
describe('Namespaces', () => {
  test('Parse namespace from page name')
  test('Generate file path')
  test('Auto-create parent pages')
  test('Namespace queries')
})
```

### Integration Tests

#### 1. Migration End-to-End
```typescript
describe('Full Migration', () => {
  test('Convert sample graph')
  test('Validate all references work')
  test('Check all pages accessible')
  test('Verify backlinks generated')
})
```

#### 2. API Endpoints
```typescript
describe('Logseq API', () => {
  test('Create page with blocks')
  test('Update block content')
  test('Query namespace')
  test('Get backlinks')
  test('Resolve block reference')
})
```

### E2E Tests

#### 1. User Workflows
```typescript
describe('User Workflows', () => {
  test('Create new page in namespace')
  test('Add blocks with references')
  test('Navigate via backlinks')
  test('Search for blocks')
  test('View graph visualization')
})
```

### Test Data Requirements

1. **Small Graph** (10 pages, 100 blocks)
   - For rapid iteration and unit tests

2. **Medium Graph** (100 pages, 1000 blocks)
   - For integration tests and performance testing

3. **Large Graph** (1000+ pages, 10000+ blocks)
   - For stress testing and performance optimization

4. **Real Logseq Graph**
   - Import actual Logseq graph for compatibility testing

5. **Edge Cases**
   - Deep nesting (10+ levels)
   - Very long pages (1000+ blocks)
   - Heavy cross-referencing (100+ backlinks)
   - Special characters in page names
   - Unicode content

---

## Rollback Strategy

### Rollback Checkpoints

#### Checkpoint 1: After Schema Migration
**Can Rollback?** Yes
**Steps:**
1. Run schema rollback migration (drop new tables/columns)
2. Restore database from backup
3. Verify old system still works

#### Checkpoint 2: After Content Conversion
**Can Rollback?** Yes
**Steps:**
1. Flag `logseq_format = FALSE` on all nodes
2. Restore `content` field from backups
3. Delete all blocks
4. Verify old format renders correctly

#### Checkpoint 3: After UI Launch
**Can Rollback?** Partial
**Steps:**
1. Deploy previous UI version
2. Keep Logseq data intact (users may have created new content)
3. Dual-mode: Show warning for Logseq-format pages
4. Provide manual conversion back if needed

#### Checkpoint 4: After Full Migration
**Can Rollback?** No (without data loss)
**Steps:**
1. Cannot fully revert without losing new Logseq content
2. Only option: Export to Logseq format, users migrate to actual Logseq
3. Maintain read-only mode for old format

### Rollback Decision Criteria

**Trigger rollback if:**
- Data corruption detected (>1% of nodes)
- Critical functionality broken for >50% of users
- Performance degradation >300% (3x slower)
- Security vulnerability discovered
- User satisfaction drops significantly

**Do not rollback if:**
- Minor bugs affecting <10% of users
- Performance degradation <100% (can be optimized)
- Missing non-critical features
- Aesthetic issues

### Rollback Communication Plan

1. **Pre-rollback:**
   - Send user notification (email/in-app)
   - Explain reason for rollback
   - Estimate downtime
   - Backup user's Logseq-format content for manual preservation

2. **During rollback:**
   - Status page updates every 15 minutes
   - Technical details for interested users

3. **Post-rollback:**
   - Incident report
   - Plan for retry/alternative approach
   - Compensate affected users if applicable

---

## Guidelines for Implementation

### Code Organization

```
src/
├── lib/
│   ├── logseq/
│   │   ├── blocks/
│   │   │   ├── parser.ts          # Markdown → blocks
│   │   │   ├── serializer.ts      # Blocks → markdown
│   │   │   ├── crud.ts            # Block CRUD operations
│   │   │   └── uuid.ts            # UUID generation
│   │   ├── pages/
│   │   │   ├── namespace.ts       # Namespace utilities
│   │   │   ├── journals.ts        # Journal page logic
│   │   │   └── hierarchy.ts       # Parent generation
│   │   ├── references/
│   │   │   ├── parser.ts          # Extract refs from content
│   │   │   ├── resolver.ts        # Resolve refs to actual content
│   │   │   └── backlinks.ts       # Backlink indexing
│   │   ├── conversion/
│   │   │   ├── frontmatter.ts     # YAML → properties
│   │   │   ├── content.ts         # Markdown → blocks
│   │   │   └── migration.ts       # Full conversion pipeline
│   │   └── queries/
│   │       ├── blocks.ts          # Block queries
│   │       ├── pages.ts           # Page queries
│   │       └── graph.ts           # Graph queries
├── db/
│   ├── schema-logseq.ts           # Logseq-specific tables
│   └── migrations/
│       ├── 001_add_blocks_table.ts
│       └── 002_add_logseq_fields.ts
├── app/
│   ├── api/
│   │   ├── blocks/                # Block API endpoints
│   │   ├── pages/                 # Updated page endpoints
│   │   └── journals/              # Journal endpoints
└── components/
    ├── logseq/
    │   ├── block-editor.tsx       # Block editing
    │   ├── outliner.tsx           # Indent/outdent
    │   ├── references.tsx         # Show references/backlinks
    │   ├── graph.tsx              # Graph visualization
    │   └── namespace-browser.tsx  # Namespace tree

```

### Development Principles

1. **Backward Compatibility First**
   - Never break existing data
   - Support both formats during transition
   - Gradual deprecation, not sudden removal

2. **Incremental Migration**
   - Users opt-in to new format
   - Convert one page at a time
   - Validate each conversion

3. **Fail Gracefully**
   - If block parsing fails, fall back to old format
   - Show warnings, not errors
   - Provide manual fix tools

4. **Performance Conscious**
   - Index all lookup fields
   - Cache reference resolution
   - Lazy load large block trees
   - Paginate block queries

5. **Test Extensively**
   - Unit test every conversion function
   - Integration test full workflows
   - E2E test user journeys
   - Load test with large graphs

6. **Document Everything**
   - Migration guide for users
   - API changes for developers
   - Compatibility notes
   - Troubleshooting guide

---

## Next Steps

### Before Starting Implementation

1. **Review this document** and ask questions
2. **Make decisions** on all decision points (Section 5)
3. **Provide information** requested (Section 5)
4. **Approve/modify** implementation phases (Section 9)
5. **Prepare test data** (real Logseq graphs)
6. **Set up staging environment** for migration testing

### Once Approved, I Will:

1. **Create detailed technical specs** for each phase
2. **Set up database migrations**
3. **Implement core conversion utilities**
4. **Build test suite**
5. **Create migration scripts**
6. **Update API endpoints**
7. **Build new UI components**
8. **Write comprehensive documentation**

### Questions to Answer Before We Begin

1. What is your timeline for this migration?
2. Are there any features you DON'T want from Logseq?
3. Do you have existing Logseq graphs we can test with?
4. What is your risk tolerance (aggressive vs. cautious)?
5. Do you need Logseq import/export, or just compatibility?
6. Will users create new Logseq-format content, or just view?
7. What's the most important feature from Logseq for your users?
8. Can we do this migration in phases, or all at once?

---

## Appendix A: Logseq Format Examples

### Example 1: Simple Page

**File:** `pages/Getting Started.md`

```markdown
- title:: Getting Started
  tags:: documentation, tutorial
- # Welcome
- This is a simple page with blocks.
- Each line is a separate block.
  - This is nested
    - And this is more deeply nested
- Back to root level
```

### Example 2: Namespaced Page

**File:** `pages/guides___setup___installation.md`

```markdown
- title:: Installation Guide
  parent:: [[guides/setup]]
- # Installation
- Follow these steps to install the application.
- ## Prerequisites
- You will need:
  - Node.js 18+
  - PostgreSQL 14+
- ## Steps
- 1. Clone the repository
  - ```bash
    git clone https://github.com/example/repo.git
    ```
- 2. Install dependencies
  - ```bash
    npm install
    ```
- 3. Configure environment
  - See [[guides/setup/configuration]] for details
```

### Example 3: Page with References

**File:** `pages/Project Alpha.md`

```markdown
- title:: Project Alpha
  status:: in-progress
  lead:: [[John Doe]]
- # Project Alpha
- This project aims to build a new feature.
- ## Team
- Project lead: [[John Doe]]
- Developers:
  - [[Jane Smith]]
  - [[Bob Wilson]]
- ## Tasks
- TODO Review [[Project Alpha/Requirements]]
  id:: 656f8e3e-1111-4a6b-9f3e-0123456789ab
- DOING Implement core features
  id:: 656f8e3e-2222-4a6b-9f3e-0123456789ab
- LATER Write documentation
  id:: 656f8e3e-3333-4a6b-9f3e-0123456789ab
- ## Related
- See also: [[Project Beta]]
- Context: ((656f8e3e-4444-4a6b-9f3e-0123456789ab))
```

### Example 4: Journal Page

**File:** `journals/2025_11_12.md`

```markdown
- Tuesday, November 12th, 2025
- ## Daily Standup
- What I did yesterday:
  - Reviewed [[Project Alpha/Design]]
  - Fixed bug in [[Feature/Authentication]]
- What I'm doing today:
  - TODO Implement [[Feature/Dashboard]]
  - TODO Review PR for [[Project Beta]]
- Blockers:
  - Waiting for API keys from DevOps
- ## Notes
- Had a great idea for [[Feature Ideas/Real-time Sync]]
  id:: 656f8e3e-5555-4a6b-9f3e-0123456789ab
- ## Meeting: Planning Session
- Discussed Q1 goals
- Action items:
  - TODO [#A] Update [[Roadmap]]
  - TODO Schedule followup with [[Jane Smith]]
```

---

## Appendix B: SQL Queries for Analysis

```sql
-- Count of nodes by type
SELECT type, COUNT(*) as count
FROM nodes
GROUP BY type;

-- Deepest namespace level
SELECT MAX(depth) as max_depth
FROM nodes;

-- Average number of child nodes per folder
SELECT AVG(child_count) as avg_children
FROM (
  SELECT parent.id, COUNT(child.id) as child_count
  FROM nodes parent
  LEFT JOIN nodes child ON child.namespace LIKE parent.file_path || '%'
  WHERE parent.type = 'folder'
  GROUP BY parent.id
) subquery;

-- Nodes with most complex namespaces
SELECT slug, namespace, depth, LENGTH(namespace) - LENGTH(REPLACE(namespace, '/', '')) + 1 as levels
FROM nodes
ORDER BY levels DESC
LIMIT 20;

-- Content size distribution
SELECT
  CASE
    WHEN LENGTH(content) < 1000 THEN 'small'
    WHEN LENGTH(content) < 10000 THEN 'medium'
    WHEN LENGTH(content) < 100000 THEN 'large'
    ELSE 'xlarge'
  END as size_category,
  COUNT(*) as count,
  AVG(LENGTH(content)) as avg_size
FROM nodes
WHERE content IS NOT NULL
GROUP BY size_category;

-- Estimate block count (lines in content)
SELECT
  id,
  slug,
  namespace,
  LENGTH(content) - LENGTH(REPLACE(content, '\n', '')) + 1 as estimated_blocks
FROM nodes
WHERE content IS NOT NULL
ORDER BY estimated_blocks DESC
LIMIT 20;
```

---

## Appendix C: Glossary

**Block:** The atomic unit of content in Logseq. Each bullet point is a block.

**Page:** A top-level document containing blocks. Like a "file" but without folders.

**Namespace:** Virtual hierarchy created by forward slashes in page names (`guides/setup/intro`).

**Journal:** Daily note page, automatically created for each day.

**Block Reference:** A link to a specific block using `((block-uuid))`.

**Page Reference:** A link to a page using `[[page name]]`.

**Backlink:** Automatic reverse link showing which pages reference the current page.

**Embed:** Inline display of content from another page or block.

**Property:** Metadata in `key:: value` format, replacing YAML frontmatter.

**Outliner:** Block-based editor with indent/outdent functionality.

**Graph:** Visual representation of pages as nodes and references as edges.

**UUID:** Unique identifier for each block, used in block references.

---

**END OF DOCUMENT**

Please review this document thoroughly and provide:
1. Answers to decision points
2. Required information
3. Approval to proceed or requested changes
4. Timeline expectations
5. Any additional requirements or constraints

I'm ready to begin implementation once you've reviewed and approved this plan.
