/**
 * Logseq Graph Import API
 * Uses Rust export tool to convert Logseq graphs to pre-rendered HTML
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWorkspace } from '@/lib/queries';
import { RustExportService } from '@/services/rust-export';
import { db } from '@/db';
import { nodes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
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

    console.log(`[Logseq Import] Received ${files.length} files`);

    // 4. Extract files to temp directory
    const tempDir = path.join(os.tmpdir(), `logseq-graph-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create pages and journals directories
    const pagesDir = path.join(tempDir, 'pages');
    const journalsDir = path.join(tempDir, 'journals');
    await fs.mkdir(pagesDir, { recursive: true });
    await fs.mkdir(journalsDir, { recursive: true });

    // Write files to temp directory
    for (const file of files) {
      const fileName = file.name;
      let targetPath: string;

      // Determine if this is a page or journal file
      if (fileName.includes('journals/') || fileName.match(/^\d{4}_\d{2}_\d{2}\.md$/)) {
        targetPath = path.join(journalsDir, fileName.replace('journals/', ''));
      } else {
        targetPath = path.join(pagesDir, fileName.replace('pages/', ''));
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(targetPath, buffer);
    }

    console.log('[Logseq Import] Files extracted to:', tempDir);

    // 5. Run Rust export
    console.log('[Logseq Import] Running Rust export...');
    console.log('[Logseq Import] Temp directory:', tempDir);
    console.log('[Logseq Import] Workspace slug:', workspace.slug);

    let exportResult;
    try {
      exportResult = await RustExportService.exportGraph(tempDir, {
        planetSlug: workspace.slug,
        template: 'dropz',
      });
    } catch (exportError: any) {
      console.error('[Logseq Import] Rust export failed:', exportError);

      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      return NextResponse.json(
        {
          error: 'Export failed',
          details: exportError.message,
          hint: 'The Rust export tool may not be installed. Check server logs for details.',
        },
        { status: 500 }
      );
    }

    console.log(`[Logseq Import] Exported ${exportResult.pages.length} pages`);

    if (exportResult.pages.length === 0) {
      console.warn('[Logseq Import] No pages exported from graph');
      await fs.rm(tempDir, { recursive: true, force: true });

      return NextResponse.json(
        {
          error: 'No pages exported',
          details: 'The Rust tool did not export any pages. Check that your graph has valid markdown files in pages/ or journals/ directories.',
        },
        { status: 400 }
      );
    }

    // 6. Import to database
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const page of exportResult.pages) {
      try {
        // Check if page exists
        const existing = await db.query.nodes.findFirst({
          where: and(
            eq(nodes.planet_id, workspace.id),
            eq(nodes.page_name, page.pageName)
          ),
        });

        const nodeData = {
          planet_id: workspace.id,
          page_name: page.pageName,
          namespace: page.namespace,
          slug: page.slug,
          title: page.pageName.split('/').pop() || page.pageName,
          type: 'file',
          depth: page.namespace.split('/').filter(Boolean).length,

          // Pre-rendered HTML from Rust tool
          parsed_html: page.html,

          // Metadata from export
          metadata: {
            ...page.metadata,
            export_date: new Date().toISOString(),
            // rust_tool_version: await getRustToolVersion(), // TODO
          },

          source_folder: page.pageName.startsWith('journals/') ? 'journals' : 'pages',
          is_journal: page.pageName.startsWith('journals/'),

          updated_at: new Date(),
        };

        if (existing) {
          // Update existing
          await db.update(nodes)
            .set(nodeData)
            .where(eq(nodes.id, existing.id));
          updated++;
          console.log(`[Logseq Import] Updated: ${page.pageName}`);
        } else {
          // Create new
          await db.insert(nodes).values({
            ...nodeData,
            created_at: new Date(),
          });
          created++;
          console.log(`[Logseq Import] Created: ${page.pageName}`);
        }
      } catch (err) {
        console.error(`[Logseq Import] Failed to import ${page.pageName}:`, err);
        skipped++;
      }
    }

    // 7. Create virtual folder nodes
    await createLogseqFolders(workspace.id);

    // 8. Invalidate cache
    revalidateTag(`planet-${workspace.id}`);

    // 9. Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      stats: {
        created,
        updated,
        skipped,
        total: exportResult.pages.length,
        duration: exportResult.stats.duration,
      },
    });

  } catch (error: any) {
    console.error('[Logseq Import] IMPORT FAILED');
    console.error('[Logseq Import] Error type:', error.constructor.name);
    console.error('[Logseq Import] Error message:', error.message);
    console.error('[Logseq Import] Stack trace:', error.stack);

    return NextResponse.json(
      {
        error: 'Import failed',
        details: error.message,
        errorType: error.constructor.name,
        hint: 'Check server logs for detailed error information. Ensure export-logseq-notes is installed.',
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
