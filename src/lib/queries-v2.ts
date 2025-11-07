import { db } from "../db";
import { nodes, planets, nodeLinks } from "../db/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

// ============================================
// PLANET QUERIES
// ============================================

export const getPlanetsV2 = unstable_cache(
  async () => {
    return await db.query.planets.findMany({
      orderBy: (planets, { asc }) => [asc(planets.name)],
    });
  },
  ["planets-v2"],
  { revalidate: 60 * 60 * 2 }
);

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
// NODE QUERIES (UNIFIED)
// ============================================

/**
 * Get children of a namespace (for navigation pages)
 * @param planetId - The planet ID
 * @param namespace - The namespace path (e.g., "ocean" or "ocean/sea")
 * @param type - Optional filter by type (folder or file)
 */
export const getNodeChildren = unstable_cache(
  async (
    planetId: number,
    namespace: string,
    type?: "folder" | "file"
  ) => {
    const whereConditions = [
      eq(nodes.planet_id, planetId),
      eq(nodes.namespace, namespace),
    ];

    if (type) {
      whereConditions.push(eq(nodes.type, type));
    }

    return await db.query.nodes.findMany({
      where: and(...whereConditions),
      orderBy: (nodes, { asc }) => [
        sql`CASE WHEN ${nodes.type} = 'folder' THEN 0 ELSE 1 END`,
        asc(nodes.order),
        asc(nodes.title),
      ],
    });
  },
  ["node-children"],
  { revalidate: 60 * 60 * 2 }
);

/**
 * Get a specific node by path segments
 * @param planetSlug - The planet slug
 * @param pathSegments - Array of path segments (e.g., ["ocean", "sea", "river", "drop"])
 */
export const getNodeByPath = unstable_cache(
  async (planetSlug: string, pathSegments: string[]) => {
    const planet = await getPlanetBySlug(planetSlug);
    if (!planet) return null;

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
 * @param node - The node to get breadcrumbs for
 */
export async function getNodeBreadcrumbs(node: typeof nodes.$inferSelect) {
  if (!node.namespace) {
    return [node];
  }

  const segments = node.namespace.split("/");
  const breadcrumbs: (typeof nodes.$inferSelect)[] = [];

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

    if (parent) breadcrumbs.push(parent);
  }

  breadcrumbs.push(node);
  return breadcrumbs;
}

/**
 * Get related nodes (via links)
 * @param nodeId - The node ID to find relations for
 * @param limit - Maximum number of results
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
 * Full-text search across nodes
 * @param planetId - The planet ID to search within
 * @param query - Search query
 * @param limit - Maximum number of results
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
  { revalidate: 60 }
);

/**
 * Get node count for a namespace (for "X drops" display)
 * @param planetId - The planet ID
 * @param namespace - The namespace to count within
 */
export const getNodeCount = unstable_cache(
  async (planetId: number, namespace: string) => {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(nodes)
      .where(
        and(
          eq(nodes.planet_id, planetId),
          like(nodes.namespace, `${namespace}%`),
          eq(nodes.type, "file")
        )
      );

    return result[0]?.count ?? 0;
  },
  ["node-count"],
  { revalidate: 60 * 60 }
);

// ============================================
// HELPER: Get nodes by depth (water level)
// ============================================

/**
 * Get all oceans for a planet (depth 0, folders only)
 */
export async function getOceans(planetId: number) {
  return getNodeChildren(planetId, "", "folder"); // depth 0
}

/**
 * Get all seas within an ocean (depth 1, folders only)
 */
export async function getSeas(planetId: number, oceanSlug: string) {
  return getNodeChildren(planetId, oceanSlug, "folder"); // depth 1
}

/**
 * Get all rivers within a sea (depth 2, folders only)
 */
export async function getRivers(
  planetId: number,
  oceanSlug: string,
  seaSlug: string
) {
  return getNodeChildren(planetId, `${oceanSlug}/${seaSlug}`, "folder");
}

/**
 * Get all drops within a river (depth 3, files only)
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
