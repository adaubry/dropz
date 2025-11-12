# Dropz Documentation

Welcome to Dropz! A high-performance markdown/documentation viewer built with Next.js 15, featuring namespace-based hierarchical organization and blazing-fast performance.

## Getting Started

### What is Dropz?

Dropz is a modern knowledge management system that transforms markdown files into a beautiful, performant web application. Originally based on the NextFaster e-commerce template, it has been completely transformed into a documentation and content management platform.

**Key Features:**
- 🚀 Next.js 15 with Partial Pre-rendering (PPR)
- ⚡ Sub-100ms page loads
- 📝 Full markdown & MDX support
- 🗂️ Namespace-based hierarchy (unlimited depth)
- 👤 User workspaces with editing mode
- 🔍 Full-text search
- 📊 Logseq-style markdown support

### Quick Start

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   pnpm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Add your Neon database URL
   ```

3. **Run migrations:**
   ```bash
   pnpm db:push
   ```

4. **Start development:**
   ```bash
   pnpm dev
   ```

Visit `http://localhost:3000` to see your site!

---

## Documentation Index

### 📘 Essential Reading

**Start Here:**
- **[CRUD Guidelines](./CRUD_GUIDELINES.md)** - Modern patterns for Create, Read, Update, Delete operations
  - Learn the architecture
  - Understand namespace-based hierarchy
  - See code examples
  - Follow best practices

**Core Features:**
- **[Markdown & MDX Guide](./MARKDOWN_AND_MDX.md)** - Complete guide to markdown rendering
  - Quick start examples
  - Advanced patterns
  - Performance tips
  - Troubleshooting

**Deployment:**
- **[Deploy to Vercel](./DEPLOY_TO_VERCEL.md)** - Production deployment guide
  - Environment setup
  - Database configuration
  - Performance optimization

**Performance:**
- **[Performance Guide](./PERFORMANCE_REVAMP.md)** - Optimization techniques
  - Partial Pre-rendering (PPR)
  - Caching strategies
  - Prefetching patterns

**User Features:**
- **[User Profiles & Editing](./USER_PROFILE_AND_EDITING.md)** - User system documentation
  - Profile management
  - Editing mode workflow
  - Backup & restore

**Special Features:**
- **[Logseq Integration](./LOGSEQ_DEMO.md)** - Logseq-style markdown support
  - Block references
  - Bidirectional links
  - Special syntax

### 📚 Archive

Historical documentation (for reference only):
- **[Migration Roadmap](./archive/migration_roadmap.md)** - Complete transformation from e-commerce to knowledge management
- **[Database Revamp](./archive/DATABASE_REVAMP_COMPLETE.md)** - Unified nodes system migration
- **[Hierarchy Fix](./archive/HIERARCHY_FIX.md)** - Namespace-based hierarchy implementation

---

## Architecture Overview

### Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19 RC
- TypeScript
- Tailwind CSS
- shadcn/ui components

**Backend:**
- PostgreSQL (Neon serverless)
- Drizzle ORM
- bcrypt for auth
- Iron Session

**Performance:**
- Partial Pre-rendering (PPR)
- React Server Components
- Unstable cache with tags
- Edge runtime where possible

### Project Structure

