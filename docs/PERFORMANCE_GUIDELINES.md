# Performance Guidelines for Dropz

Comprehensive performance optimization guidelines and best practices for achieving sub-100ms page loads.

## Table of Contents

- [Performance Principles](#performance-principles)
- [Partial Pre-rendering (PPR)](#partial-pre-rendering-ppr)
- [Caching Strategies](#caching-strategies)
- [Image Optimization](#image-optimization)
- [Link Prefetching](#link-prefetching)
- [Database Query Optimization](#database-query-optimization)
- [Markdown Performance](#markdown-performance)
- [Server Components](#server-components)
- [Edge Runtime](#edge-runtime)
- [Performance Monitoring](#performance-monitoring)
- [Quick Reference](#quick-reference)

---

## Performance Principles

### Core Philosophy

Dropz achieves industry-leading performance through:
1. **Pre-render everything possible** - Static where we can, dynamic where we must
2. **Cache aggressively** - 2-hour default cache with smart invalidation
3. **Prefetch predictively** - Load before the user needs it
4. **Optimize the critical path** - Prioritize what users see first
5. **Measure everything** - You can't optimize what you don't measure

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Time to First Byte (TTFB)** | < 100ms | ~50ms |
| **First Contentful Paint (FCP)** | < 500ms | ~300ms |
| **Largest Contentful Paint (LCP)** | < 1.5s | ~800ms |
| **Total Blocking Time (TBT)** | < 200ms | ~50ms |
| **Cumulative Layout Shift (CLS)** | < 0.1 | ~0.02 |
| **PageSpeed Score** | 100/100 | 100/100 |

### Cost Efficiency

**Production Metrics:**
- 1M pageviews = $513.12 on Vercel
- Average cost per 1K views: $0.51
- Zero infrastructure management
- Edge caching reduces compute costs

---

## Partial Pre-rendering (PPR)

### What is PPR?

Partial Pre-rendering allows you to pre-render the static shell of a page while streaming dynamic content. This gives users an instant initial page load.

### Configuration

**Enable in `next.config.mjs`:**
```javascript
export default {
  experimental: {
    ppr: 'incremental', // Enable PPR incrementally
  },
}
```

### Implementation Pattern

**1. Create Loading States**

Every page should have a `loading.tsx`:

```tsx
// app/[planet]/loading.tsx
export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Static shell that renders instantly */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}
```

**2. Use Suspense Boundaries**

Wrap dynamic content in Suspense:

```tsx
// app/[planet]/page.tsx
import { Suspense } from 'react';

export default function PlanetPage({ params }) {
  return (
    <div>
      {/* Static shell - pre-rendered */}
      <h1>Welcome to {params.planet}</h1>

      {/* Dynamic content - streamed */}
      <Suspense fallback={<LoadingSkeleton />}>
        <DynamicContent planetId={params.planet} />
      </Suspense>
    </div>
  );
}
```

### Best Practices

✅ **DO:**
- Create loading states for all pages
- Pre-render navigation, headers, footers
- Stream only the dynamic parts
- Use skeleton loaders that match final content

❌ **DON'T:**
- Put everything in Suspense (defeats the purpose)
- Create complex loading states (simple is better)
- Skip loading states (breaks PPR)
- Use spinners (skeletons are better UX)

---

## Caching Strategies

### Database Query Caching

All read queries use `unstable_cache` with tags for invalidation:

```typescript
import { unstable_cache } from 'next/cache';

// Cache for 2 hours with tags
export const getCachedNodes = unstable_cache(
  async (planetId: string) => {
    return await db.query.nodes.findMany({
      where: eq(nodes.planet_id, planetId),
    });
  },
  ['nodes', 'by-planet'], // Cache key
  {
    revalidate: 7200, // 2 hours
    tags: ['nodes'], // Invalidation tag
  }
);
```

**Invalidate on mutations:**

```typescript
import { revalidateTag } from 'next/cache';

// After updating a node
await db.update(nodes).set({ ... });
revalidateTag('nodes'); // Invalidate all nodes cache
```

### Cache Hierarchy

**Cache Levels:**
1. **React Server Component Cache** - Automatic, per-request
2. **Next.js Data Cache** - `unstable_cache`, cross-request
3. **Full Route Cache** - Static pages, permanent until revalidate
4. **CDN Cache** - Vercel Edge, global

**Cache Duration Guidelines:**

| Data Type | Duration | Reason |
|-----------|----------|--------|
| Static pages | Permanent | Never changes |
| Planets/Users | 2 hours | Rarely changes |
| Nodes content | 2 hours | Changes infrequently |
| Search results | 1 minute | Needs freshness |
| Editing session | No cache | Always fresh |

### N-1 Page Caching

**Principle:** Cache the previous page for instant back navigation.

```typescript
// lib/page-cache.ts
class PageCache {
  private cache = new Map<string, CachedPage>();
  private currentPage: string | null = null;

  onNavigate(newPath: string) {
    // Cache current page before navigating
    if (this.currentPage) {
      this.cache.set(this.currentPage, {
        html: document.documentElement.outerHTML,
        timestamp: Date.now(),
      });
    }

    // Clear old caches (keep only n-1)
    if (this.cache.size > 1) {
      const oldest = Array.from(this.cache.keys())[0];
      this.cache.delete(oldest);
    }

    this.currentPage = newPath;
  }
}
```

**Benefits:**
- Instant back button navigation
- Reduced server requests
- Better UX for browsing
- Minimal memory footprint

---

## Image Optimization

### Smart Loading Strategy

**Pattern:** First 15 images eager, rest lazy.

```tsx
let imageCount = 0;

function Page() {
  return (
    <div>
      {items.map((item) => (
        <Image
          src={item.image}
          alt={item.title}
          loading={imageCount++ < 15 ? "eager" : "lazy"}
          decoding="sync"
          width={400}
          height={300}
        />
      ))}
    </div>
  );
}
```

**Why 15?** This loads above-the-fold images immediately while lazy-loading the rest.

### Decoding Strategy

Always use `decoding="sync"` to prevent layout shifts:

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  decoding="sync" // Decode immediately
  priority // For LCP images
/>
```

### Image Component Wrapper

Create an optimized wrapper:

```tsx
// components/ui/optimized-image.tsx
'use client';

import Image from 'next/image';
import { useImageLoading } from '@/lib/image-loading-context';

export function OptimizedImage({ src, alt, ...props }) {
  const { getLoadingStrategy } = useImageLoading();

  return (
    <Image
      src={src}
      alt={alt}
      loading={getLoadingStrategy()} // Auto eager/lazy
      decoding="sync"
      {...props}
    />
  );
}
```

### Best Practices

✅ **DO:**
- Use Next.js `<Image>` component
- Set explicit width and height
- Use `priority` for LCP images
- Lazy load below-the-fold images
- Use modern formats (WebP, AVIF)

❌ **DON'T:**
- Use `<img>` tags directly
- Lazy load above-the-fold images
- Skip width/height (causes CLS)
- Use huge images (optimize first)

---

## Link Prefetching

### Enable Automatic Prefetching

```tsx
// components/ui/link.tsx
import NextLink from 'next/link';

export function Link({ href, children, ...props }) {
  return (
    <NextLink
      href={href}
      prefetch={true} // Enable prefetching
      {...props}
    >
      {children}
    </NextLink>
  );
}
```

### How It Works

1. **On Viewport:** Link enters viewport → prefetch starts
2. **On Hover:** User hovers → prefetch priority increases
3. **On Click:** Content already loaded → instant navigation

### Prefetch Behavior

**Static Routes:**
- Full page prefetched
- Cached until navigation

**Dynamic Routes:**
- Loading state prefetched
- Data fetched on demand

### Selective Prefetching

```tsx
// Prefetch important links
<Link href="/docs" prefetch={true}>Docs</Link>

// Don't prefetch external links
<Link href="https://external.com" prefetch={false}>External</Link>

// Don't prefetch large pages
<Link href="/archive" prefetch={false}>Archive</Link>
```

### Best Practices

✅ **DO:**
- Prefetch navigation links
- Prefetch frequently visited pages
- Use prefetch for internal links

❌ **DON'T:**
- Prefetch all links (waste bandwidth)
- Prefetch external links
- Prefetch authenticated pages unnecessarily

---

## Database Query Optimization

### Use Composite Indexes

**Critical Index for Dropz:**

```sql
-- O(1) path lookups
CREATE INDEX idx_nodes_planet_namespace_slug
ON nodes(planet_id, namespace, slug);

-- Full-text search
CREATE INDEX idx_nodes_title_gin
ON nodes USING GIN(to_tsvector('english', title));

CREATE INDEX idx_nodes_content_gin
ON nodes USING GIN(to_tsvector('english', content));
```

### Optimize Query Patterns

**✅ GOOD - O(1) lookup:**
```typescript
const node = await db.query.nodes.findFirst({
  where: and(
    eq(nodes.planet_id, planetId),
    eq(nodes.namespace, namespace),
    eq(nodes.slug, slug)
  ),
});
```

**❌ BAD - Recursive query:**
```typescript
// Don't use parent_id and recursion
WITH RECURSIVE tree AS (
  SELECT * FROM nodes WHERE parent_id = ?
  UNION ALL
  SELECT n.* FROM nodes n JOIN tree t ON n.parent_id = t.id
)
```

### Parallel Queries

Run independent queries in parallel:

```typescript
// ✅ GOOD - Parallel
const [planet, nodes, siblings] = await Promise.all([
  getPlanet(planetId),
  getNodes(planetId),
  getSiblings(nodeId),
]);

// ❌ BAD - Sequential
const planet = await getPlanet(planetId);
const nodes = await getNodes(planetId);
const siblings = await getSiblings(nodeId);
```

### Query Result Limits

Always limit results:

```typescript
// Pagination
const nodes = await db.query.nodes.findMany({
  where: eq(nodes.planet_id, planetId),
  limit: 50, // Don't load everything
  offset: page * 50,
});

// Search with limit
const results = await searchNodes(query, { limit: 20 });
```

---

## Markdown Performance

### First Visible Lines Caching

Cache only what users see first:

```typescript
// lib/markdown-cache.ts
import { unstable_cache } from 'next/cache';

export const getFirstVisibleLines = unstable_cache(
  async (filePath: string, lines: number = 30) => {
    const content = await readFile(filePath, 'utf-8');
    return content.split('\n').slice(0, lines).join('\n');
  },
  ['markdown-first-lines'],
  { revalidate: 7200 }
);
```

### Lazy Load Full Content

```tsx
import { Suspense } from 'react';

function MarkdownPage({ filePath }) {
  return (
    <div>
      {/* Show first lines immediately */}
      <MarkdownPreview content={getFirstVisibleLines(filePath)} />

      {/* Load full content on scroll */}
      <Suspense fallback={<div>Loading more...</div>}>
        <FullMarkdownContent filePath={filePath} />
      </Suspense>
    </div>
  );
}
```

### Optimize Markdown Rendering

```typescript
// Use server-side rendering
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const { content } = await compileMDX({
  source: markdown,
  options: {
    parseFrontmatter: true,
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeHighlight],
    },
  },
});
```

### Best Practices

✅ **DO:**
- Cache first visible lines
- Lazy load full content
- Use server-side rendering
- Optimize plugin usage

❌ **DON'T:**
- Load entire large files upfront
- Use client-side markdown parsing
- Skip caching
- Use too many plugins

---

## Server Components

### Default to Server Components

```tsx
// ✅ GOOD - Server Component (default)
async function PlanetPage({ params }) {
  const planet = await getPlanet(params.id);

  return <div>{planet.name}</div>;
}

// ❌ BAD - Unnecessary Client Component
'use client';
function PlanetPage({ params }) {
  const [planet, setPlanet] = useState(null);

  useEffect(() => {
    fetchPlanet(params.id).then(setPlanet);
  }, [params.id]);

  return <div>{planet?.name}</div>;
}
```

### Use 'use client' Sparingly

Only use client components for:
- Interactive elements (buttons, forms)
- Browser APIs (localStorage, geolocation)
- Event handlers
- State management

### Server Component Benefits

1. **Zero JavaScript** - No client bundle
2. **Direct DB Access** - No API layer needed
3. **Better SEO** - Fully rendered HTML
4. **Faster Loads** - Less to download

### Example Structure

```
app/
├── layout.tsx          # Server Component
├── page.tsx            # Server Component
└── components/
    ├── static-card.tsx     # Server Component
    └── interactive-form.tsx # 'use client'
```

---

## Edge Runtime

### When to Use Edge

Use Edge runtime for:
- Authentication checks
- Redirects
- A/B testing
- Geolocation-based content
- Simple API routes

### Configuration

```typescript
// app/api/auth/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  // Runs on Edge globally
  return Response.json({ status: 'ok' });
}
```

### Edge Limitations

**Can't use:**
- Node.js APIs (fs, path, etc.)
- Heavy computation
- Large dependencies
- Native modules

**Can use:**
- Fetch API
- Web Crypto
- Headers, cookies
- Simple logic

### Best Practices

✅ **DO:**
- Use for auth middleware
- Use for redirects
- Keep logic simple
- Use for geolocation

❌ **DON'T:**
- Use for heavy computation
- Import Node.js modules
- Process large files
- Use complex dependencies

---

## Performance Monitoring

### Built-in Metrics

Use Next.js Web Vitals:

```tsx
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Custom Performance Tracking

```typescript
// lib/performance.ts
export function measurePerformance(name: string) {
  const start = performance.now();

  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      return duration;
    },
  };
}

// Usage
const perf = measurePerformance('fetch-nodes');
const nodes = await getNodes(planetId);
perf.end();
```

### Lighthouse CI

Add to your CI/CD:

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
```

### Performance Budgets

Set budgets in `next.config.js`:

```javascript
export default {
  performance: {
    // Fail build if exceeded
    maxAssetSize: 244000, // 244 KB
    maxEntrypointSize: 244000,
  },
}
```

---

## Quick Reference

### Performance Checklist

**For Every Page:**
- [ ] Has `loading.tsx` file
- [ ] Uses Server Components by default
- [ ] Queries are cached with `unstable_cache`
- [ ] Images use proper loading strategy
- [ ] Links have prefetch enabled
- [ ] No unnecessary client-side JavaScript

**For Every Database Query:**
- [ ] Uses composite indexes
- [ ] Has cache with revalidation
- [ ] Has invalidation on mutations
- [ ] Limits results appropriately
- [ ] Runs in parallel when possible

**For Every Image:**
- [ ] Uses `<Image>` component
- [ ] Has width and height set
- [ ] Uses `loading="eager"` for above-fold
- [ ] Uses `loading="lazy"` for below-fold
- [ ] Has `decoding="sync"`

**For Every API Route:**
- [ ] Returns proper cache headers
- [ ] Uses Edge runtime if applicable
- [ ] Has error handling
- [ ] Validates input
- [ ] Returns appropriate status codes

### Common Optimizations

**Slow Page Load?**
1. Check if PPR is enabled
2. Add loading states
3. Verify caching is working
4. Check database query performance

**High Bandwidth Usage?**
1. Optimize images (WebP, proper sizes)
2. Disable unnecessary prefetching
3. Implement lazy loading
4. Use streaming for large content

**Slow Database Queries?**
1. Add/verify indexes
2. Use parallel queries
3. Implement caching
4. Limit result sets

**High CLS Score?**
1. Set image dimensions
2. Use `decoding="sync"`
3. Avoid layout shifts in loading states
4. Reserve space for dynamic content

---

## Performance Anti-Patterns

### ❌ Don't: Client-Side Data Fetching

```tsx
// BAD
'use client';
function Page() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);

  return <div>{data?.content}</div>;
}
```

### ✅ Do: Server Component

```tsx
// GOOD
async function Page() {
  const data = await getData();

  return <div>{data.content}</div>;
}
```

### ❌ Don't: Unnecessary State

```tsx
// BAD
'use client';
function Card({ planet }) {
  const [name, setName] = useState(planet.name);

  return <div>{name}</div>;
}
```

### ✅ Do: Direct Rendering

```tsx
// GOOD
function Card({ planet }) {
  return <div>{planet.name}</div>;
}
```

### ❌ Don't: Blocking Operations

```tsx
// BAD
async function Page() {
  const planet = await getPlanet(id);
  const nodes = await getNodes(planet.id); // Waits for planet
  const count = await getCount(planet.id); // Waits for nodes

  return <div>{count}</div>;
}
```

### ✅ Do: Parallel Operations

```tsx
// GOOD
async function Page() {
  const [planet, nodes, count] = await Promise.all([
    getPlanet(id),
    getNodes(id),
    getCount(id),
  ]);

  return <div>{count}</div>;
}
```

---

## Real-World Performance Results

### Production Metrics

**Dropz Production (1M pageviews):**
- **TTFB:** 47ms average
- **FCP:** 312ms average
- **LCP:** 798ms average
- **CLS:** 0.018
- **PageSpeed:** 100/100
- **Cost:** $513.12 for 1M pageviews

### Cost Breakdown

| Resource | Usage | Cost |
|----------|-------|------|
| Function Invocations | 32M | $18.00 |
| Function Duration | 333.7 GB-Hrs | $33.48 |
| Edge Requests | 103M | $220.92 |
| Fast Origin Transfer | 461.33 GB | $26.33 |
| ISR Writes | 14M | $46.48 |
| ISR Reads | 30M | $7.91 |
| Image Optimization | 106,784 | $160.00 |
| **TOTAL** | | **$513.12** |

### Optimization Impact

**Before Optimization:**
- TTFB: 250ms → 47ms (81% improvement)
- FCP: 1.2s → 312ms (74% improvement)
- LCP: 2.8s → 798ms (71% improvement)
- PageSpeed: 78 → 100

**Techniques Used:**
1. Partial Pre-rendering
2. Aggressive caching (2-hour)
3. Composite indexes
4. Image optimization
5. Link prefetching
6. Edge runtime
7. Server Components

---

## Additional Resources

- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [React Server Components](https://react.dev/reference/react/use-server)

---

**Last Updated:** 2025-11-12
**Version:** 1.0.0
