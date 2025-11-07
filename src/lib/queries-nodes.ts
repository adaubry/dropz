/**
 * Query Layer for Unified Nodes System
 *
 * This file contains all queries for the namespace-based nodes system
 * which supports arbitrary depth without parent_id chains.
 */

import { db } from "@/db";
import { nodes, planets, nodeLinks, type Node } from "@/db/schema";
import { eq, and, like, sql } from "drizzle-orm";

// ============================================
// PLANET QUERIES
// ============================================

export async function getPlanets() {
  return await db.query.planets.findMany({
    orderBy: (planets, { asc }) => [asc(planets.name)],
  });
}

export async function getPlanetBySlug(slug: string) {
  return await db.query.planets.findFirst({
    where: eq(planets.slug, slug),
  });
}

// ============================================
// NODE QUERIES (UNIFIED)
// ============================================

/**
 * Get children of a namespace (for navigation pages)
 *
 * Example:
 * - namespace="" returns all root-level nodes
 * - namespace="guides" returns nodes directly under /guides
 * - namespace="courses/cs101/week1" returns nodes under that path
 */
export async function getNodeChildren(
  planetId: number,
  namespace: string,
  type?: "folder" | "file"
) {
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
      sql`CASE WHEN ${nodes.type} = 'folder' THEN 0 ELSE 1 END`,
      nodes.order,
      nodes.title,
    ],
  });
}

/**
 * Get a specific node by path segments
 *
 * Example:
 * - pathSegments=["intro"] → finds node with namespace="" and slug="intro"
 * - pathSegments=["guides", "setup"] → finds node with namespace="guides" and slug="setup"
 * - pathSegments=["courses", "cs101", "week1", "lecture"] → finds node at that path
 *
 * This works for ANY depth! No recursion needed!
 */
export async function getNodeByPath(
  planetSlug: string,
  pathSegments: string[]
) {
  const planet = await getPlanetBySlug(planetSlug);
  if (!planet) return null;

  if (pathSegments.length === 0) {
    // Return planet root (virtual node)
    return null;
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
 * Reconstructs the path from root to the current node
 * by splitting the namespace and querying each segment
 */
export async function getNodeBreadcrumbs(node: Node) {
  const breadcrumbs: Array<{ title: string; slug: string; namespace: string }> = [];

  if (!node.namespace) {
    return [{ title: node.title, slug: node.slug, namespace: node.namespace }];
  }

  const segments = node.namespace.split("/");

  // Build breadcrumbs from namespace
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

/**
 * Get related nodes (via links)
 */
export async function getRelatedNodes(nodeId: number, limit = 5) {
  return await db
    .select({
      id: nodes.id,
      slug: nodes.slug,
      title: nodes.title,
      namespace: nodes.namespace,
      metadata: nodes.metadata,
      type: nodes.type,
    })
    .from(nodeLinks)
    .innerJoin(nodes, eq(nodeLinks.to_node_id, nodes.id))
    .where(eq(nodeLinks.from_node_id, nodeId))
    .limit(limit);
}

/**
 * Get nodes in the same namespace (siblings)
 * This is deterministic "related content" based on location
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

/**
 * Full-text search across nodes
 */
export async function searchNodes(
  planetId: number,
  query: string,
  limit = 20
) {
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
}

/**
 * Get node count for a namespace (for "X drops" display)
 */
export async function getNodeCount(planetId: number, namespace: string) {
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
}

// ============================================
// HELPER: Get nodes by depth (water level)
// ============================================

/**
 * Get all oceans (root folders) in a planet
 */
export async function getOceans(planetId: number) {
  return getNodeChildren(planetId, "", "folder"); // depth 0
}

/**
 * Get all seas in an ocean
 */
export async function getSeas(planetId: number, oceanSlug: string) {
  return getNodeChildren(planetId, oceanSlug, "folder"); // depth 1
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
