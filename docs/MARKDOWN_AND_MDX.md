# Markdown & MDX Guide

Complete guide for using markdown and MDX in Dropz with high-performance rendering.

## Quick Start (2 minutes)

The fastest way to render markdown:

```tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function Page() {
  return <MarkdownPage />  // Renders README.md
}
```

Done! Your page now has:
- ✅ Syntax highlighting
- ✅ GitHub Flavored Markdown
- ✅ Server-side rendering
- ✅ Zero client JavaScript

## Table of Contents

- [Core Concepts](#core-concepts)
- [Basic Usage](#basic-usage)
- [Advanced Patterns](#advanced-patterns)
- [Performance](#performance)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Core Concepts

### What You Get

**Performance Features:**
- Server-side rendering by default (RSC)
- MDX Rust compiler for fast builds
- Automatic code splitting
- Lazy image loading
- Zero JavaScript for static content

**Markdown Features:**
- Headers, lists, tables, blockquotes
- Code blocks with syntax highlighting
- Images with lazy loading
- Task lists, strikethrough
- GitHub Flavored Markdown (GFM)

**React Integration:**
- Use React components in .mdx files
- Custom styled components
- Full TypeScript support
- Frontmatter parsing

### Components

**Core Files:**
- `src/components/markdown-page.tsx` - Main component for serving markdown files
- `src/components/mdx-component.tsx` - Styled MDX components
- `src/components/mdx-loader.tsx` - Loading utilities
- `mdx-components.tsx` - MDX configuration (root level)

---

## Basic Usage

### 1. Serve README.md

By default, serves `README.md` from project root:

```tsx
// app/docs/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function DocsPage() {
  return <MarkdownPage />
}
```

### 2. Serve Custom Markdown File

Specify any markdown file:

```tsx
// app/changelog/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function ChangelogPage() {
  return <MarkdownPage filePath="CHANGELOG.md" />
}
```

### 3. Serve Nested Documentation

```tsx
// app/guide/getting-started/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function GettingStartedPage() {
  return <MarkdownPage filePath="docs/guides/getting-started.md" />
}
```

### 4. Create .mdx File (Markdown + React)

Create a `.mdx` file anywhere in your app directory:

```mdx
// app/blog/my-post/page.mdx

export const metadata = {
  title: 'My Blog Post',
  description: 'An amazing blog post'
}

# My Blog Post

This is **markdown** with React components!

import { Button } from '@/components/ui/button'

<Button>Click Me</Button>

## Code Example

\`\`\`typescript
function hello(name: string) {
  console.log(`Hello, ${name}!`)
}
\`\`\`
```

---

## Advanced Patterns

### Dynamic Routes

Create dynamic routes that serve different markdown files:

```tsx
// app/docs/[slug]/page.tsx
import { MarkdownPage } from '@/components/markdown-page'
import { notFound } from 'next/navigation'

const docsMap = {
  'getting-started': 'docs/getting-started.md',
  'api-reference': 'docs/api-reference.md',
  'deployment': 'docs/deployment.md',
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const filePath = docsMap[params.slug as keyof typeof docsMap]

  if (!filePath) {
    notFound()
  }

  return <MarkdownPage filePath={filePath} />
}

export async function generateStaticParams() {
  return Object.keys(docsMap).map((slug) => ({ slug }))
}
```

### Catch-All Routes

Handle arbitrary depth documentation:

```tsx
// app/docs/[...slug]/page.tsx
import { MarkdownPage } from '@/components/markdown-page'
import { notFound } from 'next/navigation'
import path from 'path'
import fs from 'fs'

export default function DocsPage({
  params,
}: {
  params: { slug: string[] }
}) {
  const slug = params.slug?.join('/') || 'index'
  const filePath = `docs/${slug}.md`

  // Verify file exists
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) {
    notFound()
  }

  return <MarkdownPage filePath={filePath} />
}
```

### Custom Layout Wrapper

Wrap markdown in your own layout:

```tsx
// app/docs/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Documentation</h1>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-8">
        <MarkdownPage />
      </div>
    </div>
  )
}
```

### Custom Styling

Override default styles with className:

```tsx
// app/styled-docs/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function StyledDocsPage() {
  return (
    <MarkdownPage
      className="prose-lg prose-headings:text-purple-600"
    />
  )
}
```

### Loading from External Source

Fetch and render markdown from CMS or API:

```tsx
// app/posts/[id]/page.tsx
import { MDXContent } from '@/components/mdx-component'
import { compileMDX } from 'next-mdx-remote/rsc'

async function getPostFromCMS(id: string) {
  const res = await fetch(`https://api.example.com/posts/${id}`)
  return res.json()
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPostFromCMS(params.id)

  const { content } = await compileMDX({
    source: post.markdown,
    options: {
      parseFrontmatter: true,
    },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1>{post.title}</h1>
      <MDXContent>{content}</MDXContent>
    </div>
  )
}
```

### Custom React Components in MDX

Create custom components:

```tsx
// components/callout.tsx
export function Callout({ type, children }: {
  type: 'info' | 'warning' | 'error'
  children: React.ReactNode
}) {
  return (
    <div className={`callout callout-${type} p-4 rounded-lg`}>
      {children}
    </div>
  )
}
```

Use in MDX:

```mdx
import { Callout } from '@/components/callout'

# My Content

<Callout type="info">
  This is an important message!
</Callout>
```

---

## Performance

### Server Components (Default)

All markdown/MDX pages are Server Components by default:
- Zero JavaScript sent to client
- Faster initial page load
- Better SEO

### Parallel Rendering

Load multiple markdown files in parallel:

```tsx
export default async function Page() {
  const [intro, guide, api] = await Promise.all([
    getCompiledMarkdown('docs/intro.md'),
    getCompiledMarkdown('docs/guide.md'),
    getCompiledMarkdown('docs/api.md'),
  ])

  return (
    <>
      {intro?.content}
      {guide?.content}
      {api?.content}
    </>
  )
}
```

### Image Optimization

Markdown images automatically use lazy loading:

```md
![Alt text](/image.jpg)
```

Becomes:

```html
<img src="/image.jpg" alt="Alt text" loading="lazy" decoding="async" />
```

For better performance, use Next.js Image:

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

### Static Generation

Pre-render known routes at build time:

```tsx
export async function generateStaticParams() {
  const docs = getAllDocSlugs()
  return docs.map((slug) => ({ slug }))
}
```

### Performance Targets

With this setup, expect:
- **TTFB:** < 100ms
- **FCP:** < 500ms
- **LCP:** < 1.5s

---

## Configuration

### Next.js Config

MDX configuration in `next.config.mjs`:

```js
import createMDX from '@next/mdx'

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeHighlight],
    development: process.env.NODE_ENV === 'development',
  },
})

