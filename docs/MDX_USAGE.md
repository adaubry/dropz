# High-Performance MDX Setup

This project uses `@next/mdx` with performance optimizations for fast markdown rendering.

## Features

- ✅ Server-side rendering by default
- ✅ Automatic code splitting
- ✅ Lazy loading for images
- ✅ Optimized with React Server Components
- ✅ Custom styled components
- ✅ Full TypeScript support
- ✅ MDX Rust compiler (`mdxRs: true`) for faster builds
- ✅ **Default README.md serving** - All pages can serve markdown files, with README.md as default
- ✅ Syntax highlighting with rehype-highlight
- ✅ GitHub Flavored Markdown (GFM) support

## Usage

### Quick Start: Serve README.md on Any Page

The easiest way to add markdown content to a page is using the `MarkdownPage` component. By default, it serves the `README.md` file from your project root:

```tsx
// app/docs/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function DocsPage() {
  return <MarkdownPage />
}
```

To serve a different markdown file:

```tsx
// app/guide/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function GuidePage() {
  return <MarkdownPage filePath="docs/guide.md" />
}
```

**Key Benefits:**
- 🚀 **Zero configuration** - Works out of the box
- ⚡ **Server-side rendering** - Fast initial page load
- 📝 **Automatic syntax highlighting** - Code blocks are styled automatically
- 🎨 **GitHub Flavored Markdown** - Tables, task lists, and more
- 🔍 **SEO friendly** - Full HTML rendered on the server

### 1. Create an MDX file

Create a `.mdx` file anywhere in your app directory:

```mdx
// app/blog/my-post/page.mdx

# My Blog Post

This is a **markdown** file with React components!

export const metadata = {
  title: 'My Blog Post',
  description: 'An amazing blog post'
}

## Features

- Fast rendering
- Server-side by default
- Great SEO

<CustomComponent prop="value" />
```

### 2. Using MDX in a React component

#### Server Component (Recommended for Performance)

```tsx
// app/content/page.tsx
import Content from './content.mdx'
import { MDXServerContent } from '@/components/mdx-loader'

export default function Page() {
  return (
    <MDXServerContent>
      <Content />
    </MDXServerContent>
  )
}
```

#### With Page Wrapper

```tsx
// app/blog/[slug]/page.tsx
import Content from './post.mdx'
import { MDXPage } from '@/components/mdx-loader'

export default function BlogPost() {
  return (
    <MDXPage
      title="My Blog Post"
      description="An amazing article"
    >
      <Content />
    </MDXPage>
  )
}
```

### 3. Dynamic MDX Loading

For content loaded at runtime or from a CMS:

```tsx
// app/docs/[slug]/page.tsx
import { MDXContent } from '@/components/mdx-component'
import { compileMDX } from 'next-mdx-remote/rsc'

export default async function DocsPage({
  params
}: {
  params: { slug: string }
}) {
  // Fetch MDX content from your source
  const mdxSource = await fetchMDXFromCMS(params.slug)

  const { content } = await compileMDX({
    source: mdxSource,
    options: {
      parseFrontmatter: true,
    },
  })

  return (
    <MDXContent>
      {content}
    </MDXContent>
  )
}
```

### 4. Custom Components in MDX

Create custom components and use them in your MDX:

```tsx
// components/custom-callout.tsx
export function Callout({ type, children }: { type: string; children: React.ReactNode }) {
  return (
    <div className={`callout callout-${type}`}>
      {children}
    </div>
  )
}
```

Then use in MDX:

```mdx
import { Callout } from '@/components/custom-callout'

# My Content

<Callout type="info">
  This is an important message!
</Callout>
```

## Performance Tips

### 1. Use Server Components by default

MDX files in the app directory are Server Components by default, which means:
- Zero JavaScript sent to the client for static content
- Faster initial page load
- Better SEO

### 2. Code Splitting

The MDX Rust compiler automatically splits large MDX files into smaller chunks.

### 3. Image Optimization

Images in MDX automatically use `loading="lazy"`:

```mdx
![Alt text](/image.jpg)
```

This becomes:

```html
<img src="/image.jpg" alt="Alt text" loading="lazy" decoding="async" />
```

### 4. Use Next.js Image for Better Performance

Instead of markdown images, use Next.js Image:

```mdx
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>
```

## Configuration

The MDX configuration is in `next.config.mjs`:

```js
const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
    development: process.env.NODE_ENV === 'development',
  },
})
```

### Adding Plugins

For syntax highlighting, add:

```bash
pnpm add rehype-highlight remark-gfm
```

```js
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeHighlight],
  },
})
```

## Custom Styling

All MDX components are customizable in `src/components/mdx-component.tsx`.

Example customization:

```tsx
const mdxComponents: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="custom-h1-class">
      {children}
    </h1>
  ),
  // ... other components
}
```

## Metadata & SEO

Add metadata to MDX pages:

```mdx
export const metadata = {
  title: 'My Page',
  description: 'Page description',
  openGraph: {
    title: 'My Page',
    description: 'Page description',
    images: ['/og-image.jpg'],
  },
}

# My Page Content
```

## Common Patterns

### Blog with MDX

```
app/
  blog/
    [slug]/
      page.tsx        # Dynamic route
    posts/
      post-1.mdx
      post-2.mdx
```

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { MDXPage } from '@/components/mdx-loader'

// Generate static params for all posts
export async function generateStaticParams() {
  const posts = await getPostSlugs()
  return posts.map((slug) => ({ slug }))
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const Post = await import(`../posts/${params.slug}.mdx`).catch(() => null)

  if (!Post) {
    notFound()
  }

  return (
    <MDXPage>
      <Post.default />
    </MDXPage>
  )
}
```

## Troubleshooting

### "Cannot find module" error

Make sure your `next.config.mjs` includes the MDX extension:

```js
pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx']
```

### Slow builds

Enable the Rust-based MDX compiler:

```js
experimental: {
  mdxRs: true,
}
```

### TypeScript errors

Install type definitions:

```bash
pnpm add -D @types/mdx
```

## Resources

- [Next.js MDX Documentation](https://nextjs.org/docs/app/building-your-application/configuring/mdx)
- [MDX Documentation](https://mdxjs.com/)
- [Remark Plugins](https://github.com/remarkjs/remark/blob/main/doc/plugins.md)
- [Rehype Plugins](https://github.com/rehypejs/rehype/blob/main/doc/plugins.md)
