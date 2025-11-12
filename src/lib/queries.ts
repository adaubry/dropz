/**
 * Unified Query Layer for Nodes System
 *
 * This is the single source of truth for all database queries.
 * Uses the namespace-based nodes system that supports arbitrary depth.
 *
 * Performance optimizations:
 * - Next.js unstable_cache for 2-hour caching
 * - Indexed queries for O(1) lookups
 * - No recursive CTEs or parent_id joins
 */

import { cookies } from "next/headers";
import { verifyToken } from "./session";
import { db } from "@/db";
import {
  nodes,
  planets,
  nodeLinks,
  users,
  editingSessions,
  nodeBackups,
  type Node,
  type Planet,
  type EditingSession,
  type NodeBackup,
} from "@/db/schema";
import { eq, and, like, sql, desc } from "drizzle-orm";
import { unstable_cache } from "./unstable-cache";
import { revalidateTag } from "next/cache";

// ============================================
// USER / AUTH QUERIES
// ============================================

/**
 * Get current logged-in user from session cookie
 */
export async function getUser() {
  const sessionCookie = (await cookies()).get("session");
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== "number"
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

/**
 * Get user's primary workspace (planet)
 * Returns the first planet created by the user
 */
export async function getUserWorkspace(userId: number): Promise<Planet | null> {
  const workspace = await db.query.planets.findFirst({
    where: eq(planets.user_id, userId),
    orderBy: (planets, { asc }) => [asc(planets.created_at)],
  });
  return workspace || null;
}

/**
 * Get all planets owned by a user
 * Users can have multiple planets
 */
export async function getUserPlanets(userId: number): Promise<Planet[]> {
  return await db.query.planets.findMany({
    where: eq(planets.user_id, userId),
    orderBy: (planets, { asc }) => [asc(planets.created_at)],
  });
}

/**
 * Create or get user's workspace
 * Automatically creates a workspace for new users
 */
export async function ensureUserWorkspace(userId: number, username: string): Promise<Planet> {
  // Check if workspace exists
  let workspace = await getUserWorkspace(userId);

  if (!workspace) {
    // Create new workspace
    const slug = `${username}-workspace`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const [newWorkspace] = await db
      .insert(planets)
      .values({
        name: `${username}'s Workspace`,
        slug,
        description: `Personal workspace for ${username}`,
        user_id: userId,
      })
      .returning();
    workspace = newWorkspace;
    revalidateTag("planets");
  }

  return workspace;
}

/**
 * Create a new planet for a user
 * Users can have multiple planets
 * Includes idempotency check (repeat safety)
 */
export async function createPlanet(
  userId: number,
  data: { name: string; slug: string; description?: string }
): Promise<Planet> {
  // Check if slug is already taken (idempotency check)
  const existing = await db.query.planets.findFirst({
    where: eq(planets.slug, data.slug),
  });

  if (existing) {
    // If the existing planet belongs to the same user, return it (repeat safety)
    if (existing.user_id === userId) {
      return existing;
    }
    throw new Error(`Planet slug "${data.slug}" is already taken`);
  }

  // Insert planet (atomic operation via database, unique constraint prevents duplicates)
  const [planet] = await db
    .insert(planets)
    .values({
      name: data.name,
      slug: data.slug,
      description: data.description || "",
      user_id: userId,
    })
    .returning();

  revalidateTag("planets");
  return planet;
}

/**
 * Delete a planet and all its content
 * Only the owner can delete their planet
 */
export async function deletePlanet(planetId: number, userId: number): Promise<void> {
  // Verify ownership
  const planet = await db.query.planets.findFirst({
    where: and(eq(planets.id, planetId), eq(planets.user_id, userId)),
  });

  if (!planet) {
    throw new Error("Planet not found or you don't have permission to delete it");
  }

  // Delete will cascade to nodes, editing sessions, etc. (atomic operation via database)
  await db.delete(planets).where(eq(planets.id, planetId));

  revalidateTag("planets");
  revalidateTag("nodes");
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: number,
  data: { email?: string; avatar_url?: string; bio?: string }
) {
  return await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
}

// ============================================
// EDITING MODE QUERIES
// ============================================

/**
 * Get active editing session for a user and planet
 */
export async function getActiveEditingSession(
  userId: number,
  planetId: number
): Promise<EditingSession | null> {
  const session = await db.query.editingSessions.findFirst({
    where: and(
      eq(editingSessions.user_id, userId),
      eq(editingSessions.planet_id, planetId),
      eq(editingSessions.is_active, true)
    ),
  });
  return session || null;
}

/**
 * Start editing mode - creates a new editing session
 */
export async function startEditingSession(
  userId: number,
  planetId: number
): Promise<EditingSession> {
  // Check if there's already an active session
  const existing = await getActiveEditingSession(userId, planetId);
  if (existing) {
    return existing;
  }

  // Create new session
  const [session] = await db
    .insert(editingSessions)
    .values({
      user_id: userId,
      planet_id: planetId,
      is_active: true,
    })
    .returning();

  return session;
}

/**
 * End editing session (apply changes)
 */
export async function endEditingSession(sessionId: number): Promise<void> {
  // Mark session as inactive
  await db
    .update(editingSessions)
    .set({
      is_active: false,
      ended_at: new Date(),
    })
    .where(eq(editingSessions.id, sessionId));

  // Clean up backups after successfully applying changes
  // Since changes are accepted, we don't need the backups anymore
  await db.delete(nodeBackups).where(eq(nodeBackups.session_id, sessionId));
  revalidateTag("nodes");
}

/**
 * Create a backup of a node before modification
 * Only creates ONE backup per node per session (keeps the original state)
 */
export async function createNodeBackup(
  sessionId: number,
  node: Node,
  backupType: "create" | "update" | "delete"
): Promise<NodeBackup | null> {
  // Check if a backup already exists for this node in this session
  const existingBackup = await db.query.nodeBackups.findFirst({
    where: and(
      eq(nodeBackups.session_id, sessionId),
      eq(nodeBackups.node_id, node.id)
    ),
  });

  // If backup already exists, don't create another one
  // This ensures we keep only the ORIGINAL state before ANY modifications
  if (existingBackup) {
    return existingBackup;
  }

  // Create the first backup for this node
  const [backup] = await db
    .insert(nodeBackups)
    .values({
      session_id: sessionId,
      node_id: node.id,
      snapshot: {
        planet_id: node.planet_id,
        slug: node.slug,
        title: node.title,
        namespace: node.namespace,
        depth: node.depth,
        file_path: node.file_path,
        type: node.type,
        node_type: node.node_type,
        content: node.content,
        parsed_html: node.parsed_html,
        metadata: node.metadata,
        order: node.order,
        is_index: node.is_index,
      },
      backup_type: backupType,
    })
    .returning();

  return backup;
}

/**
 * Get all backups for a session
 */
export async function getSessionBackups(sessionId: number): Promise<NodeBackup[]> {
  return await db.query.nodeBackups.findMany({
    where: eq(nodeBackups.session_id, sessionId),
    orderBy: [desc(nodeBackups.created_at)],
  });
}

/**
 * Calculate diff between current node and backup snapshot
 * Only returns fields that have changed for optimized updates
 */
function calculateNodeDiff(
  currentNode: Node,
  snapshot: NodeBackup["snapshot"]
): Partial<Node> {
  const diff: Partial<Node> = {};

  // Compare each field and only include changed ones
  if (currentNode.slug !== snapshot.slug) diff.slug = snapshot.slug;
  if (currentNode.title !== snapshot.title) diff.title = snapshot.title;
  if (currentNode.namespace !== snapshot.namespace)
    diff.namespace = snapshot.namespace;
  if (currentNode.depth !== snapshot.depth) diff.depth = snapshot.depth;
  if (currentNode.file_path !== snapshot.file_path)
    diff.file_path = snapshot.file_path;
  if (currentNode.type !== snapshot.type) diff.type = snapshot.type;
  if (currentNode.node_type !== snapshot.node_type)
    diff.node_type = snapshot.node_type;
  if (currentNode.content !== snapshot.content) diff.content = snapshot.content;
  if (currentNode.parsed_html !== snapshot.parsed_html)
    diff.parsed_html = snapshot.parsed_html;
  if (currentNode.order !== snapshot.order) diff.order = snapshot.order;
  if (currentNode.is_index !== snapshot.is_index)
    diff.is_index = snapshot.is_index;

  // Deep compare metadata (JSONB field)
  if (JSON.stringify(currentNode.metadata) !== JSON.stringify(snapshot.metadata)) {
    diff.metadata = snapshot.metadata;
  }

  return diff;
}

/**
 * Discard changes - restore from backups and delete session
 * Uses diff-based updates for better performance
 */
export async function discardEditingSession(sessionId: number): Promise<void> {
  // Get all backups for this session
  const backups = await getSessionBackups(sessionId);

  // Restore each backup in reverse order
  for (const backup of backups.reverse()) {
    if (backup.backup_type === "create" && backup.node_id) {
      // Delete the created node
      await db.delete(nodes).where(eq(nodes.id, backup.node_id));
    } else if (backup.backup_type === "update" && backup.node_id) {
      // Get current node state
      const currentNode = await db.query.nodes.findFirst({
        where: eq(nodes.id, backup.node_id),
      });

      if (currentNode) {
        // Calculate diff to only update changed fields (performance optimization)
        const diff = calculateNodeDiff(currentNode, backup.snapshot);

        // Only perform update if there are actual changes
        if (Object.keys(diff).length > 0) {
          await db
            .update(nodes)
            .set(diff)
            .where(eq(nodes.id, backup.node_id));
        }
      }
    } else if (backup.backup_type === "delete") {
      // Recreate the deleted node
      await db.insert(nodes).values({
        planet_id: backup.snapshot.planet_id,
        slug: backup.snapshot.slug,
        title: backup.snapshot.title,
        namespace: backup.snapshot.namespace,
        depth: backup.snapshot.depth,
        file_path: backup.snapshot.file_path,
        type: backup.snapshot.type,
        node_type: backup.snapshot.node_type,
        content: backup.snapshot.content,
        parsed_html: backup.snapshot.parsed_html,
        metadata: backup.snapshot.metadata,
        order: backup.snapshot.order,
        is_index: backup.snapshot.is_index,
      });
    }
  }

  // Delete the editing session (cascades to backups)
  await db.delete(editingSessions).where(eq(editingSessions.id, sessionId));
  revalidateTag("nodes");
}

// ============================================
// PLANET QUERIES
// ============================================

/**
 * Get all planets (top-level workspaces)
 */
export const getPlanets = unstable_cache(
  async () => {
    return await db.query.planets.findMany({
      orderBy: (planets, { asc }) => [asc(planets.name)],
    });
  },
  ["planets"],
  { revalidate: 60 * 60 * 2, tags: ["planets"] } // 2 hours
);

/**
 * Get a planet by its slug
 */
export const getPlanetBySlug = unstable_cache(
  async (slug: string) => {
    return await db.query.planets.findFirst({
      where: eq(planets.slug, slug),
    });
  },
  ["planet-by-slug"],
  { revalidate: 60 * 60 * 2, tags: ["planets"] }
);

// ============================================
// NODE QUERIES (CORE)
// ============================================

/**
 * Get children of a namespace (for navigation pages)
 *
 * Examples:
 * - namespace="" → root-level nodes
 * - namespace="guides" → nodes under /guides
 * - namespace="courses/cs101/week1" → nodes at that path
 *
 * Works for ANY depth!
 * No caching - pages are force-dynamic for editing mode
 */
export async function getNodeChildren(
  planetId: number,
  namespace: string,
  type?: "folder" | "file"
): Promise<Node[]> {
  const whereConditions: any[] = [
    eq(nodes.planet_id, planetId),
    eq(nodes.namespace, namespace),
  ];

  if (type) {
    whereConditions.push(eq(nodes.type, type));
  }

  return await db.query.nodes.findMany({
    where: and(...whereConditions),
    orderBy: [
      sql`CASE WHEN ${nodes.type} = 'folder' THEN 0 ELSE 1 END`, // Folders first
      nodes.order,
      nodes.title,
    ],
  });
}

/**
 * Get a specific node by path segments
 *
 * Example:
 * - ["intro"] → finds /intro
 * - ["guides", "setup"] → finds /guides/setup
 * - ["courses", "cs101", "week1", "lecture"] → finds /courses/cs101/week1/lecture
 *
 * O(1) lookup via indexed (planet_id, namespace, slug)!
 * No caching - pages are force-dynamic for editing mode
 */
export async function getNodeByPath(
  planetSlug: string,
  pathSegments: string[]
): Promise<Node | null> {
  const planet = await getPlanetBySlug(planetSlug);
  if (!planet) return null;

  if (pathSegments.length === 0) {
    return null; // Root has no node
  }

  const slug = pathSegments[pathSegments.length - 1];
  const namespace = pathSegments.slice(0, -1).join("/");

  return await db.query.nodes.findFirst({
    where: and(
      eq(nodes.planet_id, planet.id),
      eq(nodes.namespace, namespace),
      eq(nodes.slug, slug)
    ),
  });
}

/**
 * Get breadcrumb trail for a node
 *
 * Reconstructs the full path from root to current node
 * by splitting the namespace and querying each segment.
 */
export async function getNodeBreadcrumbs(node: Node) {
  const breadcrumbs: Array<{ title: string; slug: string; namespace: string }> =
    [];

  if (!node.namespace) {
    return [{ title: node.title, slug: node.slug, namespace: node.namespace }];
  }

  const segments = node.namespace.split("/");

  // Build breadcrumb trail from namespace path
  for (let i = 0; i < segments.length; i++) {
    const slug = segments[i];
    const parentNamespace = segments.slice(0, i).join("/");

    const parent = await db.query.nodes.findFirst({
      where: and(
        eq(nodes.planet_id, node.planet_id),
        eq(nodes.namespace, parentNamespace),
        eq(nodes.slug, slug)
      ),
    });

    if (parent) {
      breadcrumbs.push({
        title: parent.title,
        slug: parent.slug,
        namespace: parent.namespace,
      });
    }
  }

  // Add current node
  breadcrumbs.push({
    title: node.title,
    slug: node.slug,
    namespace: node.namespace,
  });

  return breadcrumbs;
}

// ============================================
// RELATED CONTENT
// ============================================

/**
 * Get related nodes via explicit node_links
 *
 * This uses the node_links table for explicit "see also" relationships.
 */
export const getRelatedNodes = unstable_cache(
  async (nodeId: number, limit = 5) => {
    return await db
      .select({
        id: nodes.id,
        slug: nodes.slug,
        title: nodes.title,
        namespace: nodes.namespace,
        metadata: nodes.metadata,
        type: nodes.type,
        node_type: nodes.node_type,
      })
      .from(nodeLinks)
      .innerJoin(nodes, eq(nodeLinks.to_node_id, nodes.id))
      .where(eq(nodeLinks.from_node_id, nodeId))
      .limit(limit);
  },
  ["related-nodes"],
  { revalidate: 60 * 60 * 2, tags: ["nodes", "node-links"] }
);

/**
 * Get sibling nodes (in same namespace)
 *
 * This is deterministic "related content" based on location.
 * More reliable than random suggestions!
 */
export async function getSiblingNodes(node: Node, limit = 5) {
  return await db.query.nodes.findMany({
    where: and(
      eq(nodes.planet_id, node.planet_id),
      eq(nodes.namespace, node.namespace),
      sql`${nodes.id} != ${node.id}` // Exclude current node
    ),
    limit,
    orderBy: [nodes.order, nodes.title],
  });
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get node count for a namespace (for "X drops" display)
 *
 * Uses LIKE pattern matching to count all descendant nodes.
 */
export const getNodeCount = unstable_cache(
  async (planetId: number, namespace: string): Promise<number> => {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(nodes)
      .where(
        and(
          eq(nodes.planet_id, planetId),
          like(nodes.namespace, `${namespace}%`),
          eq(nodes.type, "file")
        )
      );

    return result[0]?.count || 0;
  },
  ["node-count"],
  { revalidate: 60 * 60, tags: ["nodes"] } // 1 hour
);

/**
 * Get total drop count across all planets
 */
export const getDropCount = unstable_cache(
  async () => {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(nodes)
      .where(eq(nodes.type, "file"));

    return result[0]?.count || 0;
  },
  ["total-drop-count"],
  { revalidate: 60 * 60 * 2, tags: ["nodes"] }
);

// ============================================
// CONVENIENCE HELPERS (Water Metaphor)
// ============================================

/**
 * Get all oceans (root folders) in a planet
 */
export async function getOceans(planetId: number) {
  return getNodeChildren(planetId, "", "folder");
}

/**
 * Get all seas in an ocean
 */
export async function getSeas(planetId: number, oceanSlug: string) {
  return getNodeChildren(planetId, oceanSlug, "folder");
}

/**
 * Get all rivers in a sea
 */
export async function getRivers(
  planetId: number,
  oceanSlug: string,
  seaSlug: string
) {
  return getNodeChildren(planetId, `${oceanSlug}/${seaSlug}`, "folder");
}

/**
 * Get all drops in a river
 */
export async function getDrops(
  planetId: number,
  oceanSlug: string,
  seaSlug: string,
  riverSlug: string
) {
  return getNodeChildren(
    planetId,
    `${oceanSlug}/${seaSlug}/${riverSlug}`,
    "file"
  );
}

/**
 * Get all files in any namespace (flexible depth)
 */
export async function getFilesInNamespace(
  planetId: number,
  namespace: string
) {
  return getNodeChildren(planetId, namespace, "file");
}

/**
 * Get all folders in any namespace (flexible depth)
 */
export async function getFoldersInNamespace(
  planetId: number,
  namespace: string
) {
  return getNodeChildren(planetId, namespace, "folder");
}

/**
 * Get the index page (page.md or readme.md) for a folder
 *
 * Looks for a file named "page" or "readme" in the given namespace
 * This allows folders to have an introductory/overview page
 *
 * Priority: page.md > readme.md (case insensitive)
 *
 * Example: /guides folder can have /guides/page.md or /guides/README.md
 */
export async function getFolderIndexPage(
  planetId: number,
  namespace: string
): Promise<Node | null> {
  // First try to find page.md
  const pageMd = await db.query.nodes.findFirst({
    where: and(
      eq(nodes.planet_id, planetId),
      eq(nodes.namespace, namespace),
      eq(nodes.slug, "page"),
      eq(nodes.type, "file")
    ),
  });

  if (pageMd) return pageMd;

  // If no page.md, try readme.md (case insensitive)
  const readmeMd = await db.query.nodes.findFirst({
    where: and(
      eq(nodes.planet_id, planetId),
      eq(nodes.namespace, namespace),
      sql`LOWER(${nodes.slug}) = 'readme'`,
      eq(nodes.type, "file")
    ),
  });

  return readmeMd;
}

