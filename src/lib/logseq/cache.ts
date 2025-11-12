/**
 * Block Index Cache - In-Memory Implementation
 *
 * For production with multiple instances, use Redis or similar distributed cache.
 * This in-memory version works for single-instance deployments.
 */

import type { BlockIndex } from './references'
import { buildBlockIndex } from './references'

interface CacheEntry {
  index: BlockIndex
  timestamp: number
}

// In-memory cache
const blockIndexCache = new Map<number, CacheEntry>()

// Cache TTL: 1 hour
const CACHE_TTL = 3600000

/**
 * Get cached block index or build new one
 * Performance: O(1) on cache hit, O(N) on cache miss
 */
export async function getCachedBlockIndex(planetId: number): Promise<BlockIndex> {
  const now = Date.now()
  const cached = blockIndexCache.get(planetId)

  // Return cached if still valid
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log(`[BlockIndex] Cache HIT for planet ${planetId}`)
    return cached.index
  }

  // Build new index and cache it
  console.log(`[BlockIndex] Cache MISS for planet ${planetId} - building index`)
  const index = await buildBlockIndex(planetId)

  blockIndexCache.set(planetId, {
    index,
    timestamp: now,
  })

  console.log(`[BlockIndex] Built and cached index with ${Object.keys(index).length} blocks`)
  return index
}

/**
 * Invalidate cache when graph is updated
 * Call this after:
 * - Uploading new Logseq graph
 * - Updating page content
 * - Deleting pages
 */
export function invalidateBlockIndexCache(planetId: number): void {
  const existed = blockIndexCache.has(planetId)
  blockIndexCache.delete(planetId)

  if (existed) {
    console.log(`[BlockIndex] Cache INVALIDATED for planet ${planetId}`)
  }
}

/**
 * Clear all caches (for maintenance/testing)
 */
export function clearAllCaches(): void {
  const count = blockIndexCache.size
  blockIndexCache.clear()
  console.log(`[BlockIndex] Cleared ${count} cached planet indexes`)
}

/**
 * Get cache stats (for monitoring)
 */
export function getCacheStats() {
  const stats = {
    cachedPlanets: blockIndexCache.size,
    planets: Array.from(blockIndexCache.keys()),
    totalBlocks: 0,
  }

  for (const entry of blockIndexCache.values()) {
    stats.totalBlocks += Object.keys(entry.index).length
  }

  return stats
}
