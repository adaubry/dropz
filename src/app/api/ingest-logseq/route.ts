/**
 * Logseq Graph Import API
 * REVAMPED: Direct markdown processing, bypassing Rust tool for now
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWorkspace } from '@/lib/queries';
import { db } from '@/db';
import { nodes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import matter from 'gray-matter';

// Import markdown processing
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import rehypeHighlight from 'rehype-highlight';

/**
 * Convert markdown to HTML using unified pipeline
 */
async function markdownToHtml(markdown: string): Promise<string> {
  try {
    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeHighlight)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    return String(result);
  } catch (error) {
    console.error('[Logseq Import] Markdown conversion error:', error);
    // Return wrapped markdown as fallback
    return `<pre>${markdown}</pre>`;
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's workspace
    const workspace = await getUserWorkspace(user.id);
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // 3. Get uploaded files
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    console.log(`[Logseq Import] Received ${files.length} files for workspace: ${workspace.slug}`);

    // 4. Process files directly (no temp directory, no Rust tool)
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        // Only process markdown files
        if (!file.name.endsWith('.md')) {
          console.log(`[Logseq Import] Skipping non-markdown file: ${file.name}`);
          skipped++;
          continue;
        }

        // Read file content
        const buffer = Buffer.from(await file.arrayBuffer());
        const content = buffer.toString('utf-8');

        // Parse frontmatter
        const { data: frontmatter, content: markdownContent } = matter(content);

        // Determine source folder (pages or journals)
        const isJournal = file.name.includes('journals/') || /^\d{4}_\d{2}_\d{2}\.md$/.test(file.name);
        const sourceFolder = isJournal ? 'journals' : 'pages';

        // Extract filename without extension and path
        const fileName = file.name
          .replace('pages/', '')
          .replace('journals/', '')
          .replace('.md', '');

        // Convert ___ (triple underscore) to / for namespaces
        // e.g., "Community___Query Learning Sprint" → "Community/Query Learning Sprint"
        const pageName = fileName.replace(/___/g, '/');

        // Extract namespace and slug
        const parts = pageName.split('/');
        const slug = parts[parts.length - 1];
        const namespace = parts.slice(0, -1).join('/');
        const depth = parts.length - 1;

        // Convert markdown to HTML
        console.log(`[Logseq Import] Processing: ${fileName}`);
        console.log(`  → pageName: "${pageName}"`);
        console.log(`  → namespace: "${namespace}"`);
        console.log(`  → slug: "${slug}"`);
        console.log(`  → depth: ${depth}`);

        const parsedHtml = await markdownToHtml(markdownContent);

        console.log(`  → HTML length: ${parsedHtml.length} chars`);

        // Check if page exists
        const existing = await db.query.nodes.findFirst({
          where: and(
            eq(nodes.planet_id, workspace.id),
            eq(nodes.page_name, pageName)
          ),
        });

        const nodeData = {
          planet_id: workspace.id,
          page_name: pageName,
          namespace,
          slug,
          title: frontmatter.title || parts[parts.length - 1],
          type: 'file' as const,
          depth,
          file_path: fileName,

          // Store the rendered HTML
          parsed_html: parsedHtml,

          // Metadata from frontmatter
          metadata: {
            ...frontmatter,
            ingestion_date: new Date().toISOString(),
            original_filename: file.name,
          },

          source_folder: sourceFolder,
          is_journal: isJournal,

          updated_at: new Date(),
        };

        if (existing) {
          // Update existing
          await db.update(nodes)
            .set(nodeData)
            .where(eq(nodes.id, existing.id));
          updated++;
          console.log(`  ✓ Updated: ${pageName}`);
        } else {
          // Create new
          await db.insert(nodes).values({
            ...nodeData,
            created_at: new Date(),
          });
          created++;
          console.log(`  ✓ Created: ${pageName}`);
        }
      } catch (err: any) {
        console.error(`[Logseq Import] Failed to process ${file.name}:`, err.message);
        skipped++;
      }
    }

    // 5. Create virtual folder nodes
    await createLogseqFolders(workspace.id);

    // 6. Invalidate cache
    revalidateTag(`planet-${workspace.id}`);

    const duration = Date.now() - startTime;
    console.log(`[Logseq Import] Complete in ${duration}ms: ${created} created, ${updated} updated, ${skipped} skipped`);

    return NextResponse.json({
      success: true,
      stats: {
        created,
        updated,
        skipped,
        total: files.length,
        duration,
      },
    });

  } catch (error: any) {
    console.error('[Logseq Import] IMPORT FAILED');
    console.error('[Logseq Import] Error:', error.message);
    console.error('[Logseq Import] Stack:', error.stack);

    return NextResponse.json(
      {
        error: 'Import failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Create virtual /pages and /journals folder nodes
 */
async function createLogseqFolders(planetId: number) {
  try {
    // Create "pages" folder
    const pagesExists = await db.query.nodes.findFirst({
      where: and(
        eq(nodes.planet_id, planetId),
        eq(nodes.slug, 'pages'),
        eq(nodes.namespace, '')
      ),
    });

    if (!pagesExists) {
      await db.insert(nodes).values({
        planet_id: planetId,
        slug: 'pages',
        title: 'Pages',
        namespace: '',
        type: 'folder',
        depth: 0,
        file_path: 'pages',
        metadata: {
          isLogseqFolder: true,
          summary: 'Logseq pages folder',
        },
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log('[Logseq Import] Created "pages" folder');
    }

    // Create "journals" folder
    const journalsExists = await db.query.nodes.findFirst({
      where: and(
        eq(nodes.planet_id, planetId),
        eq(nodes.slug, 'journals'),
        eq(nodes.namespace, '')
      ),
    });

    if (!journalsExists) {
      await db.insert(nodes).values({
        planet_id: planetId,
        slug: 'journals',
        title: 'Journals',
        namespace: '',
        type: 'folder',
        depth: 0,
        file_path: 'journals',
        metadata: {
          isLogseqFolder: true,
          summary: 'Logseq journals folder',
        },
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log('[Logseq Import] Created "journals" folder');
    }
  } catch (err) {
    console.error('[Logseq Import] Error creating folders:', err);
  }
}
