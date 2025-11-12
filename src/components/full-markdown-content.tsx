import { readFile, access } from 'fs/promises'
import { resolve, isAbsolute } from 'path'
import { constants } from 'fs'
import { getFullMarkdown } from '@/lib/markdown-cache'
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

interface FullMarkdownContentProps {
  filePath: string
  className?: string
}

/**
 * Loads and renders full markdown content
 * Used within Suspense boundary for streaming after initial render
 */
export async function FullMarkdownContent({
  filePath,
  className,
}: FullMarkdownContentProps) {
  try {
    const projectRoot = process.cwd()
    const fullPath = isAbsolute(filePath)
      ? filePath
      : resolve(projectRoot, filePath)

    // Check if file exists
    try {
      await access(fullPath, constants.R_OK)
    } catch {
      throw new Error(`File not found or not readable: ${fullPath}`)
    }

    // Get full markdown content (cached)
    const source = await getFullMarkdown(fullPath)

    if (!source) {
      throw new Error('Failed to read markdown file')
    }

    // Pre-process markdown
    const processed = preprocessMarkdownForMDX(source)

    // Compile MDX
    const { content } = await compileMDX({
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

    return <MDXContent className={className}>{content}</MDXContent>
  } catch (error) {
    console.error('Error rendering full markdown:', error)
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        Failed to load remaining content
      </div>
    )
  }
}
