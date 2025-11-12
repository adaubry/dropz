# Changelog

All notable changes to Dropz will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive CRUD guidelines documentation
- Modern markdown and MDX guide consolidating all MDX docs
- Changelog for version tracking
- Archive directory for historical documentation
- History-based breadcrumb navigation tracking last pages visited

### Changed
- Complete documentation reorganization in `/docs`
- Updated robots.txt for documentation site (removed e-commerce references)
- Improved docs/README.md as navigation hub
- Moved completed migration docs to `/docs/archive`
- Breadcrumbs now show navigation history (last 3 pages) with ".." home link instead of namespace path

### Removed
- Duplicate documentation files from root directory
- Legacy e-commerce search API (`/api/search/route.ts`)
- Backward compatibility exports (`getCollections`, `getProductCount`)
- Commented-out rate limiting code (`rate-limit.ts`)
- Empty `curriculum/` directory
- Redundant MDX documentation files (consolidated into single guide)
- Search feature completely removed (search-dropdown component, search functions, search documentation)

---

## [2.0.0] - 2024-11-XX - Clarity Revamp

### Major Changes

This version represents a major clarity overhaul of the entire codebase.

#### Documentation
- **NEW:** Unified documentation structure in `/docs`
- **NEW:** Modern CRUD guidelines with examples and best practices
- **NEW:** Consolidated Markdown & MDX guide
- **IMPROVED:** Clear navigation and organization
- **REMOVED:** All duplicate and outdated documentation

#### Code Cleanup
- **REMOVED:** All e-commerce legacy code
- **REMOVED:** Unused rate limiting system
- **IMPROVED:** Cleaner codebase with modern patterns

#### Breaking Changes
- Search API removed (was broken and using old schema)
- Backward compatibility exports removed from `queries.ts`

---

## [1.5.0] - Performance Revamp

### Added
- Partial Pre-rendering (PPR) support
- Advanced caching strategies with `unstable_cache`
- Prefetching patterns for navigation
- Performance monitoring and optimization

### Changed
- Improved page load times (< 100ms TTFB)
- Optimized database queries with composite indexes
- Enhanced edge runtime usage

### Performance Metrics
- 100/100 PageSpeed score
- Sub-100ms Time to First Byte
- $513.12 cost for 1M pageviews

---

## [1.4.0] - User Profiles & Editing Mode

### Added
- User profile management system
- Avatar upload support
- Bio and personal information fields
- Editing mode with session tracking
- Backup and restore functionality
- Apply/discard changes workflow

### Changed
- Enhanced user authentication flow
- Improved session management

---

## [1.3.0] - Logseq Integration

### Added
- Logseq-style markdown support
- Block references
- Bidirectional links
- Special Logseq syntax parsing
- `remark-logseq` plugin for markdown processing

---

## [1.2.0] - Hierarchy Fix

### Added
- Namespace-based hierarchy system (unlimited depth)
- Composite indexes for O(1) path lookups
- Breadcrumb building from namespace

### Changed
- **MAJOR:** Migrated from parent_id to namespace-based storage
- Improved query performance (no more recursive CTEs)
- Simplified data model

### Removed
- Old 5-level hierarchy limitation (Ocean/Sea/River/Drop)
- parent_id foreign key constraints

---

## [1.1.0] - Database Revamp

### Added
- Unified `nodes` table for all content
- `nodeLinks` table for bidirectional connections
- `editingSessions` table for edit tracking
- `nodeBackups` table for undo/restore
- Namespace-based flat storage

### Changed
- **MAJOR:** Consolidated 4 separate tables into single `nodes` table
- Improved schema design for flexibility
- Better support for arbitrary hierarchy depth

### Removed
- Old tables: `products`, `collections`, `categories`, `subcategories`
- Rigid 4-level hierarchy

---

## [1.0.0] - Initial Transformation

### Added
- Next.js 15 with App Router
- React 19 RC support
- PostgreSQL with Drizzle ORM
- User authentication with Iron Session
- Markdown/MDX rendering system
- Folder ingestion system
- Planet workspace concept

### Changed
- **MAJOR:** Transformed from e-commerce template to knowledge management system
- Repurposed product pages as markdown content
- Adapted collections to planet workspaces

