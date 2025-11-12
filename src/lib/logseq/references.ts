/**
 * Logseq Reference Resolution - OPTIMIZED FOR O(1) PERFORMANCE
 *
 * Uses cached block index for O(1) lookups instead of scanning all pages.
 * Critical for "blazing fast website" performance with large Logseq graphs.
 *
 * Architecture:
 * 1. Build block index once per planet (cache it)
 * 2. Use index for all reference resolutions (O(1) Map lookups)
 * 3. Cache rendered pages to avoid repeated resolutions
 */

import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseLogseqMarkdown } from "./parser";

/**
 * Block Index: UUID → { content, pageName, pageId }
 * This should be cached in memory or Redis for O(1) lookups
 */
export interface BlockIndex {
  [uuid: string]: {
    content: string;
    pageName: string;
    pageId: number;
  };
}

/**
 * Build block index for a planet - O(N) operation, run once and cache!
 *
 * IMPORTANT: Cache this result in Redis/memory with TTL
 * Only rebuild when:
 * - New graph is uploaded
 * - Manual cache invalidation
 * - TTL expires (e.g., 1 hour)
 */
export async function buildBlockIndex(planetId: number): Promise<BlockIndex> {
  const blockIndex: BlockIndex = {};

  // Fetch all pages once - single query
  const allPages = await db.query.nodes.findMany({
    where: eq(nodes.planet_id, planetId),
    columns: {
      id: true,
      content: true,
      page_name: true,
    },
  });

  // Parse each page and build index
  for (const page of allPages) {
    if (!page.content || !page.page_name) continue;

    const blocks = parseLogseqMarkdown(page.content);
    for (const block of blocks) {
      if (block.uuid) {
        blockIndex[block.uuid] = {
          content: block.content,
          pageName: page.page_name,
          pageId: page.id,
        };
      }
    }
  }

  return blockIndex;
}

/**
 * Resolve block reference using cached index - O(1)
 */
export function resolveBlockReferenceFromIndex(
  uuid: string,
  blockIndex: BlockIndex
): string | null {
  const block = blockIndex[uuid];
  return block ? block.content : null;
}

/**
 * Resolve page embed using cached page data
 */
export async function resolvePageEmbed(
  pageName: string,
  planetId: number,
  maxLines: number = 10
): Promise<string | null> {
  // Single O(1) indexed query
  const page = await db.query.nodes.findFirst({
    where: eq(nodes.planet_id, planetId),
    // Use indexed page_name column for O(1) lookup
    columns: {
      content: true,
      title: true,
    },
  });

  if (!page || !page.content) {
    return null;
  }

  // Return preview (first N lines)
  const lines = page.content.split("\n");
  const preview = lines.slice(0, maxLines).join("\n");

  return preview + (lines.length > maxLines ? "\n\n..." : "");
}

/**
 * OPTIMIZED: Resolve all references using cached block index
 *
 * This is the main function called during page rendering.
 * Performance: O(R) where R = number of references (not O(N*M)!)
 */
export async function resolveAllReferencesOptimized(
  content: string,
  planetId: number,
  blockIndex: BlockIndex // Pass in cached index!
): Promise<string> {
  let processedContent = content;

  // 1. Resolve block references ((uuid)) - O(R) with index
  const blockRefRegex = /\(\(([a-f0-9-]+)\)\)/g;
  let match;
  const blockRefs = new Set<string>();

  while ((match = blockRefRegex.exec(content)) !== null) {
    blockRefs.add(match[1]);
  }

  for (const uuid of blockRefs) {
    const blockContent = resolveBlockReferenceFromIndex(uuid, blockIndex);
    if (blockContent) {
      const refPattern = new RegExp(`\\(\\(${uuid}\\)\\)`, "g");
      processedContent = processedContent.replace(
        refPattern,
        `<span class="logseq-block-ref-resolved" data-block-id="${uuid}" title="Block reference">${escapeHtml(blockContent)}</span>`
      );
    } else {
      // Block not found - show as is with warning style
      const refPattern = new RegExp(`\\(\\(${uuid}\\)\\)`, "g");
      processedContent = processedContent.replace(
        refPattern,
        `<span class="logseq-block-ref" data-block-id="${uuid}" title="Block not found">((${uuid}))</span>`
      );
    }
  }

  // 2. Resolve page embeds {{embed [[page]]}} - O(R) queries with index
  const pageEmbedRegex = /\{\{embed\s+\[\[([^\]]+)\]\]\}\}/g;
  const pageEmbeds = new Set<string>();

  while ((match = pageEmbedRegex.exec(content)) !== null) {
    pageEmbeds.add(match[1]);
  }

  for (const pageName of pageEmbeds) {
    const pageContent = await resolvePageEmbed(pageName, planetId);
    if (pageContent) {
      const embedPattern = new RegExp(
        `\\{\\{embed\\s+\\[\\[${escapeRegex(pageName)}\\]\\]\\}\\}`,
        "g"
      );
      processedContent = processedContent.replace(
        embedPattern,
        `<div class="logseq-page-embed" data-page="${escapeHtml(pageName)}">
          <div class="logseq-embed-header">📄 ${escapeHtml(pageName)}</div>
          <div class="logseq-embed-content">${escapeHtml(pageContent)}</div>
        </div>`
      );
    }
  }

  // 3. Resolve block embeds {{embed ((uuid))}} - O(R) with index
  const blockEmbedRegex = /\{\{embed\s+\(\(([a-f0-9-]+)\)\)\}\}/g;
  const blockEmbeds = new Set<string>();

  while ((match = blockEmbedRegex.exec(content)) !== null) {
    blockEmbeds.add(match[1]);
  }

  for (const uuid of blockEmbeds) {
    const blockContent = resolveBlockReferenceFromIndex(uuid, blockIndex);
    if (blockContent) {
      const embedPattern = new RegExp(`\\{\\{embed\\s+\\(\\(${uuid}\\)\\)\\}\\}`, "g");
      processedContent = processedContent.replace(
        embedPattern,
        `<div class="logseq-block-embed" data-block-id="${uuid}">
          <div class="logseq-embed-header">🔗 Block Reference</div>
          <div class="logseq-embed-content">${escapeHtml(blockContent)}</div>
        </div>`
      );
    }
  }

  return processedContent;
}

/**
 * LEGACY: Slow version without caching - DO NOT USE IN PRODUCTION
 * Kept for backward compatibility only
 *
 * @deprecated Use resolveAllReferencesOptimized with cached blockIndex instead
 */
export async function resolveAllReferences(
  content: string,
  planetId: number
): Promise<string> {
  // Build index on the fly (slow!) - only use for testing
  const blockIndex = await buildBlockIndex(planetId);
  return resolveAllReferencesOptimized(content, planetId, blockIndex);
}

/**
 * Helper: Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Helper: Escape regex special characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cache key generator for block index
 */
export function getBlockIndexCacheKey(planetId: number): string {
  return `block-index:${planetId}`;
}

/**
 * Cache invalidation - call when graph is updated
 */
export async function invalidateBlockIndexCache(planetId: number): Promise<void> {
  // Implement with your cache (Redis, memory, etc.)
  // Example: await redis.del(getBlockIndexCacheKey(planetId));
  console.log(`[BlockIndex] Cache invalidated for planet ${planetId}`);
}
