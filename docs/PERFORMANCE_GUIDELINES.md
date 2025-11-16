# Performance Guidelines for Dropz

Comprehensive performance optimization guidelines and best practices for achieving sub-100ms page loads.

> **Status:** Post-MVP Stabilization Phase
> **Next.js Version:** 16 (using `"use cache"` directive)
> **Last Updated:** 2025-11-16

## Table of Contents

- [Performance Principles](#performance-principles)
- [Partial Pre-rendering (PPR)](#partial-pre-rendering-ppr)
- [Caching Strategies](#caching-strategies)
- [Image Optimization](#image-optimization)
- [Link Prefetching](#link-prefetching)
- [Database Query Optimization](#database-query-optimization)
- [Pre-Rendered Content Performance](#pre-rendered-content-performance)
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

### Function-Level Caching (Next.js 16)

All read queries use `"use cache"` directive for automatic caching:

```typescript
// Next.js 16: Function-level caching
"use cache";

export async function getCachedNodes(planetId: string) {
  return await db.query.nodes.findMany({
    where: eq(nodes.planet_id, planetId),
  });
}

// Configure cache behavior at file level
export const revalidate = 7200; // 2 hours
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
1. **Function Cache** - `"use cache"` directive, automatic
2. **React Server Component Cache** - Automatic, per-request deduplication
3. **Full Route Cache** - Static pages, permanent until revalidate
4. **CDN Cache** - Vercel Edge, global

**Cache Duration Guidelines:**

| Data Type | Duration | Reason |
|-----------|----------|--------|
| Static pages | Permanent | Never changes |
| Planets/Users | 2 hours | Rarely changes |
| Nodes content | 2 hours | Changes infrequently |
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
```

---

## Pre-Rendered Content Performance

### Critical Pattern: Store Pre-Rendered HTML

**🔑 CORE PRINCIPLE:** All content is pre-rendered during ingestion and stored as HTML in the database.

This is a fundamental performance pattern in Dropz:

1. **Upload** → Logseq markdown files uploaded via API
2. **Parse** → Extract frontmatter, process with unified/remark
3. **Render** → Convert to HTML during ingestion (not on read!)
4. **Store** → Save `parsed_html` in database
5. **Serve** → Return pre-rendered HTML instantly (< 50ms)

This ensures users ALWAYS see content within 100ms, even for complex markdown.

### Implementation Pattern

```tsx
// Server Component - No markdown processing needed!
async function MarkdownPage({ planetSlug, pathSegments }) {
  // Get node with pre-rendered HTML
  const node = await getNodeByPath(planetSlug, pathSegments);

  if (!node || !node.parsed_html) {
    notFound();
  }

  return (
    <div>
      {/* Pre-rendered HTML - instant display */}
      <StaticContentRenderer html={node.parsed_html} />
    </div>
  );
}
```

### Ingestion-Time Rendering

The rendering happens during upload, not on every request:

```typescript
// api/ingest-logseq/route.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import rehypeHighlight from 'rehype-highlight';

async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return String(result);
}

// Process during ingestion
const parsed_html = await markdownToHtml(markdownContent);

// Store in database
await db.insert(nodes).values({
  // ... other fields
  parsed_html,  // Pre-rendered HTML
});
```

### Performance Impact

**Comparison:**

| Approach | TTFB | Compute | Caching Complexity |
|----------|------|---------|-------------------|
| **On-Demand Rendering** | 300-500ms | Every request | Complex (markdown + HTML) |
| **Pre-Rendered HTML** | 50-100ms | Once at ingestion | Simple (HTML only) |

**Benefits:**
- ✅ **3.6x faster** page loads vs dynamic parsing
- ✅ **Zero markdown processing** on reads
- ✅ **Simpler caching** - just cache HTML
- ✅ **Lower compute costs** - render once, serve thousands
- ✅ **Consistent performance** - no variance based on file size

### Caching Pre-Rendered Content

```typescript
// Next.js 16: Cache the database query
"use cache";

export async function getNodeByPath(
  planetSlug: string,
  pathSegments: string[]
) {
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

export const revalidate = 7200; // 2 hours
```

### Why Pre-Render?

**Read-Heavy Workload:**
- 99% reads, 1% writes
- Same content served thousands of times
- Rendering once vs thousands of times

**Cost Efficiency:**
- Ingestion: 100ms × 1 = 100ms total
- On-demand: 50ms × 1000 requests = 50,000ms total
- **Savings: 99.8% less compute time**

### Re-Ingestion for Updates

If rendering logic changes (new Logseq feature, syntax fix):

```bash
# Re-upload Logseq graph to update all parsed_html
curl -X POST /api/ingest-logseq \
  -F "files=@pages/*.md" \
  -F "files=@journals/*.md"
```

### Best Practices

✅ **DO:**
- Pre-render during ingestion
- Store `parsed_html` in database
- Cache database queries with `"use cache"`
- Use unified/remark pipeline for consistency
- Re-ingest when rendering logic changes

❌ **DON'T:**
- Render markdown on every request
- Use client-side markdown parsing
- Store raw markdown without HTML
- Skip caching (defeats the purpose)
- Use too many markdown plugins (slow ingestion)

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
- [ ] Queries use `"use cache"` directive
- [ ] Images use proper loading strategy
- [ ] Links have prefetch enabled
- [ ] No unnecessary client-side JavaScript

**For Every Database Query:**
- [ ] Uses composite indexes
- [ ] Has `"use cache"` with revalidation time
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

**Last Updated:** 2025-11-16
**Version:** 2.0.0 (Next.js 16, Post-MVP)
