import { NextRequest, NextResponse } from "next/server";
import { getUser, getUserWorkspace } from "@/lib/queries";
import { ingestFolder } from "@/lib/ingestion/ingest-folder";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * POST /api/ingest
 *
 * ⚠️ DEPRECATED: This endpoint uses the old ingestion system that populates
 * the deprecated 'content' field. For Logseq graphs, use /api/ingest-logseq instead.
 *
 * Upload and ingest files directly to user's workspace
 * Expects multipart/form-data with:
 * - directory: Path to directory to ingest (server-side)
 * - clear: Boolean to clear existing content
 */
export async function POST(request: NextRequest) {
  console.warn('[DEPRECATED] /api/ingest is deprecated. Use /api/ingest-logseq for Logseq graphs.');
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getUserWorkspace(user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "No workspace found. Please create a workspace first." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { directory, clear = false } = body;

    if (!directory) {
      return NextResponse.json(
        { error: "Missing directory path" },
        { status: 400 }
      );
    }

    // Verify directory exists
    try {
      await fs.access(directory);
    } catch (err) {
      return NextResponse.json(
        { error: "Directory not found or not accessible" },
        { status: 404 }
      );
    }

    // Ingest folder into user's workspace
    const result = await ingestFolder({
      planetSlug: workspace.slug,
      rootPath: directory,
      clearExisting: clear,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Ingestion completed successfully",
      result: {
        planet: result.planet.slug,
        successCount: result.successCount,
        errorCount: result.errorCount,
      },
    });
  } catch (error: any) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      { error: "Ingestion failed", details: error.message },
      { status: 500 }
    );
  }
}
