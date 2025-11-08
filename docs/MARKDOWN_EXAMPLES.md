# Markdown Component Examples

This document demonstrates all the ways to use the high-performance MDX system.

## 1. Serve README.md by Default

The simplest way - serve your project's README on any page:

```tsx
// app/docs/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function DocsPage() {
  return <MarkdownPage />
}
```

✅ **Performance**: Server-rendered, zero client-side JavaScript
✅ **Use case**: Documentation pages, landing pages, static content

## 2. Serve Custom Markdown Files

Specify any markdown file from your project:

```tsx
// app/changelog/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function ChangelogPage() {
  return <MarkdownPage filePath="CHANGELOG.md" />
}
```

```tsx
// app/guide/getting-started/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function GettingStartedPage() {
  return <MarkdownPage filePath="docs/getting-started.md" />
}
```

## 3. Dynamic Routes with Markdown

Create dynamic routes that serve different markdown files:

```tsx
// app/docs/[slug]/page.tsx
import { MarkdownPage } from '@/components/markdown-page'
import { notFound } from 'next/navigation'

const docs = {
  'getting-started': 'docs/getting-started.md',
  'api-reference': 'docs/api-reference.md',
  'deployment': 'docs/deployment.md',
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const filePath = docs[params.slug as keyof typeof docs]

  if (!filePath) {
    notFound()
  }

  return <MarkdownPage filePath={filePath} />
}

// Generate static paths for all docs
export async function generateStaticParams() {
  return Object.keys(docs).map((slug) => ({ slug }))
}
```

## 4. MDX Files (Markdown + React Components)

Create `.mdx` files that can include React components:

```mdx
// app/blog/first-post/page.mdx
export const metadata = {
  title: 'My First Post',
  description: 'An amazing blog post'
}

# My First Post

This is a blog post with **markdown** and React components!

import { Button } from '@/components/ui/button'

<Button>Click Me</Button>

## Features

- Syntax highlighting
- React components
- Full TypeScript support

\`\`\`typescript
function hello(name: string) {
  console.log(`Hello, ${name}!`)
}
\`\`\`
```

## 5. Programmatic MDX (from CMS/API)

Load and render markdown from external sources:

```tsx
// app/posts/[id]/page.tsx
import { getCompiledMarkdown } from '@/components/markdown-page'
import { MDXContent } from '@/components/mdx-component'

async function getPostFromCMS(id: string) {
  // Fetch from your CMS
  const res = await fetch(`https://api.example.com/posts/${id}`)
  return res.json()
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPostFromCMS(params.id)

  const compiled = await getCompiledMarkdown(post.contentPath)

  if (!compiled) {
    return <div>Post not found</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1>{post.title}</h1>
      <MDXContent>{compiled.content}</MDXContent>
    </div>
  )
}
```

## 6. Custom Styling

Override the default styles:

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

## 7. With Custom Layout

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
      <MarkdownPage />
    </div>
  )
}
```

## 8. API Route for Markdown

Serve markdown content via API:

```tsx
// app/api/markdown/route.ts
import { getMarkdownContent } from '@/components/markdown-page'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const file = searchParams.get('file') || 'README.md'

  const content = await getMarkdownContent(file)

  if (!content) {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ content })
}
```

## Performance Characteristics

All approaches use:

- ✅ **Server-side rendering** - Content rendered on server
- ✅ **Zero JavaScript** - No client-side JS for static content
- ✅ **Code splitting** - MDX files automatically split
- ✅ **Fast builds** - MDX Rust compiler
- ✅ **Syntax highlighting** - Automatic with rehype-highlight
- ✅ **GFM support** - Tables, task lists, strikethrough, etc.

## Frontmatter Support

Add metadata to your markdown files:

```md
---
title: My Page Title
description: Page description
author: John Doe
date: 2024-01-01
---

# Content starts here
```

The frontmatter is automatically parsed and can be accessed in your components.

## Best Practices

1. **Use MarkdownPage for static content** - It's the fastest option
2. **Use .mdx files for interactive content** - When you need React components
3. **Use dynamic imports for large MDX files** - Improve initial load time
4. **Cache compiled MDX** - If loading from external sources
5. **Use generateStaticParams** - For dynamic routes with known paths
6. **Optimize images** - Use Next.js Image component in MDX

## Directory Structure Recommendation

```
your-project/
├── docs/              # All markdown documentation
│   ├── getting-started.md
│   ├── api-reference.md
│   └── guides/
│       ├── authentication.md
│       └── deployment.md
├── README.md          # Default served file
├── CHANGELOG.md
├── app/
│   ├── docs/
│   │   └── page.tsx   # Serves README.md
│   └── changelog/
│       └── page.tsx   # Serves CHANGELOG.md
└── src/
    └── components/
        ├── markdown-page.tsx
        └── mdx-component.tsx
```

## Example: Complete Documentation Site

```tsx
// app/docs/[...slug]/page.tsx
import { MarkdownPage } from '@/components/markdown-page'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'

// Get all markdown files from docs directory
function getAllDocs() {
  const docsDir = path.join(process.cwd(), 'docs')
  // Recursively get all .md files
  // ... implementation
}

export default function DocsPage({
  params,
}: {
  params: { slug: string[] }
}) {
  const slug = params.slug?.join('/') || 'index'
  const filePath = `docs/${slug}.md`

  // Check if file exists
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) {
    notFound()
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside className="w-64 border-r">
        {/* Navigation */}
      </aside>

      {/* Content */}
      <main className="flex-1">
        <MarkdownPage filePath={filePath} />
      </main>
    </div>
  )
}

export async function generateStaticParams() {
  const docs = getAllDocs()
  return docs.map((doc) => ({
    slug: doc.split('/'),
  }))
}
```

## Troubleshooting

**Markdown not rendering?**
- Check file path is correct
- Ensure file exists in project root or specified path
- Check console for error messages

**Syntax highlighting not working?**
- Ensure `globals.css` is imported in your root layout
- Check code blocks have proper language tags

**Slow builds?**
- Enable `mdxRs: true` in next.config.mjs
- Use static generation where possible
- Consider caching for external content

**TypeScript errors?**
- Run `pnpm add -D @types/mdx`
- Check `mdx-components.tsx` exists in project root
