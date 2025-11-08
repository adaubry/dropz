import { NextRequest, NextResponse } from "next/server";
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

    // Check if node already exists
    const existingNode = await db.query.nodes.findFirst({
      where: and(
        eq(nodes.planet_id, workspace.id),
        eq(nodes.namespace, namespace),
        eq(nodes.slug, slug)
      ),
    });

    let resultNode;

    if (existingNode) {
      // Node exists - update it instead
      // Create backup first
      await createNodeBackup(session.id, existingNode, "update");

      // Update the node
      const [updatedNode] = await db
        .update(nodes)
        .set({
          title,
          type,
          node_type: getNodeType(depth),
          content: processedContent,
          parsed_html: parsedHtml,
          metadata: processedMetadata,
          updated_at: new Date(),
        })
        .where(eq(nodes.id, existingNode.id))
        .returning();

      resultNode = updatedNode;
    } else {
      // Node doesn't exist - create it
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
          node_type: getNodeType(depth),
          content: processedContent,
          parsed_html: parsedHtml,
          metadata: processedMetadata,
        })
        .returning();

      // Create backup
      await createNodeBackup(session.id, newNode, "create");

      resultNode = newNode;
    }

    return NextResponse.json(resultNode, { status: existingNode ? 200 : 201 });
  } catch (error: any) {
    console.error("Error creating node:", error);
    return NextResponse.json(
      { error: "Failed to create node", details: error.message },
      { status: 500 }
    );
  }
}

function getNodeType(depth: number): string {
  const types = ["ocean", "sea", "river", "drop"];
  return types[Math.min(depth, 3)] || "drop";
}
