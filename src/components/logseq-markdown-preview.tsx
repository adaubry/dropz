import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { remarkLogseq } from '@/lib/remark-logseq'
import { MDXContent } from './mdx-component'
import { useMDXComponents } from './mdx-component'
import { resolveAllReferences } from '@/lib/logseq/references'

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

interface LogseqMarkdownPreviewProps {
  content: string
  planetId: number
  className?: string
}

/**
 * Renders Logseq markdown with full reference resolution
 * - Resolves block references ((uuid)) to actual content
 * - Resolves page embeds {{embed [[page]]}}
 * - Resolves block embeds {{embed ((uuid))}}
 * - Applies Logseq markdown parsing (properties, tasks, highlights, etc.)
 */
export async function LogseqMarkdownPreview({
  content,
  planetId,
  className,
}: LogseqMarkdownPreviewProps) {
  try {
    // Step 1: Resolve all Logseq references (block refs, embeds)
    const resolvedContent = await resolveAllReferences(content, planetId)

    // Step 2: Pre-process for MDX compatibility
    const processed = preprocessMarkdownForMDX(resolvedContent)

    // Step 3: Compile MDX with Logseq plugins
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
        {/* Render frontmatter if present (legacy support) */}
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

        {/* Render MDX content with Logseq styling */}
        <MDXContent className={`logseq-content ${className || ''}`}>
          {mdxContent}
        </MDXContent>
      </div>
    )
  } catch (error) {
    console.error('[Logseq Markdown] Error rendering:', error)
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
            Failed to render page
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    )
  }
}

/**
 * Fast preview version (without reference resolution)
 * Use for list views where full reference resolution is too expensive
 */
export async function LogseqMarkdownPreviewFast({
  content,
  className,
}: Omit<LogseqMarkdownPreviewProps, 'planetId'>) {
  try {
    const processed = preprocessMarkdownForMDX(content)

    const { content: mdxContent } = await compileMDX({
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
      <MDXContent className={`logseq-content ${className || ''}`}>
        {mdxContent}
      </MDXContent>
    )
  } catch (error) {
    console.error('[Logseq Markdown Fast] Error rendering:', error)
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Failed to render preview
      </div>
    )
  }
}
