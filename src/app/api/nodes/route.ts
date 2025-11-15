import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { nodes, type NewNode } from "@/db/schema";
import {
  getUser,
  getUserWorkspace,
  getActiveEditingSession,
  createNodeBackup,
} from "@/lib/queries";
import { eq, and } from "drizzle-orm";
import matter from "gray-matter";
import { invalidateBlockIndexCache } from "@/lib/logseq/cache";

/**
 * POST /api/nodes
 * Create a new node (requires active editing session)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      console.error("[API /api/nodes] No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[API /api/nodes] User: ${user.id}, looking up workspace...`);
    const workspace = await getUserWorkspace(user.id);
    if (!workspace) {
      console.error(`[API /api/nodes] No workspace found for user ${user.id}`);
      return NextResponse.json(
        { error: `No workspace found for user ${user.id}. Please create a workspace first.` },
        { status: 404 }
      );
    }

    console.log(`[API /api/nodes] Found workspace: ${workspace.id}`);

    // Check for active editing session
    const session = await getActiveEditingSession(user.id, workspace.id);
    if (!session) {
      console.error(`[API /api/nodes] No active editing session for user ${user.id}, workspace ${workspace.id}`);
      return NextResponse.json(
        { error: "No active editing session. Please enable editing mode." },
        { status: 403 }
      );
    }

    console.log(`[API /api/nodes] Active editing session found: ${session.id}`);

    const body = await request.json();
    const {
      slug,
      title,
      namespace = "",
      type,
      content,
      metadata = {},
      // Logseq-specific fields
      page_name,
      is_journal = false,
      journal_date,
      source_folder,
    } = body;

    if (!slug || !title || !type) {
      return NextResponse.json(
        { error: "Missing required fields: slug, title, type" },
        { status: 400 }
      );
    }

    // Calculate depth from namespace
    const depth = namespace ? namespace.split("/").length : 0;

    // Parse markdown if it's a file
    let parsedHtml = null;
    let processedContent = content;
    let processedMetadata = { ...metadata };

    if (type === "file" && content) {
      const { data: frontmatter, content: markdownContent } = matter(content);
      processedContent = content; // Keep full content with frontmatter
      processedMetadata = {
        ...processedMetadata,
        ...frontmatter,
      };
      // TODO: Parse markdown to HTML here
    }

    // Check if node already exists (idempotency check)
    // For Logseq pages, check by page_name if provided; otherwise use namespace+slug
    const existingNode = await db.query.nodes.findFirst({
      where: page_name
        ? and(
            eq(nodes.planet_id, workspace.id),
            eq(nodes.page_name, page_name)
          )
        : and(
            eq(nodes.planet_id, workspace.id),
            eq(nodes.namespace, namespace),
            eq(nodes.slug, slug)
          ),
    });

    let resultNode;
    let existed = false;

    if (existingNode) {
      // Node exists - idempotent update
      // If content is identical, return existing node (repeat safety)
      if (processedContent === existingNode.content) {
        revalidateTag("nodes");
        return NextResponse.json(existingNode, { status: 200 });
      }

      // Create backup first
      await createNodeBackup(session.id, existingNode, "update");

      // Update the node (atomic operation via database)
      const [updatedNode] = await db
        .update(nodes)
        .set({
          title,
          type,
          content: processedContent,
          parsed_html: parsedHtml,
          metadata: processedMetadata,
          updated_at: new Date(),
          // Logseq fields
          page_name: page_name || undefined,
          is_journal: is_journal,
          journal_date: journal_date ? new Date(journal_date) : undefined,
          source_folder: source_folder || undefined,
        })
        .where(eq(nodes.id, existingNode.id))
        .returning();

      resultNode = updatedNode;
      existed = true;
    } else {
      // Node doesn't exist - create it
      // Insert node (atomic operation via database, unique constraint prevents duplicates)
      const [newNode] = await db
        .insert(nodes)
        .values({
          planet_id: workspace.id,
          slug,
          title,
          namespace,
          depth,
          file_path: namespace ? `${namespace}/${slug}` : slug,
          type,
          content: processedContent,
          parsed_html: parsedHtml,
          metadata: processedMetadata,
          // Logseq fields
          page_name: page_name || undefined,
          is_journal: is_journal,
          journal_date: journal_date ? new Date(journal_date) : undefined,
          source_folder: source_folder || undefined,
        })
        .returning();

      // Create backup
      await createNodeBackup(session.id, newNode, "create");

      resultNode = newNode;
      existed = false;
    }

    // Invalidate block index cache when creating/updating Logseq pages
    // This ensures reference resolution uses fresh data
    invalidateBlockIndexCache(workspace.id);

    revalidateTag("nodes");
    return NextResponse.json(resultNode, { status: existed ? 200 : 201 });
  } catch (error: any) {
    console.error("Error creating node:", error);
    return NextResponse.json(
      { error: "Failed to create node", details: error.message },
      { status: 500 }
    );
  }
}

