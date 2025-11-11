/**
 * Test script to verify Logseq markdown parsing
 * Run with: pnpm tsx scripts/test-logseq-parsing.ts
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { remarkLogseq } from '../src/lib/remark-logseq'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'

const testMarkdown = `
# Test Logseq Features

This is ==highlighted text==.

Check out [[Page Reference]] and ((block-123)).

- TODO Task item
- DONE Completed task

Priority: [#A] [#B] [#C]

> [!NOTE]
> This is a callout.

author:: John Doe

E^{mc2} and H_{2}O

{{youtube https://www.youtube.com/watch?v=dQw4w9WgXcQ}}
`

async function testParsing() {
  console.log('🧪 Testing Logseq markdown parsing...\n')
  console.log('Input markdown:')
  console.log('================')
  console.log(testMarkdown)
  console.log('================\n')

  try {
    const result = await unified()
      .use(remarkParse)
      // remarkLogseq must run before remarkGfm to prevent autolink from interfering
      .use(remarkLogseq)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(testMarkdown)

    console.log('✅ Parsing successful!\n')
    console.log('Output HTML:')
    console.log('================')
    console.log(String(result))
    console.log('================\n')

    // Check for specific Logseq classes
    const html = String(result)
    const checks = [
      { name: 'Highlight', pattern: /logseq-highlight/ },
      { name: 'Page Reference', pattern: /logseq-page-ref/ },
      { name: 'Block Reference', pattern: /logseq-block-ref/ },
      { name: 'Task Marker', pattern: /logseq-task/ },
      { name: 'Priority Tag', pattern: /logseq-priority/ },
      { name: 'Callout', pattern: /logseq-callout/ },
      { name: 'Property', pattern: /logseq-property/ },
      { name: 'YouTube', pattern: /logseq-youtube/ },
      { name: 'Superscript', pattern: /<sup>/ },
      { name: 'Subscript', pattern: /<sub>/ },
    ]

    console.log('Feature Detection:')
    console.log('==================')
    checks.forEach(check => {
      const found = check.pattern.test(html)
      console.log(`${found ? '✅' : '❌'} ${check.name}`)
    })
    console.log('==================\n')

    const allPassed = checks.every(check => check.pattern.test(html))
    if (allPassed) {
      console.log('🎉 All features detected successfully!')
    } else {
      console.log('⚠️ Some features are missing. Check the output above.')
    }

  } catch (error) {
    console.error('❌ Parsing failed:', error)
    process.exit(1)
  }
}

testParsing()
