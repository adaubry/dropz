import { MarkdownPage } from '@/components/markdown-page'

/**
 * Logseq Features Demo Page
 * Demonstrates all Logseq markdown features with modern UI
 */
export default function LogseqDemoPage() {
  return <MarkdownPage filePath="LOGSEQ_DEMO.md" />
}

// Metadata for SEO
export const metadata = {
  title: 'Logseq Features Demo',
  description: 'Comprehensive demonstration of all Logseq markdown features',
}
