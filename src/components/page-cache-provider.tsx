"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pageCache } from "@/lib/page-cache";

/**
 * Provider component that tracks navigation and manages page cache
 * Implements n-1 caching strategy automatically
 */
export function PageCacheProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Update navigation and cache previous page
    pageCache.navigate(pathname);

    // Cache current page's images and links
    const cacheCurrentPage = () => {
      const images = Array.from(document.querySelectorAll("img"))
        .map((img) => img.src)
        .filter(Boolean);

      const links = Array.from(document.querySelectorAll("a"))
        .map((a) => a.href)
        .filter((href) => href && href.startsWith(window.location.origin));

      pageCache.cachePage(pathname, { images, links });

      // Prefetch previous page if available
      const previousPage = pageCache.getPreviousPage();
      if (previousPage) {
        pageCache.prefetchImages(previousPage.images);
      }
    };

    // Wait for images to load before caching
    if (document.readyState === "complete") {
      cacheCurrentPage();
    } else {
      window.addEventListener("load", cacheCurrentPage);
      return () => window.removeEventListener("load", cacheCurrentPage);
    }
  }, [pathname]);

  return <>{children}</>;
}