### Removed
- E-commerce functionality (cart, checkout, payments)
- Product inventory management
- Shopping features

---

## [0.x.x] - NextFaster (E-commerce Template)

### Original Features
- High-performance e-commerce template
- 1M+ products with AI-generated content
- Vercel Blob for image storage
- Advanced product filtering
- Shopping cart functionality
- Next.js 15 with Partial Pre-rendering

**Note:** This is the original NextFaster template that Dropz was built upon.

---

## Version History Summary

| Version | Date | Description |
|---------|------|-------------|
| 2.0.0 | 2024-11-12 | Clarity revamp - docs reorganization, code cleanup |
| 1.5.0 | 2024-XX-XX | Performance revamp - PPR, caching, optimization |
| 1.4.0 | 2024-XX-XX | User profiles & editing mode |
| 1.3.0 | 2024-XX-XX | Logseq integration |
| 1.2.0 | 2024-XX-XX | Namespace-based hierarchy |
| 1.1.0 | 2024-XX-XX | Database revamp - unified nodes |
| 1.0.0 | 2024-XX-XX | Initial transformation to Dropz |
| 0.x.x | 2024-XX-XX | NextFaster e-commerce template |

---

## Migration Guides

### Migrating to 2.0.0

**Documentation:**
- All documentation is now in `/docs` directory
- Check `/docs/README.md` for navigation
- Historical docs moved to `/docs/archive`

**Code Changes:**
- If using `getCollections()`, replace with `getPlanets()`
- If using `getProductCount()`, replace with `getDropCount()`
- Search API removed - implement new search using `searchNodes()` from `queries.ts`

**No Database Changes:** This is a documentation and code cleanup release.

### Migrating to 1.2.0 (Namespace System)

**Database Migration Required:**
```bash
pnpm db:push
```

**Code Changes:**
- Update all queries to use namespace instead of parent_id
- Use `getNodeByPath()` for O(1) lookups
- Build breadcrumbs with `getNodeBreadcrumbs()`

### Migrating to 1.1.0 (Unified Nodes)

**Database Migration Required:**
```bash
# Backup your database first!
pnpm db:push
```

**Major Breaking Changes:**
- All content now in single `nodes` table
- Old table references must be updated
- Update all queries to use new schema

---

## Deprecations

### Deprecated in 2.0.0
- ❌ `getCollections()` - Use `getPlanets()` instead
- ❌ `getProductCount()` - Use `getDropCount()` instead
- ❌ Search API endpoint - Use `searchNodes()` function instead

### Deprecated in 1.2.0
- ❌ `parent_id` field - Use `namespace` instead
- ❌ Recursive hierarchy queries - Use namespace-based lookups
- ❌ Fixed 5-level hierarchy - Use unlimited depth with namespace

### Deprecated in 1.1.0
- ❌ Separate content tables - Use unified `nodes` table
- ❌ Product/Collection terminology - Use Node/Planet terminology

---

## Upcoming Features

### Planned for 2.1.0
- [ ] Full-text search with PostgreSQL GIN indexes
- [ ] Advanced markdown syntax support
- [ ] Collaborative editing features
- [ ] Real-time updates with WebSockets

### Planned for 2.2.0
- [ ] Plugin system for extensibility
- [ ] Custom themes support
- [ ] Advanced analytics and insights
- [ ] Export to multiple formats (PDF, EPUB, etc.)

### Under Consideration
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] Self-hosted option improvements
- [ ] Multi-language support

---

## Contributors

**Dropz** is created and maintained by:
- [@adaubry](https://x.com/adaubry) - Creator & Lead Developer
- [@claude](https://claude.ai) - AI Development Partner

**Special Thanks:**
- [@ethanniser](https://x.com/ethanniser) - For creating NextFaster, which served as a major influence and inspiration for Dropz's architecture and performance patterns

---

## Links

- [Documentation](./docs/README.md)
- [GitHub Repository](https://github.com/adaubry/dropz)
- [Report Issues](https://github.com/adaubry/dropz/issues)
- [Contributing Guide](./docs/README.md#contributing)

---

**Last Updated:** 2025-11-12
