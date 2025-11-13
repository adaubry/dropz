import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { MDXContent } from './mdx-component'
import { useMDXComponents } from './mdx-component'
import { getCachedBlockIndex } from '@/lib/logseq/cache'
import { processLogseqContent } from '@/lib/logseq/render'

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
  planetSlug: string
  className?: string
}

/**
 * Renders Logseq markdown with FULL Logseq compatibility
 *
 * Features:
 * - Page references [[page]] → Actual clickable links
 * - Block references ((uuid)) → Resolved content with source links
 * - Page embeds {{embed [[page]]}} → Full embedded pages
 * - Block embeds {{embed ((uuid))}} → Embedded blocks
 * - Properties (key:: value) → Formatted key-value pairs
 * - Tasks (TODO, DOING, DONE) → Styled task markers
 * - Highlights ==text== → Highlighted text
 * - Priorities [#A] [#B] [#C] → Priority badges
 *
 * Performance:
 * - Uses cached block index for O(1) block reference lookups
 * - Cache TTL: 1 hour (rebuild on expiry or manual invalidation)
 * - O(R) resolution where R = number of references (not O(N*M)!)
 */
export async function LogseqMarkdownPreview({
  content,
  planetId,
  planetSlug,
  className,
}: LogseqMarkdownPreviewProps) {
  try {
    // Step 1: Get cached block index (O(1) on cache hit)
    const blockIndex = await getCachedBlockIndex(planetId)

    // Step 2: Process ALL Logseq syntax and convert to proper HTML/Markdown
    const processedContent = await processLogseqContent(
      content,
      planetId,
      planetSlug,
      blockIndex
    )

    // Step 3: Pre-process for MDX compatibility
    const mdxReady = preprocessMarkdownForMDX(processedContent)

    // Step 4: Compile MDX (now with real links from step 2)
    const { content: mdxContent, frontmatter } = await compileMDX({
      source: mdxReady,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeRaw as any, rehypeHighlight],
          development: process.env.NODE_ENV === 'development',
        },
      },
      components: useMDXComponents({}),
    })

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Render frontmatter if present (Logseq properties at top of page) */}
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
