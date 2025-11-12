import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { remarkLogseq } from '@/lib/remark-logseq'
import { MDXContent } from './mdx-component'
import { useMDXComponents } from './mdx-component'
import { resolveAllReferencesOptimized } from '@/lib/logseq/references'
import { getCachedBlockIndex } from '@/lib/logseq/cache'

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
 * Renders Logseq markdown with OPTIMIZED reference resolution
 *
 * Performance:
 * - Uses cached block index for O(1) block reference lookups
 * - Cache TTL: 1 hour (rebuild on expiry or manual invalidation)
 * - O(R) resolution where R = number of references (not O(N*M)!)
 *
 * Features:
 * - Resolves block references ((uuid)) to actual content
 * - Resolves page embeds {{embed [[page]]}}
 * - Resolves block embeds {{embed ((uuid))}}
 * - XSS protection with HTML escaping
 * - Graceful fallback for missing references
 */
export async function LogseqMarkdownPreview({
  content,
  planetId,
  className,
}: LogseqMarkdownPreviewProps) {
  try {
    // Step 1: Get cached block index (O(1) on cache hit)
    const blockIndex = await getCachedBlockIndex(planetId)

    // Step 2: Resolve all references using cached index (O(R))
    const resolvedContent = await resolveAllReferencesOptimized(
      content,
      planetId,
      blockIndex
    )

    // Step 3: Pre-process for MDX compatibility
    const processed = preprocessMarkdownForMDX(resolvedContent)

    // Step 4: Compile MDX with Logseq plugins
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
 * Use for list views where full reference resolution is unnecessary
 *
 * Performance: O(1) - no database queries, no reference resolution
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
