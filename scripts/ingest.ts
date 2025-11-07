#!/usr/bin/env tsx

/**
 * CLI Tool for Markdown Ingestion
 *
 * Usage:
 *   npm run ingest -- --planet my-docs --directory ./content
 *   npm run ingest -- -p my-docs -d ./content --clear
 */

import { ingestFolder } from "../src/lib/ingestion/ingest-folder";
import { Command } from "commander";

const program = new Command();

program
  .name("ingest")
  .description("Ingest markdown files into the database")
  .requiredOption("-p, --planet <slug>", "Planet slug (e.g., 'my-docs', 'cs101')")
  .requiredOption("-d, --directory <path>", "Directory to ingest")
  .option("-c, --clear", "Clear existing nodes before ingesting", false)
  .action(async (options) => {
    try {
      console.log("🚀 Starting ingestion...\n");
      console.log(`Planet: ${options.planet}`);
      console.log(`Directory: ${options.directory}`);
      console.log(`Clear existing: ${options.clear ? "Yes" : "No"}\n`);

      const result = await ingestFolder({
        planetSlug: options.planet,
        rootPath: options.directory,
        clearExisting: options.clear,
      });

      console.log(`\n🎉 Ingestion completed successfully!`);
      console.log(`   Planet ID: ${result.planet.id}`);
      console.log(`   Planet Slug: ${result.planet.slug}`);
      console.log(`   Success: ${result.successCount} files`);
      console.log(`   Errors: ${result.errorCount} files`);

      process.exit(0);
    } catch (error) {
      console.error("\n❌ Ingestion failed:", error);
      process.exit(1);
    }
  });

program.parse();