```
dropz/
├── docs/                      # 📖 All documentation (YOU ARE HERE)
│   ├── README.md              # This file
│   ├── CRUD_GUIDELINES.md     # CRUD patterns & best practices
│   ├── MARKDOWN_AND_MDX.md    # Markdown/MDX guide
│   ├── DEPLOY_TO_VERCEL.md    # Deployment guide
│   ├── PERFORMANCE_REVAMP.md  # Performance guide
│   ├── USER_PROFILE_AND_EDITING.md  # User features
│   ├── LOGSEQ_DEMO.md         # Logseq integration
│   └── archive/               # Historical docs
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (login)/           # Auth routes
│   │   ├── [planet]/          # Dynamic planet/content routes
│   │   ├── api/               # API endpoints (mutations)
│   │   ├── profile/           # User profile
│   │   └── ...
│   │
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── markdown-page.tsx  # Main markdown renderer
│   │   ├── mdx-*.tsx          # MDX components
│   │   ├── node-editor.tsx    # Content editor
│   │   └── ...
│   │
│   ├── db/                    # Database config & schema
│   │   └── schema.ts          # Drizzle schema
│   │
│   └── lib/                   # Utilities
│       ├── queries.ts         # 🎯 ALL database queries
│       ├── session.ts         # Auth helpers
│       ├── ingestion/         # Folder ingestion
│       └── ...
│
├── drizzle/                   # Database migrations
│   ├── schema.ts              # Schema definitions
│   └── migrations/            # SQL migrations
│
└── scripts/                   # CLI tools
    └── ingest.ts              # Folder ingestion script
```

### Database Schema

**Core Tables:**

1. **users** - User accounts
   ```typescript
   { id, username, password, email, avatar_url, bio }
   ```

2. **planets** - Top-level workspaces (one per user)
   ```typescript
   { id, name, slug, description, user_id }
   ```

3. **nodes** - Unified content (folders and files)
   ```typescript
   {
     id, planet_id, slug, title,
     namespace,      // "courses/cs101/week1"
     depth,          // 3
     type,           // 'file' | 'folder'
     content,        // Raw markdown
     metadata,       // JSONB frontmatter
     // ...
   }
   ```

4. **nodeLinks** - Bidirectional node connections

5. **editingSessions** - Track editing mode

6. **nodeBackups** - Backup snapshots for undo/restore

**Key Innovation: Namespace-Based Hierarchy**

Instead of using `parent_id` foreign keys (slow, inflexible), we use namespace strings:

```typescript
// Old way (rigid, slow)
{ id: 1, parent_id: null, name: "courses" }
{ id: 2, parent_id: 1, name: "cs101" }
{ id: 3, parent_id: 2, name: "week1" }

// New way (flexible, O(1) lookups)
{
  namespace: "courses/cs101",
  slug: "week1",
  depth: 3
}
```

Benefits:
- ✅ Supports unlimited depth
- ✅ O(1) path lookups with composite index
- ✅ No recursive queries needed
- ✅ Easy to restructure

See [CRUD_GUIDELINES.md](./CRUD_GUIDELINES.md) for details.

---

## Development Workflow

### Common Tasks

**Run development server:**
```bash
pnpm dev
```

**Build for production:**
```bash
pnpm build
```

**Run tests:**
```bash
pnpm test
```

**Database operations:**
```bash
pnpm db:push     # Push schema changes
pnpm db:studio   # Open Drizzle Studio
pnpm db:generate # Generate migrations
```

**Ingest markdown folder:**
```bash
pnpm ingest --planet=my-planet --path=./my-docs
```

### Code Style

- Use TypeScript strictly (no `any`)
- Follow existing naming conventions
- Place all queries in `src/lib/queries.ts`
- Use Server Components by default
- Cache reads, invalidate on mutations

### Git Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit
3. Push and create PR
4. Wait for review and merge

---

## CRUD Operations

All CRUD operations follow modern best practices. See [CRUD_GUIDELINES.md](./CRUD_GUIDELINES.md) for complete documentation.

**Quick Reference:**

**CREATE** - Upsert pattern, backup creation, frontmatter extraction
```typescript
POST /api/nodes
```

**READ** - O(1) lookups, aggressive caching, composite indexes
```typescript
getNodeByPath(planetSlug, pathSegments)
```

**UPDATE** - Backup-before-modify, cascade namespace changes
```typescript
PUT /api/nodes/[id]
```

**DELETE** - Backup creation, cascade via DB constraints
```typescript
DELETE /api/nodes/[id]
```

**Key Patterns:**
- All mutations require active editing session
- Backups created before every change
- Cache invalidation with revalidateTag
- Namespace updates cascade to children

---

## Performance

