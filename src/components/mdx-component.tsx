import type { MDXComponents } from 'mdx/types'
import { ReactNode } from 'react'

// Custom components for MDX with performance optimizations
const mdxComponents: MDXComponents = {
  // Headings with optimized rendering
  h1: ({ children, ...props }) => (
    <h1
      className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-4"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mt-8 mb-4"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="scroll-m-20 text-2xl font-semibold tracking-tight mt-6 mb-3"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="scroll-m-20 text-xl font-semibold tracking-tight mt-4 mb-2"
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5
      className="scroll-m-20 text-lg font-semibold tracking-tight mt-3 mb-2"
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6
      className="scroll-m-20 text-base font-semibold tracking-tight mt-2 mb-1"
      {...props}
    >
      {children}
    </h6>
  ),

  // Paragraph with optimized spacing
  p: ({ children, ...props }) => (
    <p className="leading-7 [&:not(:first-child)]:mt-4 mb-4" {...props}>
      {children}
    </p>
  ),

  // Lists with proper styling
  ul: ({ children, ...props }) => (
    <ul className="my-4 ml-6 list-disc [&>li]:mt-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-4 ml-6 list-decimal [&>li]:mt-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-7" {...props}>
      {children}
    </li>
  ),

  // Blockquote with visual styling
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="mt-4 border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic text-gray-700 dark:text-gray-300"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Code blocks with optimized rendering
  code: ({ children, className, ...props }) => {
    const isInline = !className
    return isInline ? (
      <code
        className="relative rounded bg-gray-100 dark:bg-gray-800 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code
        className={`${className} relative block rounded-lg bg-gray-950 dark:bg-gray-900 p-4 font-mono text-sm overflow-x-auto`}
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre
      className="mb-4 mt-4 overflow-x-auto rounded-lg bg-gray-950 dark:bg-gray-900 p-4"
      {...props}
    >
      {children}
    </pre>
  ),

  // Links with optimized performance
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="font-medium text-blue-600 dark:text-blue-400 underline underline-offset-4 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),

  // Images with lazy loading
  img: ({ src, alt, ...props }) => (
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      decoding="sync"
      className="rounded-lg my-4 max-w-full h-auto"
      {...props}
    />
  ),

  // Table components with responsive design
  table: ({ children, ...props }) => (
    <div className="my-4 w-full overflow-x-auto">
      <table className="w-full border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-100 dark:bg-gray-800" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className="border-b border-gray-200 dark:border-gray-700" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th
      className="px-4 py-2 text-left font-semibold text-sm"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-2 text-sm" {...props}>
      {children}
    </td>
  ),

  // Horizontal rule
  hr: (props) => (
    <hr className="my-8 border-gray-200 dark:border-gray-700" {...props} />
  ),
}

// Performance-optimized MDX wrapper component
export function MDXContent({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={`prose prose-gray dark:prose-invert max-w-none ${className}`}
    >
      {children}
    </article>
  )
}

// Export components for mdx-components.tsx
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...mdxComponents,
    ...components,
  }
}

export default mdxComponents
