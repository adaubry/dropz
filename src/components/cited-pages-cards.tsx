/**
 * Cited Pages Cards Component
 *
 * Displays water cards for pages that are referenced/cited in the current page
 * Shows below the main content for Logseq pages
 */

import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import Image from "next/image";
import { Link } from "@/components/ui/link";

interface CitedPagesCardsProps {
  pageNames: string[];
  planetId: number;
  planetSlug: string;
}

export async function CitedPagesCards({
  pageNames,
  planetId,
  planetSlug,
}: CitedPagesCardsProps) {
  if (pageNames.length === 0) {
    return null;
  }

  // Look up all cited pages in the database
  const citedPages = await db.query.nodes.findMany({
    where: and(
      eq(nodes.planet_id, planetId),
      inArray(nodes.page_name, pageNames)
    ),
    columns: {
      id: true,
      slug: true,
      title: true,
      page_name: true,
      metadata: true,
      type: true,
      namespace: true,
    },
  });

  if (citedPages.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Referenced Pages
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {citedPages.map((page) => {
          const cover = (page.metadata as any)?.cover || "/placeholder.svg";
          const summary = (page.metadata as any)?.summary || "View this page...";
          const icon = page.type === "folder" ? "📁" : "📄";

          // Build href from page_name or fallback to namespace + slug
          const href = page.page_name
            ? `/${planetSlug}/${page.page_name}`
            : `/${planetSlug}/${page.namespace ? page.namespace + "/" : ""}${page.slug}`;

          return (
            <Link
              key={page.id}
              prefetch={true}
              href={href}
              className="group block border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-white dark:bg-gray-800"
            >
              {cover && cover !== "/default-water.svg" && (
                <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
                  <Image
                    loading="lazy"
                    decoding="async"
                    src={cover}
                    alt={page.title}
                    width={400}
                    height={225}
                    quality={75}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}

              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-2">
                  <span>{icon}</span>
                  <span>{page.page_name || page.title}</span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {summary}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