export default withMDX({
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: true,  // Enable Rust-based MDX compiler
  },
})
```

### Custom MDX Components

Customize styling in `src/components/mdx-component.tsx`:

```tsx
const mdxComponents: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="text-4xl font-bold mb-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-3xl font-semibold mb-3">
      {children}
    </h2>
  ),
  code: ({ children, className }) => (
    <code className={`${className} bg-gray-100 dark:bg-gray-800 px-1 rounded`}>
      {children}
    </code>
  ),
  // ... more components
}
```

### Frontmatter

Add metadata to markdown files:

```md
---
title: My Page Title
description: Page description
author: John Doe
date: 2024-01-01
tags: [guide, tutorial]
---

# Content starts here
```

Frontmatter is automatically parsed and accessible in your code.

### Syntax Highlighting

Already configured with `rehype-highlight`. Styles in `src/app/globals.css`:

```css
/* Code highlighting styles */
.hljs {
  background: #1e1e1e;
  color: #d4d4d4;
}

.hljs-keyword {
  color: #569cd6;
}

/* ... more styles */
```

---

## Troubleshooting

### File Not Found

**Problem:** "File not found" error when loading markdown

**Solutions:**
- Check file path is correct and relative to project root
- Ensure file exists: `ls docs/your-file.md`
- Verify file extension is `.md` or `.mdx`
- Check for typos in filePath prop

### No Syntax Highlighting

**Problem:** Code blocks not highlighted

**Solutions:**
- Verify `globals.css` is imported in root layout
- Add language tag to code blocks: \`\`\`typescript
- Check `rehype-highlight` is installed
- Clear Next.js cache: `rm -rf .next`

### TypeScript Errors

**Problem:** "Cannot find module" errors

**Solutions:**
```bash
# Install type definitions
pnpm add -D @types/mdx

