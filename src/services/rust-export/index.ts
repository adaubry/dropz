/**
 * Rust Export Service
 *
 * Integrates with export-logseq-notes Rust tool to convert Logseq graphs to HTML
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import type {
  ExportOptions,
  ExportedPage,
  ExportResult,
  PageMetadata,
} from './types';

const execAsync = promisify(exec);

// ============================================
// PUBLIC API
// ============================================

export const RustExportService = {
  exportGraph,
  validateInstallation,
} as const;

// ============================================
// IMPLEMENTATIONS
// ============================================

/**
 * Validate that export-logseq-notes is installed
 */
async function validateInstallation(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('which export-logseq-notes');
    const toolPath = stdout.trim();

    if (!toolPath) {
      console.error('[Rust Export] export-logseq-notes not found in PATH');
      console.error('[Rust Export] Install with: cargo install --git https://github.com/dimfeld/export-logseq-notes.git');
      return false;
    }

    console.log('[Rust Export] Tool found at:', toolPath);

    // Try to get version info
    try {
      const { stdout: versionOut } = await execAsync('export-logseq-notes --version');
      console.log('[Rust Export] Version:', versionOut.trim());
    } catch (versionError) {
      console.warn('[Rust Export] Could not get version info:', versionError);
    }

    return true;
  } catch (error: any) {
    console.error('[Rust Export] export-logseq-notes not found in PATH');
    console.error('[Rust Export] Error details:', error.message);
    console.error('[Rust Export] Install with: cargo install --git https://github.com/dimfeld/export-logseq-notes.git');
    return false;
  }
}

/**
 * Export entire Logseq graph to HTML using Rust tool
 */
