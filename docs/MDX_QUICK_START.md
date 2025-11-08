# MDX Quick Start Guide

Get started with high-performance markdown rendering in under 2 minutes!

## 🚀 Fastest Way to Use

### Serve README.md on a page:

```tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function Page() {
  return <MarkdownPage />
}
```

Done! Your README.md is now rendered with:
- ✅ Syntax highlighting
- ✅ GitHub Flavored Markdown
- ✅ Server-side rendering
- ✅ Zero client JavaScript

### Serve any markdown file:

```tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function Page() {
  return <MarkdownPage filePath="docs/guide.md" />
}
```

## 📁 Files Created

### Core Components
- `src/components/mdx-component.tsx` - Styled MDX components
- `src/components/mdx-loader.tsx` - Loading utilities
- `src/components/markdown-page.tsx` - **Main component you'll use**
- `mdx-components.tsx` - MDX configuration (required by Next.js)

### Configuration
- `next.config.mjs` - Updated with MDX support
- `src/app/globals.css` - Added syntax highlighting styles

### Documentation
- `MDX_USAGE.md` - Complete usage guide
- `MARKDOWN_EXAMPLES.md` - Real-world examples
- `MDX_QUICK_START.md` - This file

### Example
- `src/app/docs/page.tsx` - Example page serving README.md

## 🎨 What's Included

### Markdown Features
- ✅ Headers (h1-h6)
- ✅ Bold, italic, strikethrough
- ✅ Lists (ordered, unordered)
- ✅ Code blocks with syntax highlighting
- ✅ Inline code
- ✅ Blockquotes
- ✅ Links
- ✅ Images (with lazy loading)
- ✅ Tables
- ✅ Task lists
- ✅ Horizontal rules

### Performance Features
- ✅ Server-side rendering (RSC)
- ✅ MDX Rust compiler
- ✅ Automatic code splitting
- ✅ Lazy image loading
- ✅ Zero client JavaScript for static content

## 🔧 Common Use Cases

### 1. Documentation Site
```tsx
// app/docs/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function Docs() {
  return <MarkdownPage />  // Serves README.md
}
```

### 2. Blog Post
```tsx
// app/blog/[slug]/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function BlogPost({ params }: { params: { slug: string } }) {
  return <MarkdownPage filePath={`blog/${params.slug}.md`} />
}
```

### 3. Changelog
```tsx
// app/changelog/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function Changelog() {
  return <MarkdownPage filePath="CHANGELOG.md" />
}
```

### 4. MDX with React Components
```mdx
// app/interactive/page.mdx
import { Button } from '@/components/ui/button'

# Interactive Page

This is markdown with React components!

<Button>Click Me</Button>
```

## 📦 Packages Installed

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

## ⚡ Performance Tips

1. **Use MarkdownPage for static content** - Server-rendered, no JS
2. **Enable mdxRs** - Already enabled in config (faster builds)
3. **Use generateStaticParams** - Pre-render dynamic routes
4. **Cache external content** - If fetching from CMS/API

## 🎯 Next Steps

1. **Read full docs**: See `MDX_USAGE.md`
2. **View examples**: Check `MARKDOWN_EXAMPLES.md`
3. **Test it out**: Visit `/docs` route
4. **Customize styles**: Edit `src/components/mdx-component.tsx`

## 💡 Tips

- All markdown files are relative to project root
- Default file is `README.md`
- Frontmatter is automatically parsed
- Dark mode styles are included
- Syntax highlighting works out of the box

## 🐛 Troubleshooting

**File not found error?**
- Check file path is correct
- Ensure file exists in project
- Paths are relative to project root

**No syntax highlighting?**
- Verify `globals.css` is imported
- Check code blocks have language tags: \`\`\`typescript

**TypeScript errors?**
- Run `pnpm install`
- Check `mdx-components.tsx` exists

## 📚 Learn More

- [Next.js MDX Docs](https://nextjs.org/docs/app/building-your-application/configuring/mdx)
- [MDX Documentation](https://mdxjs.com/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)

---

**That's it!** You now have a high-performance markdown system. 🎉

Start by creating a page:

```bash
mkdir -p app/docs
```

```tsx
// app/docs/page.tsx
import { MarkdownPage } from '@/components/markdown-page'

export default function Docs() {
  return <MarkdownPage />
}
```

Visit `/docs` and see your README.md rendered beautifully!
