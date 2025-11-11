import { visit } from 'unist-util-visit'
import type { Root, Text, Paragraph, Html } from 'mdast'

/**
 * Remark plugin to parse Logseq-specific markdown syntax
 * Supports:
 * - Highlights: ==text==
 * - Page references: [[page name]]
 * - Block references: ((block-id))
 * - Task markers: TODO, DOING, DONE, LATER, NOW
 * - Priority tags: [#A], [#B], [#C]
 * - Properties: property:: value
 * - Embeds: {{embed [[page]]}} or {{embed ((block-id))}}
 * - YouTube embeds: {{youtube https://www.youtube.com/watch?v=VIDEO_ID}}
 * - Callouts: > [!NOTE], > [!WARNING], etc.
 * - Subscript: X_{sub}
 * - Superscript: X^{super}
 */
export function remarkLogseq() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null) return

      const text = node.value
      const parts: any[] = []
      let lastIndex = 0

      // Helper function to add text if there's content
      const addText = (value: string) => {
        if (value) {
          parts.push({
            type: 'text',
            value,
          })
        }
      }

      // Helper to create HTML node
      const createHtml = (value: string) => ({
        type: 'html',
        value,
      })

      // Combined regex for all Logseq syntax
      const logseqRegex =
        /==([^=]+)==|\[\[([^\]]+)\]\]|\(\(([^)]+)\)\)|\[#([ABC])\]|{{embed\s+\[\[([^\]]+)\]\]}}|{{embed\s+\(\(([^)]+)\)\)}}|{{youtube\s+([^}]+)}}|TODO|DOING|DONE|LATER|NOW|(\w+)::\s*([^\n]+)|([A-Za-z0-9_]+)\^{([^}]+)}|([A-Za-z0-9_]+)_{([^}]+)}/g

      let match
      while ((match = logseqRegex.exec(text)) !== null) {
        // Add text before match
        addText(text.slice(lastIndex, match.index))

        // Highlight ==text==
        if (match[1]) {
          parts.push(
            createHtml(
              `<span class="logseq-highlight" data-type="highlight">${match[1]}</span>`
            )
          )
        }
        // Page reference [[page]]
        else if (match[2]) {
          parts.push(
            createHtml(
              `<span class="logseq-page-ref" data-page="${match[2]}">${match[2]}</span>`
            )
          )
        }
        // Block reference ((block-id))
        else if (match[3]) {
          parts.push(
            createHtml(
              `<span class="logseq-block-ref" data-block-id="${match[3]}">((${match[3]}))</span>`
            )
          )
        }
        // Priority [#A]
        else if (match[4]) {
          parts.push(
            createHtml(
              `<span class="logseq-priority" data-priority="${match[4]}">[#${match[4]}]</span>`
            )
          )
        }
        // Embed page {{embed [[page]]}}
        else if (match[5]) {
          parts.push(
            createHtml(
              `<div class="logseq-embed" data-embed-page="${match[5]}">
                <div class="logseq-embed-header">Embedded: ${match[5]}</div>
              </div>`
            )
          )
        }
        // Embed block {{embed ((block-id))}}
        else if (match[6]) {
          parts.push(
            createHtml(
              `<div class="logseq-embed" data-embed-block="${match[6]}">
                <div class="logseq-embed-header">Embedded Block: ${match[6]}</div>
              </div>`
            )
          )
        }
        // YouTube embed {{youtube URL}}
        else if (match[7]) {
          const url = match[7].trim()
          let videoId = ''

          // Extract video ID from various YouTube URL formats
          const ytRegex =
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
          const ytMatch = url.match(ytRegex)
          if (ytMatch) {
            videoId = ytMatch[1]
          }

          parts.push(
            createHtml(
              `<div class="logseq-youtube" data-video-id="${videoId}">
                <iframe
                  src="https://www.youtube.com/embed/${videoId}"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              </div>`
            )
          )
        }
        // Task markers (TODO, DOING, DONE, LATER, NOW)
        else if (
          match[0] === 'TODO' ||
          match[0] === 'DOING' ||
          match[0] === 'DONE' ||
          match[0] === 'LATER' ||
          match[0] === 'NOW'
        ) {
          parts.push(
            createHtml(
              `<span class="logseq-task" data-status="${match[0].toLowerCase()}">${match[0]}</span>`
            )
          )
        }
        // Properties property:: value
        else if (match[8] && match[9]) {
          parts.push(
            createHtml(
              `<div class="logseq-property">
                <span class="logseq-property-key">${match[8]}</span>
                <span class="logseq-property-value">${match[9]}</span>
              </div>`
            )
          )
        }
        // Superscript X^{super}
        else if (match[10] && match[11]) {
          parts.push(createHtml(`${match[10]}<sup>${match[11]}</sup>`))
        }
        // Subscript X_{sub}
        else if (match[12] && match[13]) {
          parts.push(createHtml(`${match[12]}<sub>${match[13]}</sub>`))
        }

        lastIndex = match.index + match[0].length
      }

      // Add remaining text
      addText(text.slice(lastIndex))

      // Replace node if we found any matches
      if (parts.length > 0) {
        parent.children.splice(index, 1, ...parts)
        return index + parts.length
      }
    })

    // Handle callouts in blockquotes
    visit(tree, 'blockquote', (node: any, index, parent) => {
      if (!parent || index === null || index === undefined) return

      // Check if first child is a paragraph with callout syntax
      const firstChild = node.children[0]
      if (firstChild?.type === 'paragraph') {
        const firstText = firstChild.children[0]
        if (firstText?.type === 'text') {
          const calloutMatch = firstText.value.match(
            /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|INFO|SUCCESS|DANGER)\]/i
          )
          if (calloutMatch) {
            const calloutType = calloutMatch[1].toLowerCase()
            // Remove the callout marker from text
            firstText.value = firstText.value.slice(calloutMatch[0].length).trim()

            // Wrap in callout HTML
            const html = {
              type: 'html',
              value: `<div class="logseq-callout" data-callout-type="${calloutType}">
                <div class="logseq-callout-title">${calloutMatch[1]}</div>
                <div class="logseq-callout-content">`,
            }
            const htmlEnd = {
              type: 'html',
              value: '</div></div>',
            }

            parent.children.splice(index, 1, html, ...node.children, htmlEnd)
            return index + 2 + node.children.length
          }
        }
      }
    })
  }
}
