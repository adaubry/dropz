import fs from "fs/promises";
import path from "path";
import { unstable_cache } from "./unstable-cache";

const VISIBLE_LINES_COUNT = 30; // Approximate number of lines visible on first screen

/**
 * Get first visible lines of a markdown file
 * This is used for prefetching and caching only what's needed initially
 */
async function getFirstVisibleLinesUncached(filePath: string): Promise<string> {
  const fullContent = await fs.readFile(filePath, "utf-8");
  const lines = fullContent.split("\n");
  const firstLines = lines.slice(0, VISIBLE_LINES_COUNT);
  return firstLines.join("\n");
}

/**
 * Get full markdown content
 * Cached with 2-hour revalidation
 */
async function getFullMarkdownUncached(filePath: string): Promise<string> {
  return await fs.readFile(filePath, "utf-8");
}

/**
 * Cached version of getFirstVisibleLines
 * Cache key includes file path for proper invalidation
 */
export const getFirstVisibleLines = unstable_cache(
  getFirstVisibleLinesUncached,
  ["markdown-first-lines"],
  { revalidate: 60 * 60 * 2, tags: ["markdown"] } // 2 hours
);

/**
 * Cached version of getFullMarkdown
 * Used for full page loads after initial render
 */
export const getFullMarkdown = unstable_cache(
  getFullMarkdownUncached,
  ["markdown-full"],
  { revalidate: 60 * 60 * 2, tags: ["markdown"] } // 2 hours
);

/**
 * Get markdown file path from relative path
 */
export function resolveMarkdownPath(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}
