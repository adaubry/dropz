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
import { createVersionChain, updateVersionChain } from "@/lib/diff";

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

    // Check if node already exists (idempotency check)
    const existingNode = await db.query.nodes.findFirst({
      where: and(
        eq(nodes.planet_id, workspace.id),
        eq(nodes.namespace, namespace),
        eq(nodes.slug, slug)
      ),
    });

    // Use transaction for atomic operation
    const { resultNode, existed } = await db.transaction(async (tx) => {
      if (existingNode) {
        // Node exists - idempotent update
        // If content is identical, return existing node (repeat safety)
        if (processedContent === existingNode.content) {
          return { resultNode: existingNode, existed: true };
        }

        // Create backup first
        await createNodeBackup(session.id, existingNode, "update");

        // Create version chain for content changes (text-only)
        let versionChainUpdate = {};
        if (processedContent && type === "file") {
          const versionChain = updateVersionChain(
            existingNode.content || "",
            processedContent
          );
          versionChainUpdate = {
            current_version: versionChain.current_version,
            previous_version: versionChain.previous_version,
            version_hash: versionChain.version_hash,
            last_modified_by: user.id,
          };
        }

        // Update the node
        const [updatedNode] = await tx
          .update(nodes)
          .set({
            title,
            type,
            node_type: getNodeType(depth),
            content: processedContent,
            parsed_html: parsedHtml,
            metadata: processedMetadata,
            updated_at: new Date(),
            ...versionChainUpdate,
          })
          .where(eq(nodes.id, existingNode.id))
          .returning();

        return { resultNode: updatedNode, existed: true };
      } else {
        // Node doesn't exist - create it
        // Create version chain for new content
        let versionChainData = {};
        if (processedContent && type === "file") {
          const versionChain = createVersionChain(null, processedContent);
          versionChainData = {
            current_version: versionChain.current_version,
            previous_version: versionChain.previous_version,
            version_hash: versionChain.version_hash,
            last_modified_by: user.id,
          };
        }

        const [newNode] = await tx
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
            ...versionChainData,
          })
          .returning();

        // Create backup
        await createNodeBackup(session.id, newNode, "create");

        return { resultNode: newNode, existed: false };
      }
    });

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

function getNodeType(depth: number): string {
  const types = ["ocean", "sea", "river", "drop"];
  return types[Math.min(depth, 3)] || "drop";
}
