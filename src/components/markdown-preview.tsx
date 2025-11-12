import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { remarkLogseq } from '@/lib/remark-logseq'
import { MDXContent } from './mdx-component'
import { useMDXComponents } from './mdx-component'

/**
 * Pre-process markdown content to fix HTML self-closing tags for MDX compatibility
 */
function preprocessMarkdownForMDX(source: string): string {
  let processed = source

  processed = processed.replace(/<img([^>]*[^/])>/gi, '<img$1 />')
  processed = processed.replace(/<br>/gi, '<br />')
  processed = processed.replace(/<hr>/gi, '<hr />')
  processed = processed.replace(
    /<(area|base|col|embed|input|link|meta|param|source|track|wbr)([^>]*[^/])>/gi,
    '<$1$2 />'
  )

  return processed
}

interface MarkdownPreviewProps {
  content: string
  className?: string
}

/**
 * Renders first visible lines of markdown for PPR pattern
 * This is pre-rendered instantly while full content streams
 */
export async function MarkdownPreview({
  content,
  className,
}: MarkdownPreviewProps) {
  try {
    // Pre-process markdown
    const processed = preprocessMarkdownForMDX(content)

    // Compile just the preview content
    const { content: mdxContent, frontmatter } = await compileMDX({
      source: processed,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkLogseq, remarkGfm],
          rehypePlugins: [rehypeRaw as any, rehypeHighlight],
          development: process.env.NODE_ENV === 'development',
        },
      },
      components: useMDXComponents({}),
    })

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {frontmatter && (
          <div className="mb-8">
            {(frontmatter as any).title && (
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                {(frontmatter as any).title}
              </h1>
            )}
            {(frontmatter as any).description && (
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {(frontmatter as any).description}
              </p>
            )}
          </div>
        )}
        <MDXContent className={className}>{mdxContent}</MDXContent>
      </div>
    )
  } catch (error) {
    console.error('Error rendering markdown preview:', error)
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        </div>
      </div>
    )
  }
}
