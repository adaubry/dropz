"use client";

/**
 * N-1 Page Caching Strategy
 *
 * Battle-tested caching principles:
 * 1. Always cache all elements of page n-1 (previous page)
 * 2. Cache navigation links and their targets
 * 3. Prefetch images from linked pages
 * 4. Keep cache small by only storing previous page
 * 5. Clear cache on navigation to prevent memory bloat
 */

interface CachedPage {
  url: string;
  timestamp: number;
  images: string[];
  links: string[];
  data?: any;
}

class PageCache {
  private cache: Map<string, CachedPage> = new Map();
  private currentUrl: string | null = null;
  private previousUrl: string | null = null;
  private maxAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Update current page and cache previous page elements
   */
  navigate(newUrl: string) {
    this.previousUrl = this.currentUrl;
    this.currentUrl = newUrl;

    // Clean up old entries, keeping only n-1 page
    if (this.previousUrl) {
      const keysToDelete = Array.from(this.cache.keys()).filter(
        (key) => key !== this.previousUrl
      );
      keysToDelete.forEach((key) => this.cache.delete(key));
    }
  }

  /**
   * Cache elements from a page
   */
  cachePage(url: string, data: Partial<CachedPage>) {
    const existing = this.cache.get(url);
    this.cache.set(url, {
      url,
      timestamp: Date.now(),
      images: data.images || existing?.images || [],
      links: data.links || existing?.links || [],
      data: data.data || existing?.data,
    });
  }

  /**
   * Get cached page data if still valid
   */
  getCachedPage(url: string): CachedPage | null {
    const cached = this.cache.get(url);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(url);
      return null;
    }

    return cached;
  }

  /**
   * Prefetch images from a page
   */
  prefetchImages(images: string[]) {
    images.forEach((src) => {
      if (typeof window === "undefined") return;

      const img = new Image();
      img.fetchPriority = "low";
      img.decoding = "sync";
      img.src = src;
    });
  }

  /**
   * Get previous page cache (n-1 strategy)
   */
  getPreviousPage(): CachedPage | null {
    if (!this.previousUrl) return null;
    return this.getCachedPage(this.previousUrl);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }
}

// Singleton instance
export const pageCache = new PageCache();

/**
 * Hook to use page cache in components
 */
export function usePageCache() {
  if (typeof window === "undefined") {
    return {
      navigate: () => {},
      cachePage: () => {},
      getCachedPage: () => null,
      getPreviousPage: () => null,
    };
  }

  return {
    navigate: (url: string) => pageCache.navigate(url),
    cachePage: (url: string, data: Partial<CachedPage>) =>
      pageCache.cachePage(url, data),
    getCachedPage: (url: string) => pageCache.getCachedPage(url),
    getPreviousPage: () => pageCache.getPreviousPage(),
  };
}
