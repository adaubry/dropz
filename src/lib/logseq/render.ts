/**
 * Logseq Markdown Renderer - Complete Implementation  *
 * Converts Logseq syntax to proper HTML/Markdown with actual working links.
 */

import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { BlockIndex } from "./references";

/**
 * Pre-process Logseq content to convert special syntax to HTML/Markdown
 * This runs BEFORE MDX compilation
 */
export async function processLogseqContent(
  content: string,
  planetId: number,
  planetSlug: string,
  blockIndex: BlockIndex,
  currentPageName: string
): Promise<string> {
  let processed = content;

  // IMPORTANT: Order matters! Do embeds first (they contain references)

  // 1. Convert page embeds {{embed [[page]]}} FIRST
  processed = await convertPageEmbeds(processed, planetId, planetSlug);

  // 2. Convert block embeds {{embed ((uuid))}}
  processed = convertBlockEmbeds(processed, blockIndex, planetSlug);

  // 3. Convert block references ((uuid)) to resolved content
  processed = convertBlockReferences(processed, blockIndex, planetSlug);

  // 4. Convert page references [[page]] to markdown links (do this AFTER embeds!)
  processed = convertPageReferences(processed, planetSlug, currentPageName);

  // 5. Convert properties (key:: value)
  processed = convertProperties(processed);

  // 6. Convert task markers (TODO, DOING, DONE, etc.)
  processed = convertTaskMarkers(processed);

  // 7. Convert highlights ==text==
  processed = convertHighlights(processed);

  // 8. Convert priority tags [#A], [#B], [#C]
  processed = convertPriorities(processed);

  return processed;
}

/**
 * Convert [[page name]] to actual markdown links
 * Uses replaceAll with callback for proper handling of multiple references
 */
function convertPageReferences(
  content: string,
  planetSlug: string,
  currentPageName: string
): string {
  const pageRefRegex = /\[\[([^\]]+)\]\]/g;

  return content.replace(pageRefRegex, (match, pageName) => {
    // Determine folder from current page or reference
    let fullPath: string;

    if (pageName.startsWith('pages/') || pageName.startsWith('journals/')) {
      // Already has folder prefix (e.g., [[pages/intro]])
      fullPath = pageName;
    } else {
      // Infer folder from current page's location
      // If current page is "pages/something", referenced page is also in "pages"
      // If current page is "journals/2025-11-12", referenced page is in "pages" by default
      const currentFolder = currentPageName.startsWith('journals/') ? 'pages' : 'pages';
      fullPath = `${currentFolder}/${pageName}`;
    }

    // URL-encode the full path for the href (handles spaces)
    const encodedPath = fullPath
      .split("/")
      .map((segment: string) => encodeURIComponent(segment))
      .join("/");

    // Create actual markdown link that will be rendered as <a> tag
    return `[${pageName}](/${planetSlug}/${encodedPath})`;
  });
}

/**
 * Convert ((uuid)) to resolved block content
 */
function convertBlockReferences(
  content: string,
  blockIndex: BlockIndex,
  planetSlug: string
): string {
  const blockRefRegex = /\(\(([a-f0-9-]+)\)\)/g;

  return content.replace(blockRefRegex, (match, uuid) => {
    const block = blockIndex[uuid];

    if (block) {
      // Create a styled quote with link to the source page
      const encodedPageName = block.pageName
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/");

      return `<span class="logseq-block-ref-resolved"><a href="/${planetSlug}/${encodedPageName}" class="logseq-block-ref-link" title="From: ${escapeHtml(block.pageName)}">${escapeHtml(block.content)}</a></span>`;
    } else {
      // Block not found - show placeholder
      return `<span class="logseq-block-ref-missing" title="Block not found">((${uuid}))</span>`;
    }
  });
}

/**
 * Convert {{embed [[page]]}} to embedded page content
 */
