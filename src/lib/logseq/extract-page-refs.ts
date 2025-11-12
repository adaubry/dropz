/**
 * Extract page references from Logseq markdown content
 *
 * Finds all [[page name]] references in the content
 */
export function extractPageReferences(content: string): string[] {
  const pageRefRegex = /\[\[([^\]]+)\]\]/g;
  const references = new Set<string>();

  let match;
  while ((match = pageRefRegex.exec(content)) !== null) {
    references.add(match[1]);
  }

  return Array.from(references);
}

/**
 * Get unique page references, excluding common patterns
 */
export function getUniquePageReferences(content: string): string[] {
  const refs = extractPageReferences(content);

  // Filter out common non-page references (optional)
  return refs.filter((ref) => {
    // Exclude empty refs
    if (!ref.trim()) return false;

    // You can add more filters here if needed
    // e.g., exclude refs that look like dates, etc.

    return true;
  });
}
