/**
 * CATCH-ALL ROUTE: Handles ANY depth!
 *
 * This single route pattern handles:
 * - /planet → root planet page
 * - /planet/intro → 1 segment
 * - /planet/guides/setup → 2 segments
 * - /planet/courses/cs101/week1/lecture → 4 segments
 * - /planet/a/b/c/d/e/f/g/deep → 8+ segments!
 *
 * NO RECURSION, NO PARENT_ID CHAINS, NO DEPTH LIMITS!
 */

import { notFound } from "next/navigation";
import { getNodeByPath, getNodeChildren, getPlanetBySlug } from "@/lib/queries-nodes";
import { MarkdownPage } from "@/components/markdown-page";

interface WaterCardProps {
  title: string;
  slug: string;
  metadata?: {
    cover?: string;
    summary?: string;
    [key: string]: any;
  };
  href: string;
  type: string;
}

function WaterCard({ title, metadata, href, type }: WaterCardProps) {
  const cover = metadata?.cover || "/default-water.svg";
  const summary = metadata?.summary || "Explore this content...";
  const icon = type === "folder" ? "📁" : "💧";

  return (
    <a
      href={href}
      className="group block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
    >
      {cover && cover !== "/default-water.svg" && (
        <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {summary}
        </p>
      </div>
    </a>
  );
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ planet: string; path?: string[] }>;
}) {
  const { planet, path = [] } = await params;

  // Get the planet
  const planetData = await getPlanetBySlug(planet);
  if (!planetData) return notFound();

  // CRITICAL: This works for ANY depth!
  // Examples:
  // - path = [] → root planet page
  // - path = ["intro"] → 1 segment
  // - path = ["courses", "cs101", "week1", "lecture"] → 4 segments
  // - path = ["a", "b", "c", "d", "e", "f", "g", "deep"] → 8 segments!

  const node = await getNodeByPath(planet, path);

  // If no node found and path is empty, show planet root
  if (!node && path.length === 0) {
    const children = await getNodeChildren(planetData.id, "");

    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🌍 {planetData.name}</h1>
          {planetData.description && (
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {planetData.description}
            </p>
          )}
        </div>

        {children.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <WaterCard
                key={child.id}
                title={child.title}
                slug={child.slug}
                metadata={child.metadata as any}
                href={`/${planet}/${child.slug}`}
                type={child.type}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              This planet is empty. Add some content to get started!
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!node) return notFound();

  // If it's a file (drop), render its markdown content
  if (node.type === "file") {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Breadcrumb navigation */}
        <nav className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          <a
            href={`/${planet}`}
            className="hover:text-blue-600 hover:underline"
          >
            🌍 {planet}
          </a>
          {path.map((segment, i) => (
            <span key={i}>
              {" / "}
              <a
                href={`/${planet}/${path.slice(0, i + 1).join("/")}`}
                className="hover:text-blue-600 hover:underline"
              >
                {segment}
              </a>
            </span>
          ))}
        </nav>

        {/* Main content */}
        <article className="prose prose-lg dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-4">{node.title}</h1>

          {node.metadata?.cover && (
            <img
              src={node.metadata.cover as string}
              alt={node.title}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}

          {node.content && (
            <div className="mt-6">
              <MarkdownPage filePath="" />
              <div
                dangerouslySetInnerHTML={{
                  __html: node.parsed_html || node.content,
                }}
              />
            </div>
          )}
        </article>
      </div>
    );
  }

  // If it's a folder (ocean/sea/river), show children navigation
  // This works at ANY level - no hardcoded depth checks!
  const namespace = path.length > 0 ? path.join("/") : ""; // Namespace from path
  const children = await getNodeChildren(planetData.id, namespace);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Breadcrumb navigation */}
      <nav className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        <a href={`/${planet}`} className="hover:text-blue-600 hover:underline">
          🌍 {planet}
        </a>
        {path.map((segment, i) => (
          <span key={i}>
            {" / "}
            <a
              href={`/${planet}/${path.slice(0, i + 1).join("/")}`}
              className="hover:text-blue-600 hover:underline"
            >
              {segment}
            </a>
          </span>
        ))}
      </nav>

      {/* Page title and description */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{node.title}</h1>
        {node.metadata?.summary && (
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {node.metadata.summary as string}
          </p>
        )}
      </div>

      {/* Show index content if exists (Problem 2 solution) */}
      {node.is_index && node.content && (
        <div className="mb-8 prose prose-lg dark:prose-invert max-w-none">
          <div
            dangerouslySetInnerHTML={{
              __html: node.parsed_html || node.content,
            }}
          />
        </div>
      )}

      {/* Show children - works at any depth (Problem 7 solution) */}
      {children.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <WaterCard
              key={child.id}
              title={child.title}
              slug={child.slug}
              metadata={child.metadata as any}
              href={`/${planet}/${[...path, child.slug].join("/")}`}
              type={child.type}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            This folder is empty.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * PROOF THIS SOLVES PROBLEM 7 (Arbitrary Depth):
 *
 * URL: /cs-degree/courses/cs101/week1/day1/morning/lecture
 * params.path = ["courses", "cs101", "week1", "day1", "morning", "lecture"]
 *
 * Query executed:
 * SELECT * FROM nodes
 * WHERE planet_id = (SELECT id FROM planets WHERE slug = 'cs-degree')
 *   AND namespace = 'courses/cs101/week1/day1/morning'
 *   AND slug = 'lecture'
 *
 * Result: Single O(1) index lookup!
 * No recursion, no joins, no depth limits!
 */