async function convertPageEmbeds(
  content: string,
  planetId: number,
  planetSlug: string
): Promise<string> {
  const pageEmbedRegex = /\{\{embed\s+\[\[([^\]]+)\]\]\}\}/g;

  // Find all embeds first
  const embeds: Array<{ match: string; pageName: string }> = [];
  let match;
  while ((match = pageEmbedRegex.exec(content)) !== null) {
    embeds.push({ match: match[0], pageName: match[1] });
  }

  // Process each embed
  let processed = content;
  for (const embed of embeds) {
    const { match: embedMatch, pageName } = embed;

    // Fetch the page content
    const page = await db.query.nodes.findFirst({
      where: and(eq(nodes.planet_id, planetId), eq(nodes.page_name, pageName)),
      columns: {
        content: true,
        title: true,
      },
    });

    if (page && page.content) {
      // Get first 15 lines as preview
      const lines = page.content.split("\n");
      const preview = lines.slice(0, 15).join("\n");
      const hasMore = lines.length > 15;

      const encodedPageName = pageName
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/");

      const replacement = `<div class="logseq-page-embed">
  <div class="logseq-embed-header">
    <span>📄</span>
    <a href="/${planetSlug}/${encodedPageName}">${escapeHtml(pageName)}</a>
  </div>
  <div class="logseq-embed-content">
${escapeHtml(preview)}${hasMore ? "\n\n..." : ""}
  </div>
</div>`;

      processed = processed.replace(embedMatch, replacement);
    } else {
      // Page not found
      const replacement = `<div class="logseq-page-embed logseq-embed-missing">
  <div class="logseq-embed-header">📄 ${escapeHtml(pageName)} (not found)</div>
</div>`;
      processed = processed.replace(embedMatch, replacement);
    }
  }

  return processed;
}

/**
 * Convert {{embed ((uuid))}} to embedded block content
 */
function convertBlockEmbeds(
  content: string,
  blockIndex: BlockIndex,
  planetSlug: string
): string {
  const blockEmbedRegex = /\{\{embed\s+\(\(([a-f0-9-]+)\)\)\}\}/g;

  return content.replace(blockEmbedRegex, (match, uuid) => {
    const block = blockIndex[uuid];

    if (block) {
      const encodedPageName = block.pageName
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/");

      return `<div class="logseq-block-embed">
  <div class="logseq-embed-header">
    <span>🔗</span>
    <a href="/${planetSlug}/${encodedPageName}">Block from ${escapeHtml(block.pageName)}</a>
  </div>
  <div class="logseq-embed-content">
${escapeHtml(block.content)}
  </div>
</div>`;
    } else {
      return `<div class="logseq-block-embed logseq-embed-missing">
  <div class="logseq-embed-header">🔗 Block not found</div>
</div>`;
    }
  });
}

/**
 * Convert property:: value to formatted display
 */
function convertProperties(content: string): string {
  const propertyRegex = /^(\w+)::\s*(.+)$/gm;

  return content.replace(
    propertyRegex,
    '<div class="logseq-property"><span class="logseq-property-key">$1::</span> <span class="logseq-property-value">$2</span></div>'
  );
}

/**
 * Convert task markers: TODO, DOING, DONE, LATER, NOW
 */
function convertTaskMarkers(content: string): string {
  const taskRegex = /^(\s*[-*]?\s*)(TODO|DOING|DONE|LATER|NOW)(\s)/gm;

  return content.replace(
    taskRegex,
    (match, prefix, status, suffix) =>
      `${prefix}<span class="logseq-task logseq-task-${status.toLowerCase()}">${status}</span>${suffix}`
  );
}

/**
 * Convert ==highlight== to highlighted text
 */
function convertHighlights(content: string): string {
  const highlightRegex = /==([^=]+)==/g;

  return content.replace(
    highlightRegex,
    '<mark class="logseq-highlight">$1</mark>'
  );
}

/**
 * Convert priority tags [#A], [#B], [#C]
 */
function convertPriorities(content: string): string {
  const priorityRegex = /\[#([ABC])\]/g;

  return content.replace(
    priorityRegex,
    '<span class="logseq-priority logseq-priority-$1">[#$1]</span>'
  );
}

/**
 * Helper: Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
