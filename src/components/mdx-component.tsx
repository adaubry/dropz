import type { MDXComponents } from 'mdx/types'
import { ReactNode } from 'react'

// Custom components for MDX with modern, beautiful UI
const mdxComponents: MDXComponents = {
  // Headings with modern gradient effects
  h1: ({ children, ...props }) => (
    <h1
      className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-6 mt-8 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="scroll-m-20 border-b-2 border-gray-200 dark:border-gray-800 pb-3 text-3xl font-bold tracking-tight first:mt-0 mt-10 mb-5"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="scroll-m-20 text-2xl font-bold tracking-tight mt-8 mb-4"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="scroll-m-20 text-xl font-semibold tracking-tight mt-6 mb-3"
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5
      className="scroll-m-20 text-lg font-semibold tracking-tight mt-4 mb-2"
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6
      className="scroll-m-20 text-base font-semibold tracking-tight mt-3 mb-2"
      {...props}
    >
      {children}
    </h6>
  ),

  // Paragraph with improved spacing and readability
  p: ({ children, ...props }) => (
    <p className="leading-7 [&:not(:first-child)]:mt-5 mb-5 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </p>
  ),

  // Lists with enhanced visual hierarchy
  ul: ({ children, ...props }) => (
    <ul className="my-5 ml-6 list-disc marker:text-blue-500 dark:marker:text-blue-400 [&>li]:mt-2 space-y-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-5 ml-6 list-decimal marker:text-blue-500 dark:marker:text-blue-400 [&>li]:mt-2 space-y-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-7 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </li>
  ),

  // Blockquote with enhanced visual design
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="mt-6 mb-6 border-l-4 border-blue-500 dark:border-blue-400 pl-6 pr-4 py-2 italic text-gray-700 dark:text-gray-300 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Code blocks with enhanced styling
  code: ({ children, className, ...props }) => {
    const isInline = !className
    return isInline ? (
      <code
        className="relative rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-1 font-mono text-sm font-semibold text-pink-600 dark:text-pink-400 border border-gray-200 dark:border-gray-700"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code
        className={`${className} relative block rounded-lg bg-gray-950 dark:bg-gray-900 p-4 font-mono text-sm overflow-x-auto border border-gray-700 dark:border-gray-800`}
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre
      className="mb-6 mt-6 overflow-x-auto rounded-lg bg-gray-950 dark:bg-gray-900 p-5 shadow-lg border border-gray-700 dark:border-gray-800"
      {...props}
    >
      {children}
    </pre>
  ),

  // Links with improved styling and hover effects
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="font-medium text-blue-600 dark:text-blue-400 underline decoration-blue-300 dark:decoration-blue-600 underline-offset-4 hover:text-blue-700 dark:hover:text-blue-300 hover:decoration-blue-500 transition-all duration-200"
      {...props}
    >
      {children}
    </a>
  ),

  // Images with enhanced presentation
  img: ({ src, alt, ...props }) => (
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      decoding="async"
      className="rounded-lg my-6 max-w-full h-auto shadow-md border border-gray-200 dark:border-gray-800"
      {...props}
    />
  ),

  // Table components with modern, beautiful design
  table: ({ children, ...props }) => (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
      <table className="w-full border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-950" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th
      className="px-5 py-3 text-left font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </td>
  ),

  // Horizontal rule with enhanced styling
  hr: (props) => (
    <hr className="my-10 border-t-2 border-gray-200 dark:border-gray-800" {...props} />
  ),
}

// Modern, beautiful MDX wrapper component
export function MDXContent({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={`prose prose-lg prose-gray dark:prose-invert max-w-none prose-headings:font-bold prose-a:no-underline hover:prose-a:underline ${className}`}
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