This codebase achieves:
- **100/100 PageSpeed score**
- **< 100ms TTFB**
- **< 500ms FCP**
- **$513.12 cost for 1M pageviews**

**How?**
1. **Partial Pre-rendering (PPR)** - Static shell + dynamic content
2. **Aggressive caching** - 2-hour cache on stable data
3. **Server Components** - Zero JS for static content
4. **Composite indexes** - O(1) database lookups
5. **Edge runtime** - Deploy close to users

See [PERFORMANCE_REVAMP.md](./PERFORMANCE_REVAMP.md) for details.

---

## API Reference

### Database Queries (`src/lib/queries.ts`)

**Planets:**
- `getPlanets()` - Get all planets
- `getPlanetBySlug(slug)` - Get specific planet
- `getPlanetById(id)` - Get by ID

**Nodes:**
- `getNodeByPath(planetSlug, pathSegments)` - O(1) path lookup
- `getNodeChildren(planetId, namespace, type?)` - Get children at level
- `getNodeBreadcrumbs(node)` - Build breadcrumb trail

**Search:**
- `searchNodes(planetId, query, limit)` - Full-text search
- `getSearchResults(searchTerm)` - Global search

**Related:**
- `getRelatedNodes(nodeId, limit)` - Via node_links
- `getSiblingNodes(node, limit)` - Same namespace

**Statistics:**
- `getNodeCount(planetId, namespace)` - Count descendants
- `getDropCount()` - Total file count

### API Endpoints

**Nodes:**
- `POST /api/nodes` - Create/upsert node
- `GET /api/nodes/[id]` - Get single node
- `PUT /api/nodes/[id]` - Update node
- `DELETE /api/nodes/[id]` - Delete node

**Planets:**
- `GET /api/planets` - Get user's planets
- `POST /api/planets` - Create planet
- `PUT /api/planets/[id]` - Update planet
- `DELETE /api/planets` - Delete planet

**Editing:**
- `POST /api/editing/start` - Start editing session
- `POST /api/editing/apply` - Apply changes
- `POST /api/editing/discard` - Discard changes

**User:**
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `DELETE /api/user/delete` - Delete account

---

## Troubleshooting

### Common Issues

**Build errors:**
```bash
# Clear cache and rebuild
rm -rf .next
pnpm build
```

**Database connection issues:**
```bash
# Verify .env.local has DATABASE_URL
# Check Neon dashboard for connection string
```

**Type errors:**
```bash
# Regenerate types
pnpm db:generate
```

**Slow queries:**
- Check indexes are created
- Use composite index on (planet_id, namespace, slug)
- Enable query logging in Drizzle

### Getting Help

1. Check documentation in `/docs`
2. Search existing issues on GitHub
3. Ask in project Discord/Slack
4. Create detailed issue with reproduction

---

## Contributing

We welcome contributions! Please:

1. Read this documentation first
2. Follow existing code patterns
3. Add tests for new features
4. Update documentation
5. Create detailed PR description

**Before submitting:**
- Run `pnpm test`
- Run `pnpm build`
- Check TypeScript: `pnpm type-check`
- Lint code: `pnpm lint`

---

## Deployment

### Vercel (Recommended)

See [DEPLOY_TO_VERCEL.md](./DEPLOY_TO_VERCEL.md) for complete guide.

**Quick deploy:**
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

**Environment Variables:**
```
DATABASE_URL=your-neon-connection-string
SESSION_SECRET=your-secret-key
NODE_ENV=production
```

### Other Platforms

Can deploy to any platform supporting Next.js 15:
- AWS Amplify
- Netlify
- Railway
- Fly.io

---

## License

See LICENSE file in project root.

---

## Credits

Built by:
- [@ethanniser](https://x.com/ethanniser)
- [@RhysSullivan](https://x.com/RhysSullivan)
- [@armans-code](https://x.com/ksw_arman)

Based on NextFaster template, transformed into Dropz.

---

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) in project root for version history and changes.

---

**Last Updated:** 2025-11-12

**Have questions?** Check the docs above or create an issue on GitHub!