async function exportGraph(
  graphPath: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const startTime = Date.now();

  console.log('[Rust Export] Starting export...');
  console.log('[Rust Export] Graph path:', graphPath);

  // 1. Validate Rust tool is installed
  const isInstalled = await validateInstallation();
  if (!isInstalled) {
    throw new Error(
      'export-logseq-notes not found. Install with: cargo install export-logseq-notes'
    );
  }

  // 2. Create temp output directory
  const outputDir = path.join(os.tmpdir(), `logseq-export-${Date.now()}`);
  await fs.mkdir(outputDir, { recursive: true });
  console.log('[Rust Export] Output directory:', outputDir);

  // 3. Generate config file
  const configPath = await createConfig(graphPath, outputDir, options);
  console.log('[Rust Export] Config created:', configPath);

  try {
    // 4. Run export
    console.log('[Rust Export] Running export-logseq-notes...');
    console.log('[Rust Export] Command: export-logseq-notes --config', configPath);

    const { stdout, stderr } = await execAsync(
      `export-logseq-notes --config "${configPath}"`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large outputs
    );

    console.log('[Rust Export] Command completed');

    if (stdout) {
      console.log('[Rust Export] stdout:', stdout);
    } else {
      console.warn('[Rust Export] No stdout from Rust tool');
    }

    if (stderr) {
      console.log('[Rust Export] stderr:', stderr);
    }

    const duration = Date.now() - startTime;
    console.log('[Rust Export] Export completed in', duration, 'ms');

    // 5. Read exported files
    console.log('[Rust Export] Reading exported files from:', outputDir);

    // First, check if output directory exists and has content
    try {
      const dirContents = await fs.readdir(outputDir);
      console.log('[Rust Export] Output directory contains:', dirContents);

      if (dirContents.length === 0) {
        console.error('[Rust Export] ERROR: Output directory is empty! Rust tool may have failed silently.');
      }
    } catch (dirError: any) {
      console.error('[Rust Export] ERROR: Cannot read output directory:', dirError.message);
    }

    const htmlFiles = await readExportedFiles(outputDir, graphPath);
    console.log('[Rust Export] Found', htmlFiles.length, 'exported pages');

    if (htmlFiles.length === 0) {
      console.error('[Rust Export] ERROR: No HTML files found after export!');
      console.error('[Rust Export] This indicates the Rust tool did not generate any output.');
      console.error('[Rust Export] Check the config file and graph structure.');
    }

    // 6. Parse and structure results
    const results: ExportedPage[] = [];

    for (const file of htmlFiles) {
      const html = await fs.readFile(file.fullPath, 'utf-8');

      // Extract metadata from HTML
      const metadata = extractMetadata(html);

      // Post-process HTML (fix links, etc.)
      const processedHtml = postProcessHtml(html, options);

      results.push({
        pageName: file.pageName,
        namespace: file.namespace,
        slug: file.slug,
        html: processedHtml,
        originalMarkdown: file.originalMarkdown,
        metadata,
      });
    }

    // 7. Cleanup
    await cleanup(outputDir, configPath);

    return {
      pages: results,
      stats: {
        total: results.length,
        duration,
      },
    };
  } catch (error: any) {
    // Enhanced error logging
    console.error('[Rust Export] EXPORT FAILED');
    console.error('[Rust Export] Error type:', error.constructor.name);
    console.error('[Rust Export] Error message:', error.message);

    if (error.code) {
      console.error('[Rust Export] Error code:', error.code);
    }

    if (error.stderr) {
      console.error('[Rust Export] Process stderr:', error.stderr);
    }

    if (error.stdout) {
      console.error('[Rust Export] Process stdout:', error.stdout);
    }

    console.error('[Rust Export] Full error:', error);

    // Cleanup on error
    await cleanup(outputDir, configPath);

    // Re-throw with more context
    throw new Error(
      `Rust export failed: ${error.message}. ` +
      `Check server logs for details. ` +
      `Ensure export-logseq-notes is installed: cargo install --git https://github.com/dimfeld/export-logseq-notes.git`
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create export config file
 */
async function createConfig(
  inputDir: string,
  outputDir: string,
  options: ExportOptions
): Promise<string> {
  const configPath = path.join(os.tmpdir(), `export-config-${Date.now()}.toml`);

  // Read template
  const templatePath = path.join(process.cwd(), 'export-config.template.toml');
  console.log('[Rust Export] Reading template from:', templatePath);

  try {
    await fs.access(templatePath);
  } catch (accessError: any) {
    console.error('[Rust Export] ERROR: Template file not found at:', templatePath);
    throw new Error(`Export config template not found at ${templatePath}. Ensure the file exists in your project root.`);
  }

  let config = await fs.readFile(templatePath, 'utf-8');

  // Replace placeholders
  config = config.replace('{{INPUT_DIR}}', inputDir);
  config = config.replace('{{OUTPUT_DIR}}', outputDir);

  // Add optional filters
  if (options.includeTags && options.includeTags.length > 0) {
    config += `\ninclude_tags = ${JSON.stringify(options.includeTags)}`;
  }

  if (options.excludeTags && options.excludeTags.length > 0) {
    config += `\nexclude_tags = ${JSON.stringify(options.excludeTags)}`;
  }

  // Override template if specified
  if (options.template) {
    config = config.replace('template = "dropz"', `template = "${options.template}"`);
  }

  await fs.writeFile(configPath, config);
  console.log('[Rust Export] Config written to:', configPath);
  console.log('[Rust Export] Config content:\n', config);
  return configPath;
}

/**
 * Read exported HTML files from output directory
 */
async function readExportedFiles(
  outputDir: string,
  graphPath: string
): Promise<Array<{
  fullPath: string;
  relativePath: string;
  pageName: string;
  namespace: string;
  slug: string;
  originalMarkdown?: string;
}>> {
  const files: Array<{
    fullPath: string;
    relativePath: string;
    pageName: string;
    namespace: string;
    slug: string;
    originalMarkdown?: string;
  }> = [];

  async function walk(dir: string, basePath = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath, relativePath);
      } else if (entry.name.endsWith('.html')) {
        // Convert file path to page name
        // e.g., guides/setup.html → guides/setup
        const pageName = relativePath.replace('.html', '');

        // Extract namespace and slug
        const parts = pageName.split('/');
        const slug = parts[parts.length - 1];
        const namespace = parts.slice(0, -1).join('/');

        // Try to find original markdown file
        let originalMarkdown: string | undefined;
        try {
          const mdPath = path.join(
            graphPath,
            'pages',
            pageName.replace(/\//g, '___') + '.md'
          );
          originalMarkdown = await fs.readFile(mdPath, 'utf-8');
        } catch {
          // Original markdown not found, that's okay
        }

        files.push({
          fullPath,
          relativePath,
          pageName,
          namespace,
          slug,
          originalMarkdown,
        });
      }
    }
  }

  await walk(outputDir);
  return files;
}

/**
 * Post-process HTML to fix links and add Dropz-specific features
 */
function postProcessHtml(html: string, options: ExportOptions): string {
  let processed = html;

  // 1. Rewrite page links to include planet slug
  if (options.planetSlug) {
    // The Rust tool generates links like href="/page-name"
    // We need: href="/planet-slug/pages/page-name"
    processed = processed.replace(
      /href="\/([^"]+)"/g,
      (match, pagePath) => {
        // Skip external links
        if (pagePath.startsWith('http://') || pagePath.startsWith('https://')) {
          return match;
        }
        return `href="/${options.planetSlug}/pages/${pagePath}"`;
      }
    );
  }

  // 2. Add target="_blank" to external links
  processed = processed.replace(
    /href="(https?:\/\/[^"]+)"/g,
    'href="$1" target="_blank" rel="noopener noreferrer"'
  );

  // 3. Add data attributes for prefetching
  processed = processed.replace(
    /<a href="\/([^"]+)"([^>]*)>/g,
    '<a href="/$1" data-prefetch$2>'
  );

  return processed;
}

/**
 * Extract metadata from exported HTML
 */
function extractMetadata(html: string): PageMetadata {
  const metadata: PageMetadata = {};

  // Extract from hidden metadata div
  const metaRegex = /<div class="hidden metadata"[^>]*data-created="([^"]*)"[^>]*data-updated="([^"]*)"[^>]*data-tags="([^"]*)"[^>]*>/;
  const metaMatch = html.match(metaRegex);

  if (metaMatch) {
    metadata.created = metaMatch[1] || undefined;
    metadata.updated = metaMatch[2] || undefined;
    metadata.tags = metaMatch[3]
      ?.split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Extract page references (internal links)
  const pageRefs = new Set<string>();
  const linkRegex = /href="\/([^"]+)"/g;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    // Only include internal links (not http/https)
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      pageRefs.add(href);
    }
  }
  metadata.page_refs = Array.from(pageRefs);

  // Extract block references
  const blockRefs = new Set<string>();
  const blockRefRegex = /data-block-id="([^"]+)"/g;
  while ((match = blockRefRegex.exec(html)) !== null) {
    blockRefs.add(match[1]);
  }
  if (blockRefs.size > 0) {
    metadata.block_refs = Array.from(blockRefs);
  }

  return metadata;
}

/**
 * Cleanup temporary files
 */
async function cleanup(outputDir: string, configPath: string): Promise<void> {
  try {
    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.unlink(configPath);
    console.log('[Rust Export] Cleanup completed');
  } catch (error) {
    console.error('[Rust Export] Cleanup error:', error);
  }
}

// ============================================
// EXPORTS
// ============================================

export * from './types';
