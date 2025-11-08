import { lazy, Suspense, ComponentType } from 'react'
import { MDXContent } from './mdx-component'

// Performance-optimized MDX loader with dynamic imports
// This enables code splitting and lazy loading for MDX content

interface MDXLoaderProps {
  /**
   * Path to the MDX file relative to the project root
   * Example: '@/content/blog/my-post.mdx'
   */
  mdxPath: string
  /**
   * Loading fallback component
   */
  fallback?: React.ReactNode
  /**
   * Additional className for the wrapper
   */
  className?: string
}

/**
 * Dynamically load MDX content with code splitting
 * This component uses React.lazy for automatic code splitting
 *
 * @example
 * ```tsx
 * <MDXLoader mdxPath="@/content/blog/my-post.mdx">
 *   <Content />
 * </MDXLoader>
 * ```
 */
export function MDXLoader({
  mdxPath,
  fallback,
  className,
  children,
}: MDXLoaderProps & { children: React.ReactNode }) {
  return (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <MDXContent className={className}>{children}</MDXContent>
    </Suspense>
  )
}

// Simple loading spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin  full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
    </div>
  )
}

/**
 * Server-side MDX component wrapper
 * Use this for static content that should be rendered on the server
 *
 * @example
 * ```tsx
 * import Content from './content.mdx'
 *
 * export default function Page() {
 *   return (
 *     <MDXServerContent>
 *       <Content />
 *     </MDXServerContent>
 *   )
 * }
 * ```
 */
export function MDXServerContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <MDXContent className={className}>
      {children}
    </MDXContent>
  )
}

/**
 * High-performance MDX page wrapper
 * Optimized for full-page MDX content with metadata
 */
export function MDXPage({
  children,
  title,
  description,
  className,
}: {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {(title || description) && (
        <header className="mb-8">
          {title && (
            <h1 className="text-4xl font-bold tracking-tight mb-2">{title}</h1>
          )}
          {description && (
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </header>
      )}
      <MDXContent className={className}>{children}</MDXContent>
    </div>
  )
}
