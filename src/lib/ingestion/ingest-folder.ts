/**
 * File Ingestion System
 *
 * ⚠️ DEPRECATED: This ingestion system populates the deprecated 'content' field.
 * For Logseq graphs, use the Rust export tool via /api/ingest-logseq instead.
 *
 * Recursively scans a folder structure and ingests markdown files
 * into the nodes table with proper namespace hierarchy.
 *
 * Features:
 * - Supports ANY folder depth (Problem 7 solution!)
 * - Extracts frontmatter and caches in metadata JSONB
 * - Generates virtual folders automatically
 * - Parses markdown to HTML and caches it
 * - Updates existing nodes if modified
 *
 * NOTE: This system should only be used for non-Logseq content.
 */

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { nodes, planets, type NewNode } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface IngestionOptions {
  planetSlug: string;
  rootPath: string;
  clearExisting?: boolean;
  userId?: number; // Optional: Assign to specific user's workspace
}

export async function ingestFolder({
  planetSlug,
  rootPath,
  clearExisting = false,
  userId,
}: IngestionOptions) {
  console.log(`🌊 Starting ingestion for planet: ${planetSlug}`);
  console.log(`📂 Root path: ${rootPath}`);
  if (userId) {
    console.log(`👤 User ID: ${userId}`);
  }

  // Get or create planet
  let planet = await db.query.planets.findFirst({
    where: eq(planets.slug, planetSlug),
  });

  if (!planet) {
    console.log(`🆕 Creating new planet: ${planetSlug}`);
    [planet] = await db
      .insert(planets)
      .values({
        name: planetSlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        slug: planetSlug,
        description: `Auto-generated planet from folder ingestion`,
        user_id: userId || null, // Assign to user if provided
      })
      .returning();
  } else if (userId && !planet.user_id) {
    // Update planet with user_id if it doesn't have one
    console.log(`🔗 Assigning planet to user ${userId}`);
    [planet] = await db
      .update(planets)
      .set({ user_id: userId })
      .where(eq(planets.id, planet.id))
      .returning();
  }

  // Clear existing nodes if requested
  if (clearExisting) {
    console.log(`🗑️  Clearing existing nodes...`);
    await db.delete(nodes).where(eq(nodes.planet_id, planet.id));
  }

  // Read all files recursively
  const files = await getAllMarkdownFiles(rootPath);
  console.log(`📄 Found ${files.length} markdown files`);

  // Process each file
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      await ingestFile(planet.id, rootPath, file);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to ingest ${file}:`, error);
      errorCount++;
    }
  }

  // Generate virtual folders
  console.log(`🗂️  Generating virtual folders...`);
  await generateVirtualFolders(planet.id);

  console.log(`\n✅ Ingestion complete!`);
  console.log(`   - Success: ${successCount} files`);
  console.log(`   - Errors: ${errorCount} files`);

  // Invalidate caches after ingestion
  revalidateTag("planets");
  revalidateTag("nodes");

  return { successCount, errorCount, planet };
}

async function getAllMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip hidden directories and node_modules
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        files.push(...(await getAllMarkdownFiles(fullPath)));
      }
    } else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function ingestFile(
  planetId: number,
  rootPath: string,
  filePath: string
) {
  const relativePath = path.relative(rootPath, filePath);
  const segments = relativePath.split(path.sep);

  // Extract slug and namespace
  const fileName = segments[segments.length - 1];
  const slug = fileName.replace(/\.mdx?$/, "");
  const namespace = segments.slice(0, -1).join("/");
  const depth = segments.length - 1;

  // Read and parse markdown
  const fileContent = await fs.readFile(filePath, "utf-8");
  const { data: frontmatter, content } = matter(fileContent);

  // Extract metadata
  const metadata = {
    cover: frontmatter.cover || null,
    summary: frontmatter.summary || extractSummary(content),
    tags: frontmatter.tags || [],
    date: frontmatter.date || null,
    author: frontmatter.author || null,
    ...frontmatter,
  };

  // Get file stats
  const stats = await fs.stat(filePath);

  // Parse markdown to HTML (simple version - we can enhance this later)
  const parsedHtml = await markdownToHtml(content);

  // Check if node already exists
  const existing = await db.query.nodes.findFirst({
    where: and(
      eq(nodes.planet_id, planetId),
      eq(nodes.file_path, relativePath)
    ),
  });

  const nodeData: NewNode = {
    planet_id: planetId,
    slug,
    title: frontmatter.title || slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    namespace,
    depth,
    file_path: relativePath,
    type: "file",
    content: fileContent,
    parsed_html: parsedHtml,
    metadata,
    order: frontmatter.sidebar_position || frontmatter.order || 0,
    file_modified_at: stats.mtime,
  };

  if (existing) {
    // Update existing node
    await db
      .update(nodes)
      .set({
        ...nodeData,
        updated_at: new Date(),
      })
      .where(eq(nodes.id, existing.id));
    console.log(`  ↻ Updated: ${relativePath}`);
  } else {
    // Insert new node
    await db.insert(nodes).values(nodeData);
    console.log(`  ✓ Ingested: ${relativePath}`);
  }
}

function extractSummary(content: string, length = 150): string {
  // Remove markdown syntax and get first paragraph
  const plainText = content
    .replace(/^#+\s+/gm, "") // headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/`(.+?)`/g, "$1") // code
    .replace(/\n{2,}/g, "\n\n") // multiple newlines
    .trim();

  const firstParagraph = plainText.split("\n\n")[0];
  return firstParagraph.length > length
    ? firstParagraph.slice(0, length) + "..."
    : firstParagraph;
}

async function generateVirtualFolders(planetId: number) {
  // Get all file nodes
  const fileNodes = await db.query.nodes.findMany({
    where: and(eq(nodes.planet_id, planetId), eq(nodes.type, "file")),
  });

  // Collect all unique namespace paths
  const folderPaths = new Set<string>();

  for (const file of fileNodes) {
    if (!file.namespace) continue;

    const segments = file.namespace.split("/");

    // Create all intermediate folder paths
    for (let i = 0; i < segments.length; i++) {
      const partialPath = segments.slice(0, i + 1).join("/");
      folderPaths.add(partialPath);
    }
  }

  // Create folder nodes
  let createdCount = 0;
  for (const folderPath of folderPaths) {
    const segments = folderPath.split("/");
    const slug = segments[segments.length - 1];
    const namespace = segments.slice(0, -1).join("/");
    const depth = segments.length - 1;

    // Check if folder already exists
    const existing = await db.query.nodes.findFirst({
      where: and(
        eq(nodes.planet_id, planetId),
        eq(nodes.namespace, namespace),
        eq(nodes.slug, slug),
        eq(nodes.type, "folder")
      ),
    });

    if (!existing) {
      await db.insert(nodes).values({
        planet_id: planetId,
        slug,
        title: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        namespace,
        depth,
        file_path: folderPath,
        type: "folder",
        metadata: { auto_generated: true },
      });

      console.log(`  ✓ Created folder: ${folderPath}`);
      createdCount++;
    }
  }

  console.log(`   - Created ${createdCount} virtual folders`);
}

/**
 * Markdown to HTML converter with Logseq support
 * Uses the same processing pipeline as the markdown-page component
 */
async function markdownToHtml(markdown: string): Promise<string> {
  try {
    // Import all required plugins
    const { unified } = await import("unified");
    const { default: remarkParse } = await import("remark-parse");
    const { default: remarkGfm } = await import("remark-gfm");
    const { remarkLogseq } = await import("@/lib/remark-logseq");
    const { default: remarkRehype } = await import("remark-rehype");
    const { default: rehypeRaw } = await import("rehype-raw");
    const { default: rehypeHighlight } = await import("rehype-highlight");
    const { default: rehypeStringify } = await import("rehype-stringify");

    const result = await unified()
      .use(remarkParse)
      // remarkLogseq must run before remarkGfm to prevent autolink from interfering
      .use(remarkLogseq)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw) // Process raw HTML from remark-logseq
      .use(rehypeHighlight)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    return String(result);
  } catch (error) {
    console.error("Failed to parse markdown:", error);
    // Fallback: return raw markdown wrapped in pre tag
    return `<pre>${markdown}</pre>`;
  }
}
