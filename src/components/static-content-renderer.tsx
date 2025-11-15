/**
 * Static Content Renderer
 *
 * Renders pre-compiled HTML from Rust export tool
 * Replaces LogseqMarkdownPreview for static HTML content
 */

interface StaticContentRendererProps {
  html: string;
  className?: string;
}

/**
 * Renders pre-compiled HTML from Rust export tool
 * No parsing, no processing - just serve the HTML
 *
 * The HTML is already:
 * - Fully rendered (no markdown parsing needed)
 * - Block references resolved
 * - Page references converted to links
 * - Syntax highlighted
 * - Math equations rendered
 */
export function StaticContentRenderer({
  html,
  className = 'prose dark:prose-invert max-w-none',
}: StaticContentRendererProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
