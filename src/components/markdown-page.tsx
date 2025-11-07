import { readFile, access } from 'fs/promises'
import { resolve, isAbsolute } from 'path'
import { constants } from 'fs'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { MDXContent } from './mdx-component'
import { useMDXComponents } from './mdx-component'

// This is a server component - do not add 'use client'

/**
 * Pre-process markdown content to fix HTML self-closing tags for MDX compatibility
 * MDX requires JSX syntax, so HTML tags like <img> need to be <img />
 */
function preprocessMarkdownForMDX(source: string): string {
  let processed = source

  // Convert <img ...> to <img ... />
  processed = processed.replace(/<img([^>]*[^/])>/gi, '<img$1 />')
  // Convert <br> to <br />
  processed = processed.replace(/<br>/gi, '<br />')
  // Convert <hr> to <hr />
  processed = processed.replace(/<hr>/gi, '<hr />')
  // Convert other common self-closing tags
  processed = processed.replace(
    /<(area|base|col|embed|input|link|meta|param|source|track|wbr)([^>]*[^/])>/gi,
    '<$1$2 />'
  )

  return processed
}

interface MarkdownPageProps {
  /**
   * Path to the markdown file relative to the project root
   * Defaults to 'README.md'
   */
  filePath?: string
  /**
   * Additional className for the wrapper
   */
  className?: string
}

/**
 * High-performance server component that renders markdown files
 * By default, it serves the README.md file from the project root
 *
 * @example
 * ```tsx
 * // Serves README.md by default
 * <MarkdownPage />
 *
 * // Serve a specific markdown file
 * <MarkdownPage filePath="docs/getting-started.md" />
 * ```
 */
export async function MarkdownPage({
  filePath = 'README.md',
  className,
}: MarkdownPageProps) {
  try {
    // Resolve the full path properly
    const projectRoot = process.cwd()
    const fullPath = isAbsolute(filePath)
      ? filePath
      : resolve(projectRoot, filePath)

    // Check if file exists before reading
    try {
      await access(fullPath, constants.R_OK)
    } catch {
      throw new Error(`File not found or not readable: ${fullPath}`)
    }

    // Read the markdown file from the file system
    let source = await readFile(fullPath, 'utf-8')

    // Pre-process markdown to fix HTML self-closing tags for MDX compatibility
    source = preprocessMarkdownForMDX(source)

    // Compile MDX with performance optimizations
    const { content, frontmatter } = await compileMDX({
      source,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeHighlight],
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
        <MDXContent className={className}>{content}</MDXContent>
      </div>
    )
  } catch (error) {
    const projectRoot = process.cwd()
    const fullPath = isAbsolute(filePath)
      ? filePath
      : resolve(projectRoot, filePath)

    console.error(`Failed to load markdown file: ${filePath}`, error)
    console.error(`Project root: ${projectRoot}`)
    console.error(`Full path attempted: ${fullPath}`)

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Error Loading Markdown
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-2">
            Failed to load markdown file: <code className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded">{filePath}</code>
          </p>
          <details className="text-sm text-red-600 dark:text-red-400 mt-3">
            <summary className="cursor-pointer font-semibold mb-2">Debug Information</summary>
            <div className="mt-2 space-y-1 font-mono text-xs">
              <p>Project root: <code>{projectRoot}</code></p>
              <p>Attempted path: <code>{fullPath}</code></p>
              <p>Error: <code>{error instanceof Error ? error.message : String(error)}</code></p>
            </div>
          </details>
          <p className="text-sm text-red-600 dark:text-red-400 mt-3">
            Make sure the file exists at the specified path.
          </p>
        </div>
      </div>
    )
  }
}

/**
 * Get markdown content as a string (utility function)
 * Useful for getting markdown content in API routes or server actions
 */
export async function getMarkdownContent(
  filePath: string = 'README.md'
): Promise<string | null> {
  try {
    const projectRoot = process.cwd()
    const fullPath = isAbsolute(filePath)
      ? filePath
      : resolve(projectRoot, filePath)

    const content = await readFile(fullPath, 'utf-8')
    return content
  } catch (error) {
    console.error(`Failed to read markdown file: ${filePath}`, error)
    return null
  }
}

/**
 * Get compiled MDX with frontmatter
 * Returns both the compiled content and any frontmatter data
 */
export async function getCompiledMarkdown(filePath: string = 'README.md') {
  try {
    let source = await getMarkdownContent(filePath)

    if (!source) {
      return null
    }

    // Pre-process markdown to fix HTML self-closing tags for MDX compatibility
    source = preprocessMarkdownForMDX(source)

    const result = await compileMDX({
      source,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeHighlight],
        },
      },
      components: useMDXComponents({}),
    })

    return result
  } catch (error) {
    console.error(`Failed to compile markdown: ${filePath}`, error)
    return null
  }
}
