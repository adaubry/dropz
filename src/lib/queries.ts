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
import { nodes, planets, nodeLinks, users, type Node } from "@/db/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

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
  { revalidate: 60 * 60 * 2 } // 2 hours
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
  { revalidate: 60 * 60 * 2 }
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
 */
export const getNodeChildren = unstable_cache(
  async (
    planetId: number,
    namespace: string,
    type?: "folder" | "file"
  ): Promise<Node[]> => {
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
  },
  ["node-children"],
  { revalidate: 60 * 60 * 2 }
);

/**
 * Get a specific node by path segments
 *
 * Example:
 * - ["intro"] → finds /intro
 * - ["guides", "setup"] → finds /guides/setup
 * - ["courses", "cs101", "week1", "lecture"] → finds /courses/cs101/week1/lecture
 *
 * O(1) lookup via indexed (planet_id, namespace, slug)!
 */
export const getNodeByPath = unstable_cache(
  async (
    planetSlug: string,
    pathSegments: string[]
  ): Promise<Node | null> => {
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
  },
  ["node-by-path"],
  { revalidate: 60 * 60 * 2 }
);

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
  { revalidate: 60 * 60 * 2 }
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
// SEARCH
// ============================================

/**
 * Full-text search across nodes
 *
 * Uses PostgreSQL GIN indexes for fast full-text search
 * on both title and content.
 */
export const searchNodes = unstable_cache(
  async (planetId: number, query: string, limit = 20) => {
    return await db
      .select()
      .from(nodes)
      .where(
        and(
          eq(nodes.planet_id, planetId),
          sql`(
            to_tsvector('english', ${nodes.title}) ||
            to_tsvector('english', COALESCE(${nodes.content}, ''))
          ) @@ plainto_tsquery('english', ${query})`
        )
      )
      .limit(limit);
  },
  ["search-nodes"],
  { revalidate: 60 } // 1 minute (search results change more frequently)
);

/**
 * Global search across all planets
 *
 * For the main search bar that searches everywhere.
 */
export const getSearchResults = unstable_cache(
  async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    let results;

    if (searchTerm.length <= 2) {
      // Short search: use prefix matching
      results = await db
        .select()
        .from(nodes)
        .where(sql`${nodes.title} ILIKE ${searchTerm + "%"}`)
        .limit(5);
    } else {
      // Longer search: use full-text search
      const formattedSearchTerm = searchTerm
        .split(" ")
        .filter((term) => term.trim() !== "")
        .map((term) => `${term}:*`)
        .join(" & ");

      results = await db
        .select()
        .from(nodes)
        .where(
          sql`to_tsvector('english', ${nodes.title}) @@ to_tsquery('english', ${formattedSearchTerm})`
        )
        .limit(5);
    }

    return results;
  },
  ["search-results"],
  { revalidate: 60 } // 1 minute
);

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
  { revalidate: 60 * 60 } // 1 hour
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
  { revalidate: 60 * 60 * 2 }
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

// ============================================
// BACKWARD COMPATIBILITY (Deprecated)
// ============================================
// These are kept for compatibility during migration.
// TODO: Remove after all references are updated.

export const getCollections = getPlanets;
export const getProductCount = getDropCount;
