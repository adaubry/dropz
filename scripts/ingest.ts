#!/usr/bin/env tsx

/**
 * CLI Tool for Markdown Ingestion
 *
 * Usage:
 *   npm run ingest -- --planet my-docs --directory ./content
 *   npm run ingest -- -p my-docs -d ./content --clear
 */

// CRITICAL: We use dynamic imports to ensure env vars are loaded first
// Static imports are hoisted and evaluated before our code runs

import { config } from "dotenv";
import { resolve } from "path";

// Main async function to control import order
async function main() {
  // Load .env from project root
  const envPath = resolve(__dirname, "..", ".env");
  console.log(`📁 Loading .env from: ${envPath}`);
  config({ path: envPath });

  // Verify database URL is loaded
  if (!process.env.POSTGRES_URL) {
    console.error("❌ Error: POSTGRES_URL environment variable is not set!");
    console.error("   Please check your .env file.");
    console.error(`   Looking for .env at: ${envPath}`);
    console.error("\nMake sure your .env file contains:");
    console.error('   POSTGRES_URL="postgresql://..."');
    process.exit(1);
  }

  // Show that we have the connection string (masked for security)
  const dbUrl = process.env.POSTGRES_URL;
  const maskedUrl = dbUrl.replace(/(:\/\/)([^:]+):([^@]+)(@)/, '$1***:***$4');
  console.log(`✅ .env file loaded`);
  console.log(`🔗 Database URL: ${maskedUrl}\n`);

  // NOW dynamically import modules that depend on environment variables
  const { ingestFolder } = await import("../src/lib/ingestion/ingest-folder.js");
  const { Command } = await import("commander");

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
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
