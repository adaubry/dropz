/**
 * Temporary compatibility layer for gradual migration
 * Maps old query patterns to new unified nodes system
 *
 * This allows existing code to continue working while we migrate
 * to the new namespace-based query system.
 *
 * @deprecated Use queries-v2.ts directly for new code
 */

import * as newQueries from "./queries-v2";

// Warn in development about using legacy compatibility layer
if (process.env.NODE_ENV === "development") {
  console.warn(
    "⚠️ Using legacy query compatibility layer. Consider migrating to queries-v2.ts"
  );
}

/**
 * Get all planets (formerly collections)
 * @deprecated Use getPlanetsV2() from queries-v2.ts
 */
export const getCollections = newQueries.getPlanetsV2;

/**
 * Get planet by slug (formerly collection by slug)
 * @deprecated Use getPlanetBySlug() from queries-v2.ts
 */
export const getCollectionBySlug = newQueries.getPlanetBySlug;

/**
 * Get category (now ocean - depth 0 folder)
 * @deprecated Use getNodeByPath() from queries-v2.ts
 */
export async function getCategory(planetSlug: string, categorySlug: string) {
  return newQueries.getNodeByPath(planetSlug, [categorySlug]);
}

/**
 * Get subcategory (now river - depth 2 folder)
 * @deprecated Use getNodeByPath() from queries-v2.ts
 */
export async function getSubcategory(
  planetSlug: string,
  oceanSlug: string,
  seaSlug: string,
  riverSlug: string
) {
  return newQueries.getNodeByPath(planetSlug, [
    oceanSlug,
    seaSlug,
    riverSlug,
  ]);
}

/**
 * Get product (now drop - depth 3 file)
 * @deprecated Use getNodeByPath() from queries-v2.ts
 */
export async function getProduct(
  planetSlug: string,
  oceanSlug: string,
  seaSlug: string,
  riverSlug: string,
  dropSlug: string
) {
  return newQueries.getNodeByPath(planetSlug, [
    oceanSlug,
    seaSlug,
    riverSlug,
    dropSlug,
  ]);
}

/**
 * Search products (now search nodes)
 * @deprecated Use searchNodes() from queries-v2.ts
 */
export const searchProducts = newQueries.searchNodes;

/**
 * Get related content
 * @deprecated Use getRelatedNodes() from queries-v2.ts
 */
export const getRelatedProducts = newQueries.getRelatedNodes;

// Re-export new queries for convenience
export * from "./queries-v2";
