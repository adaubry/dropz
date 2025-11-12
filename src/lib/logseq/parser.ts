/**
 * Logseq File Parser Utilities
 *
 * Handles parsing of Logseq graph structure:
 * - File name conversion (guides___setup___intro.md → guides/setup/intro)
 * - Journal date parsing (2025_11_12.md → 2025-11-12)
 * - Block extraction from markdown
 * - Block UUID extraction
 * - Reference extraction (page refs [[]], block refs (()), embeds {{embed}})
 */

export interface ParsedLogseqFile {
  pageName: string;          // "guides/setup/intro"
  slug: string;              // "intro"
  namespace: string;         // "guides/setup"
  depth: number;             // 2
  isJournal: boolean;        // false
  journalDate: Date | null;  // null or date for journals
  sourceFolder: 'pages' | 'journals';
  fileName: string;          // Original file name
}

export interface LogseqBlock {
  uuid: string | null;       // Block UUID if present
  content: string;           // Block content (without bullets)
  depth: number;             // Indentation level (0 = root)
  properties: Record<string, string>; // Block properties (key:: value)
  references: {
    pageRefs: string[];      // [[page name]]
    blockRefs: string[];     // ((uuid))
    pageEmbeds: string[];    // {{embed [[page]]}}
    blockEmbeds: string[];   // {{embed ((uuid))}}
  };
}

/**
 * Parse Logseq file name to extract page information
 *
 * Examples:
 * - pages/intro.md → { pageName: "intro", namespace: "", depth: 0 }
 * - pages/guides___setup___intro.md → { pageName: "guides/setup/intro", namespace: "guides/setup", depth: 2 }
 * - journals/2025_11_12.md → { pageName: "2025-11-12", isJournal: true, journalDate: Date }
 */
export function parseLogseqFileName(filePath: string): ParsedLogseqFile | null {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Extract folder and filename
  const parts = normalizedPath.split('/');
  const fileName = parts[parts.length - 1];
  const folderName = parts[parts.length - 2];

  // Must be in pages/ or journals/ folder
  if (folderName !== 'pages' && folderName !== 'journals') {
    return null;
  }

  // Remove .md extension
  if (!fileName.endsWith('.md')) {
    return null;
  }
  const nameWithoutExt = fileName.slice(0, -3);

  // Check if it's a journal page
  if (folderName === 'journals') {
    return parseJournalFile(nameWithoutExt, fileName);
  }

  // It's a regular page
  return parsePageFile(nameWithoutExt, fileName);
}

/**
 * Parse journal file name
 * Journals use format: YYYY_MM_DD.md
 */
function parseJournalFile(nameWithoutExt: string, fileName: string): ParsedLogseqFile {
  // Try to parse journal date: 2025_11_12
  const dateMatch = nameWithoutExt.match(/^(\d{4})_(\d{2})_(\d{2})$/);

  let journalDate: Date | null = null;
  let pageName = nameWithoutExt; // Fallback to raw name

  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const day = parseInt(dateMatch[3], 10);
    journalDate = new Date(year, month - 1, day); // month is 0-indexed
    pageName = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  return {
    pageName,
    slug: pageName,
    namespace: '',
    depth: 0,
    isJournal: true,
    journalDate,
    sourceFolder: 'journals',
    fileName,
  };
}

/**
 * Parse regular page file name
 * Pages use format: name.md or namespace___page.md
 * Triple underscore (___) represents forward slash (/) in page names
 */
function parsePageFile(nameWithoutExt: string, fileName: string): ParsedLogseqFile {
  // Convert triple underscore to forward slash
  const pageName = nameWithoutExt.replace(/___/g, '/');

  // Extract namespace and slug
  const segments = pageName.split('/');
  const slug = segments[segments.length - 1];
  const namespace = segments.slice(0, -1).join('/');
  const depth = Math.max(0, segments.length - 1);

  return {
    pageName,
    slug,
    namespace,
    depth,
    isJournal: false,
    journalDate: null,
    sourceFolder: 'pages',
    fileName,
  };
}

/**
 * Parse Logseq markdown content into blocks
 *
 * Logseq format:
 * - Every line starting with `- ` is a block
 * - Indentation creates block hierarchy
 * - Block UUIDs: `id:: uuid`
 * - Properties: `key:: value`
 */
export function parseLogseqMarkdown(content: string): LogseqBlock[] {
  const lines = content.split('\n');
  const blocks: LogseqBlock[] = [];

  let currentBlock: Partial<LogseqBlock> | null = null;
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a block (starts with -)
    const blockMatch = line.match(/^(\s*)-\s(.*)$/);

    if (blockMatch) {
      // Save previous block if exists
      if (currentBlock !== null) {
        blocks.push(finalizeBlock(currentBlock, currentContent));
      }

      // Start new block
      const indentation = blockMatch[1];
      const depth = indentation.length / 2; // 2 spaces per level
      const content = blockMatch[2];

      currentBlock = {
        depth: Math.floor(depth),
        properties: {},
        references: {
          pageRefs: [],
          blockRefs: [],
          pageEmbeds: [],
          blockEmbeds: [],
        },
        uuid: null,
      };
      currentContent = [content];
    } else if (currentBlock !== null) {
      // Continuation of current block (multi-line content)
      currentContent.push(line);
    } else {
      // Content before first block (properties, frontmatter)
      // Skip for now, or handle as page-level properties
    }
  }

  // Save last block
  if (currentBlock !== null) {
    blocks.push(finalizeBlock(currentBlock, currentContent));
  }

  return blocks;
}