# Verify mdx-components.tsx exists in project root

# Restart TypeScript server
```

### Slow Build Times

**Problem:** Builds taking too long

**Solutions:**
- Enable Rust compiler in `next.config.mjs`:
  ```js
  experimental: {
    mdxRs: true,
  }
  ```
- Use `generateStaticParams` for known routes
- Split large MDX files into smaller ones
- Cache external content

### Styles Not Applying

**Problem:** Custom styles not showing

**Solutions:**
- Check Tailwind content paths include MDX files
- Verify prose classes are working: `className="prose"`
- Use `!important` to override defaults if needed
- Check dark mode settings

### MDX Import Errors

**Problem:** Cannot import React components in MDX

**Solutions:**
- Ensure component is exported properly
- Use correct import path
- Check `mdx-components.tsx` is configured
- Verify `pageExtensions` includes `.mdx`

---

## Common Use Cases

### Documentation Site

```tsx
// app/docs/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function Docs() {
  return <MarkdownPage />
}
```

### Blog

```tsx
// app/blog/[slug]/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function BlogPost({ params }: { params: { slug: string } }) {
  return <MarkdownPage filePath={`blog/${params.slug}.md`} />
}
```

### Changelog

```tsx
// app/changelog/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function Changelog() {
  return <MarkdownPage filePath="CHANGELOG.md" />
}
```

### Legal Pages

```tsx
// app/privacy/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function Privacy() {
  return <MarkdownPage filePath="legal/privacy.md" />
}
```

---

## Best Practices

1. **Use MarkdownPage for static content** - Fastest, simplest option
2. **Use .mdx for interactive content** - When you need React components
3. **Always specify language in code blocks** - Enables syntax highlighting
4. **Use generateStaticParams** - Pre-render known routes
5. **Optimize images** - Use Next.js Image component when possible
6. **Cache external content** - If loading from CMS/API
7. **Keep files organized** - Use `docs/` directory for all markdown
8. **Add frontmatter** - Improves SEO and metadata handling

---

## Directory Structure

Recommended structure:

```
your-project/
├── docs/                  # All documentation
│   ├── guides/
│   │   ├── getting-started.md
│   │   └── advanced.md
│   ├── api/
│   │   └── reference.md
│   └── README.md
├── README.md              # Project README (default)
├── CHANGELOG.md
├── app/
│   ├── docs/
│   │   ├── page.tsx       # Serves README.md
│   │   └── [slug]/
│   │       └── page.tsx   # Dynamic doc pages
│   └── changelog/
│       └── page.tsx       # Serves CHANGELOG.md
└── src/
    └── components/
        ├── markdown-page.tsx
        ├── mdx-component.tsx
        └── mdx-loader.tsx
```

---

## Packages Used

This system uses:

```json
{
  "@next/mdx": "latest",
  "@mdx-js/loader": "latest",
  "@mdx-js/react": "latest",
  "@types/mdx": "latest",
  "next-mdx-remote": "latest",
  "remark-gfm": "latest",
  "rehype-highlight": "latest"
}
```

---

## Resources

- [Next.js MDX Documentation](https://nextjs.org/docs/app/building-your-application/configuring/mdx)
- [MDX Documentation](https://mdxjs.com/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [Remark Plugins](https://github.com/remarkjs/remark/blob/main/doc/plugins.md)
- [Rehype Plugins](https://github.com/rehypejs/rehype/blob/main/doc/plugins.md)

---

**Last Updated:** 2025-11-12
