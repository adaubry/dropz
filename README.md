# Dropz

> A high-performance markdown/documentation viewer with namespace-based hierarchical organization.

🚀 **Built with Next.js 15, PostgreSQL, and modern web technologies.**

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Add your DATABASE_URL

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

Visit `http://localhost:3000` to see your site!

## Features

- ⚡ **Blazing Fast** - Sub-100ms page loads with Partial Pre-rendering
- 📝 **Markdown & MDX** - Full support with syntax highlighting
- 🗂️ **Unlimited Depth** - Namespace-based hierarchy (no depth limits)
- 👤 **User Workspaces** - Personal planets with editing mode
- 🔍 **Full-Text Search** - Find content instantly
- 📊 **Logseq Support** - Block references and bidirectional links

## Documentation

📖 **[Complete Documentation](./docs/README.md)**

Essential guides:
- **[CRUD Guidelines](./docs/CRUD_GUIDELINES.md)** - Modern patterns and best practices
- **[Performance Guidelines](./docs/PERFORMANCE_GUIDELINES.md)** - Complete optimization guide
- **[Markdown & MDX Guide](./docs/MARKDOWN_AND_MDX.md)** - Complete rendering guide
- **[Deploy to Vercel](./docs/DEPLOY_TO_VERCEL.md)** - Production deployment
- **[Changelog](./CHANGELOG.md)** - Version history

## Tech Stack

**Frontend:**
- Next.js 15 with App Router
- React 19 RC
- TypeScript
- Tailwind CSS + shadcn/ui

**Backend:**
- PostgreSQL (Neon)
- Drizzle ORM
- Iron Session auth

**Performance:**
- Partial Pre-rendering (PPR)
- Server Components
- Edge runtime
- Aggressive caching

## Architecture Highlights

### Namespace-Based Hierarchy

Unlike traditional parent-child relationships, Dropz uses namespace strings for unlimited flexibility:

```typescript
{
  namespace: "courses/cs101/week1/lectures",
  slug: "intro-to-algorithms",
  depth: 4
}
```

**Benefits:**
- ✅ O(1) path lookups (no recursion!)
- ✅ Unlimited depth support
- ✅ Easy restructuring
- ✅ Simple queries

See [CRUD Guidelines](./docs/CRUD_GUIDELINES.md) for details.

### Performance

Achieves industry-leading performance:
- **100/100 PageSpeed score**
- **< 100ms TTFB**
- **< 500ms FCP**
- **$513.12 for 1M pageviews**

## Project Structure

```
dropz/
├── docs/               # 📖 All documentation
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # React components
│   ├── db/            # Database schema
│   └── lib/           # Utilities & queries
├── drizzle/           # Database migrations
└── scripts/           # CLI tools
```

## Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio
pnpm db:generate      # Generate migrations

# Testing
pnpm test             # Run tests
pnpm type-check       # Check TypeScript
pnpm lint             # Lint code

# Ingestion
pnpm ingest --planet=my-planet --path=./docs
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables:
   - `DATABASE_URL` - Neon connection string
   - `SESSION_SECRET` - Random secret key
4. Deploy!

See [Deploy to Vercel](./docs/DEPLOY_TO_VERCEL.md) for complete guide.

### Other Platforms

Compatible with any platform supporting Next.js 15:
- AWS Amplify
- Netlify
- Railway
- Fly.io

## Contributing

We welcome contributions! Please:

1. Read the [documentation](./docs/README.md)
2. Follow existing code patterns
3. Add tests for new features
4. Update documentation
5. Create detailed PR

**Before submitting:**
```bash
pnpm test
pnpm build
pnpm type-check
pnpm lint
```

## Credits

**Dropz** is created and maintained by:
- [@adaubry](https://x.com/adaubry) - Creator & Lead Developer
- [@claude](https://claude.ai) - AI Development Partner

**Special Thanks:**
- [@ethanniser](https://x.com/ethanniser) - For creating NextFaster, which served as a major influence and inspiration for Dropz's architecture and performance patterns

Dropz was inspired by the NextFaster template's innovative approach to performance optimization and modern Next.js patterns.

## License

See [LICENSE](./LICENSE) for details.

---

**[📖 View Full Documentation](./docs/README.md)** | **[📝 Changelog](./CHANGELOG.md)** | **[🐛 Report Issues](https://github.com/adaubry/dropz/issues)**