/**
 * Finalize a block by parsing its content, properties, and references
 */
function finalizeBlock(block: Partial<LogseqBlock>, contentLines: string[]): LogseqBlock {
  const fullContent = contentLines.join('\n');

  // Extract properties (key:: value)
  const properties: Record<string, string> = {};
  let contentWithoutProps = fullContent;

  // Look for properties in the first few lines of the block
  const propRegex = /^([a-zA-Z0-9_-]+)::\s*(.+)$/gm;
  let match;
  let lastIndex = 0;

  while ((match = propRegex.exec(fullContent)) !== null) {
    const key = match[1];
    const value = match[2].trim();
    properties[key] = value;

    // Special handling for id property (UUID)
    if (key === 'id') {
      block.uuid = value;
    }

    lastIndex = propRegex.lastIndex;
  }

  // Remove properties from content if they were at the beginning
  if (lastIndex > 0 && lastIndex === fullContent.length) {
    contentWithoutProps = '';
  } else if (lastIndex > 0) {
    contentWithoutProps = fullContent.slice(lastIndex).trim();
  }

  // Extract references
  const references = extractReferences(fullContent);

  return {
    uuid: block.uuid || null,
    content: contentWithoutProps || fullContent,
    depth: block.depth || 0,
    properties,
    references,
  };
}

/**
 * Extract all references from content
 * - Page references: [[page name]]
 * - Block references: ((uuid))
 * - Page embeds: {{embed [[page]]}}
 * - Block embeds: {{embed ((uuid))}}
 */
export function extractReferences(content: string): {
  pageRefs: string[];
  blockRefs: string[];
  pageEmbeds: string[];
  blockEmbeds: string[];
} {
  const pageRefs: string[] = [];
  const blockRefs: string[] = [];
  const pageEmbeds: string[] = [];
  const blockEmbeds: string[] = [];

  // Page embeds: {{embed [[page]]}}
  const pageEmbedRegex = /\{\{embed\s+\[\[([^\]]+)\]\]\}\}/g;
  let match;
  while ((match = pageEmbedRegex.exec(content)) !== null) {
    pageEmbeds.push(match[1]);
  }

  // Block embeds: {{embed ((uuid))}}
  const blockEmbedRegex = /\{\{embed\s+\(\(([^)]+)\)\)\}\}/g;
  while ((match = blockEmbedRegex.exec(content)) !== null) {
    blockEmbeds.push(match[1]);
  }

  // Page references: [[page name]] (but not in embeds)
  const pageRefRegex = /\[\[([^\]]+)\]\]/g;
  while ((match = pageRefRegex.exec(content)) !== null) {
    // Skip if this is part of an embed (already captured)
    const beforeMatch = content.slice(Math.max(0, match.index - 10), match.index);
    if (!beforeMatch.includes('{{embed')) {
      pageRefs.push(match[1]);
    }
  }

  // Block references: ((uuid)) (but not in embeds)
  const blockRefRegex = /\(\(([^)]+)\)\)/g;
  while ((match = blockRefRegex.exec(content)) !== null) {
    // Skip if this is part of an embed (already captured)
    const beforeMatch = content.slice(Math.max(0, match.index - 10), match.index);
    if (!beforeMatch.includes('{{embed')) {
      blockRefs.push(match[1]);
    }
  }

  return { pageRefs, blockRefs, pageEmbeds, blockEmbeds };
}

/**
 * Generate a Logseq-compatible UUID v4
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateLogseqUUID(): string {
  return crypto.randomUUID();
}

/**
 * Parse Logseq properties from the beginning of a page
 * Properties appear as first-level blocks with key:: value format
 */
export function parsePageProperties(content: string): Record<string, any> {
  const properties: Record<string, any> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    // Stop at first non-property content
    if (!line.trim().startsWith('-') && line.trim() !== '') {
      break;
    }

    // Extract property from block
    const propMatch = line.match(/^-\s+([a-zA-Z0-9_-]+)::\s*(.+)$/);
    if (propMatch) {
      const key = propMatch[1];
      const value = propMatch[2].trim();

      // Try to parse structured values
      if (value.startsWith('[') && value.endsWith(']')) {
        // Array value: tags:: [tag1, tag2, tag3]
        // But Logseq typically uses: tags:: tag1, tag2, tag3
        // So we split by comma
        properties[key] = value.slice(1, -1).split(',').map(v => v.trim());
      } else if (value.includes(',')) {
        // Comma-separated list: tags:: tag1, tag2, tag3
        properties[key] = value.split(',').map(v => v.trim());
      } else {
        // Simple value
        properties[key] = value;
      }
    }
  }

  return properties;
}

/**
 * Find a specific block by UUID in parsed blocks
 */
export function findBlockByUUID(blocks: LogseqBlock[], uuid: string): LogseqBlock | null {
  return blocks.find(block => block.uuid === uuid) || null;
}

/**
 * Get all block references from a page's content
 * Returns map of UUID → block content for resolution
 */
export function extractBlockMap(blocks: LogseqBlock[]): Map<string, string> {
  const blockMap = new Map<string, string>();

  for (const block of blocks) {
    if (block.uuid) {
      blockMap.set(block.uuid, block.content);
    }
  }

  return blockMap;
}
