/**
 * Logseq Markdown Renderer - Complete Implementation
 *
 * Converts Logseq syntax to proper HTML with actual working links.
 * This is the CORE renderer that makes Logseq features work.
 *
 * Features:
 * - Page references [[page]] → Clickable links
 * - Block references ((uuid)) → Resolved content with links
 * - Page embeds {{embed [[page]]}} → Full embedded pages
 * - Block embeds {{embed ((uuid))}} → Embedded blocks
 * - Properties, tasks, highlights, etc.
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
  blockIndex: BlockIndex
): Promise<string> {
  let processed = content;

  // 1. Convert page references [[page]] to actual markdown links
  processed = await convertPageReferences(processed, planetSlug);

  // 2. Convert block references ((uuid)) to resolved content with links
  processed = convertBlockReferences(processed, blockIndex, planetSlug);

  // 3. Convert page embeds {{embed [[page]]}} to embedded content
  processed = await convertPageEmbeds(processed, planetId, planetSlug);

  // 4. Convert block embeds {{embed ((uuid))}} to embedded content
  processed = convertBlockEmbeds(processed, blockIndex, planetSlug);

  // 5. Convert properties (key:: value) to formatted display
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
 * Convert [[page name]] to actual markdown links: [page name](/planet/page-name)
 */
async function convertPageReferences(
  content: string,
  planetSlug: string
): Promise<string> {
  const pageRefRegex = /\[\[([^\]]+)\]\]/g;
  let processed = content;

  const matches = Array.from(content.matchAll(pageRefRegex));

  for (const match of matches) {
    const pageName = match[1];
    // URL-encode the page name for the href (handles spaces)
    const encodedPageName = pageName
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    // Create actual markdown link that will be rendered as <a> tag
    const markdownLink = `[${pageName}](/${planetSlug}/${encodedPageName})`;

    // Replace the Logseq syntax with markdown syntax
    processed = processed.replace(match[0], markdownLink);
  }

  return processed;
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
  let processed = content;

  const matches = Array.from(content.matchAll(blockRefRegex));

  for (const match of matches) {
    const uuid = match[1];
    const block = blockIndex[uuid];

    if (block) {
      // Create a styled quote with link to the source page
      const encodedPageName = block.pageName
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/");

      const replacement = `<span class="logseq-block-ref-resolved">
        <a href="/${planetSlug}/${encodedPageName}" class="logseq-block-ref-link" title="From: ${escapeHtml(block.pageName)}">
          ${escapeHtml(block.content)}
        </a>
      </span>`;

      processed = processed.replace(match[0], replacement);
    } else {
      // Block not found - show placeholder
      const replacement = `<span class="logseq-block-ref-missing" title="Block not found">((${uuid}))</span>`;
      processed = processed.replace(match[0], replacement);
    }
  }

  return processed;
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
  let processed = content;

  const matches = Array.from(content.matchAll(pageEmbedRegex));

  for (const match of matches) {
    const pageName = match[1];

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

      processed = processed.replace(match[0], replacement);
    } else {
      // Page not found
      const replacement = `<div class="logseq-page-embed logseq-embed-missing">
  <div class="logseq-embed-header">📄 ${escapeHtml(pageName)} (not found)</div>
</div>`;
      processed = processed.replace(match[0], replacement);
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
  let processed = content;

  const matches = Array.from(content.matchAll(blockEmbedRegex));

  for (const match of matches) {
    const uuid = match[1];
    const block = blockIndex[uuid];

    if (block) {
      const encodedPageName = block.pageName
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/");

      const replacement = `<div class="logseq-block-embed">
  <div class="logseq-embed-header">
    <span>🔗</span>
    <a href="/${planetSlug}/${encodedPageName}">Block from ${escapeHtml(block.pageName)}</a>
  </div>
  <div class="logseq-embed-content">
${escapeHtml(block.content)}
  </div>
</div>`;

      processed = processed.replace(match[0], replacement);
    } else {
      const replacement = `<div class="logseq-block-embed logseq-embed-missing">
  <div class="logseq-embed-header">🔗 Block not found</div>
</div>`;
      processed = processed.replace(match[0], replacement);
    }
  }

  return processed;
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
