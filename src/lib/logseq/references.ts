/**
 * Logseq Reference Resolution
 *
 * Resolves block references ((uuid)) and page embeds {{embed [[page]]}}
 * by fetching content from the database and replacing placeholders.
 */

import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { parseLogseqMarkdown, type LogseqBlock } from "./parser";

/**
 * Resolve a block reference by UUID
 * Returns the block content if found, or a fallback message
 */
export async function resolveBlockReference(
  uuid: string,
  planetId: number
): Promise<string | null> {
  // Find all pages in this planet
  const allPages = await db.query.nodes.findMany({
    where: eq(nodes.planet_id, planetId),
    columns: {
      id: true,
      content: true,
      page_name: true,
    },
  });

  // Search through all pages for the block with this UUID
  for (const page of allPages) {
    if (!page.content) continue;

    const blocks = parseLogseqMarkdown(page.content);
    const block = blocks.find((b) => b.uuid === uuid);

    if (block) {
      return block.content;
    }
  }

  return null;
}

/**
 * Resolve a page embed
 * Returns the full page content (or first N lines)
 */
export async function resolvePageEmbed(
  pageName: string,
  planetId: number,
  maxLines: number = 10
): Promise<string | null> {
  const page = await db.query.nodes.findFirst({
    where: and(eq(nodes.planet_id, planetId), eq(nodes.page_name, pageName)),
    columns: {
      content: true,
      title: true,
    },
  });

  if (!page || !page.content) {
    return null;
  }

  // Return first N lines of content for embed preview
  const lines = page.content.split("\n");
  const preview = lines.slice(0, maxLines).join("\n");

  return preview + (lines.length > maxLines ? "\n..." : "");
}

/**
 * Resolve block embed
 * Same as block reference but wrapped in a styled container
 */
export async function resolveBlockEmbed(
  uuid: string,
  planetId: number
): Promise<string | null> {
  return resolveBlockReference(uuid, planetId);
}

/**
 * Replace all block references in content with actual content
 * This is a server-side processing function
 */
export async function resolveAllReferences(
  content: string,
  planetId: number
): Promise<string> {
  let processedContent = content;

  // Find all block references ((uuid))
  const blockRefRegex = /\(\(([a-f0-9-]+)\)\)/g;
  const blockRefs: string[] = [];
  let match;

  while ((match = blockRefRegex.exec(content)) !== null) {
    blockRefs.push(match[1]);
  }

  // Resolve each block reference
  for (const uuid of blockRefs) {
    const blockContent = await resolveBlockReference(uuid, planetId);
    if (blockContent) {
      // Replace the reference with actual content (inline)
      const refPattern = new RegExp(`\\(\\(${uuid}\\)\\)`, "g");
      processedContent = processedContent.replace(
        refPattern,
        `<span class="logseq-block-ref-resolved" data-block-id="${uuid}" title="Block reference">${blockContent}</span>`
      );
    }
  }

  // Find all page embeds {{embed [[page]]}}
  const pageEmbedRegex = /\{\{embed\s+\[\[([^\]]+)\]\]\}\}/g;
  const pageEmbeds: string[] = [];

  while ((match = pageEmbedRegex.exec(content)) !== null) {
    pageEmbeds.push(match[1]);
  }

  // Resolve each page embed
  for (const pageName of pageEmbeds) {
    const pageContent = await resolvePageEmbed(pageName, planetId);
    if (pageContent) {
      const embedPattern = new RegExp(
        `\\{\\{embed\\s+\\[\\[${pageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]\\}\\}`,
        "g"
      );
      processedContent = processedContent.replace(
        embedPattern,
        `<div class="logseq-page-embed" data-page="${pageName}">
          <div class="logseq-embed-header">📄 ${pageName}</div>
          <div class="logseq-embed-content">${pageContent}</div>
        </div>`
      );
    }
  }

  // Find all block embeds {{embed ((uuid))}}
  const blockEmbedRegex = /\{\{embed\s+\(\(([a-f0-9-]+)\)\)\}\}/g;
  const blockEmbeds: string[] = [];

  while ((match = blockEmbedRegex.exec(content)) !== null) {
    blockEmbeds.push(match[1]);
  }

  // Resolve each block embed
  for (const uuid of blockEmbeds) {
    const blockContent = await resolveBlockEmbed(uuid, planetId);
    if (blockContent) {
      const embedPattern = new RegExp(`\\{\\{embed\\s+\\(\\(${uuid}\\)\\)\\}\\}`, "g");
      processedContent = processedContent.replace(
        embedPattern,
        `<div class="logseq-block-embed" data-block-id="${uuid}">
          <div class="logseq-embed-header">🔗 Block Reference</div>
          <div class="logseq-embed-content">${blockContent}</div>
        </div>`
      );
    }
  }

  return processedContent;
}

/**
 * Extract all block UUIDs from a page's content
 * Used for building a block UUID index
 */
export function extractBlockUUIDs(content: string): string[] {
  const blocks = parseLogseqMarkdown(content);
  return blocks.filter((b) => b.uuid).map((b) => b.uuid!);
}

/**
 * Build a block UUID → content map for fast lookups
 * This can be cached for performance
 */
export async function buildBlockIndex(
  planetId: number
): Promise<Map<string, { content: string; pageName: string }>> {
  const blockIndex = new Map<
    string,
    { content: string; pageName: string }
  >();

  const allPages = await db.query.nodes.findMany({
    where: eq(nodes.planet_id, planetId),
    columns: {
      id: true,
      content: true,
      page_name: true,
    },
  });

  for (const page of allPages) {
    if (!page.content || !page.page_name) continue;

    const blocks = parseLogseqMarkdown(page.content);
    for (const block of blocks) {
      if (block.uuid) {
        blockIndex.set(block.uuid, {
          content: block.content,
          pageName: page.page_name,
        });
      }
    }
  }

  return blockIndex;
}

/**
 * Fast block resolution using pre-built index
 */
export function resolveBlockReferenceFromIndex(
  uuid: string,
  blockIndex: Map<string, { content: string; pageName: string }>
): string | null {
  const block = blockIndex.get(uuid);
  return block ? block.content : null;
}
