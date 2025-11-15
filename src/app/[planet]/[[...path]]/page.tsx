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
import { getNodeByPath, getNodeChildren, getPlanetBySlug, getUser, getActiveEditingSession, getFolderIndexPage } from "@/lib/queries";
import { MarkdownPage } from "@/components/markdown-page";
import { Link } from "@/components/ui/link";
import Image from "next/image";
import { EditingToolbar } from "@/components/editing-toolbar";
import { EditableCard } from "@/components/editable-card";
import { FolderIndexContent } from "@/components/folder-index-content";
import { EditablePlanetTitle } from "@/components/editable-planet-title";
import { HistoryBreadcrumbs } from "@/components/history-breadcrumbs";
import { LogseqPageLinks } from "@/components/logseq-page-links";
import { StaticContentRenderer } from "@/components/static-content-renderer";
import { CitedPagesCards } from "@/components/cited-pages-cards";
import { db } from "@/db";
import { nodes } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Helper: Check if we're in a Logseq context
 * Returns true if we're inside "pages" or "journals" folders
 */
function isLogseqContext(path: string[]): boolean {
  if (path.length === 0) return false;
  const rootFolder = path[0];
  return rootFolder === "pages" || rootFolder === "journals";
}

/**
 * Helper: Check if we're at planet root showing only "pages" and "journal"
 */
function isPlanetRoot(path: string[]): boolean {
  return path.length === 0;
}

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
  imageCount: number;
}

function WaterCard({ title, metadata, href, type, imageCount }: WaterCardProps) {
  const cover = metadata?.cover || "/placeholder.svg";
  const summary = metadata?.summary || "Explore this content...";
  const icon = type === "folder" ? "📁" : "💧";

  return (
    <Link
      prefetch={true}
      href={href}
      className="group block border overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
    >
      {cover && cover !== "/default-water.svg" && (
        <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
          <Image
            loading={imageCount < 15 ? "eager" : "lazy"}
            decoding="sync"
            src={cover}
            alt={title}
            width={400}
            height={225}
            quality={75}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {summary}
        </p>
      </div>
    </Link>
  );
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ planet: string; path?: string[] }>;
}) {
  const { planet, path = [] } = await params;
  const user = await getUser();

  // Get the planet
  const planetData = await getPlanetBySlug(planet);
  if (!planetData) return notFound();

  console.log(`[DEBUG] Page load for planet: ${planet}`);
  console.log(`[DEBUG] - User:`, user ? { id: user.id, username: user.username } : 'NOT LOGGED IN');
  console.log(`[DEBUG] - Planet data:`, { id: planetData.id, name: planetData.name, user_id: planetData.user_id });

  // Check if this is the user's own workspace
  const isOwnWorkspace = user && planetData.user_id === user.id;
  console.log(`[DEBUG] - isOwnWorkspace: ${isOwnWorkspace} (user=${!!user}, user.id=${user?.id}, planet.user_id=${planetData.user_id})`);

  // Check if editing mode is active
  const editingSession = isOwnWorkspace
    ? await getActiveEditingSession(user.id, planetData.id)
    : null;
  const isEditingActive = !!editingSession;

  // CRITICAL: This works for ANY depth!
  // Examples:
  // - path = [] → root planet page
  // - path = ["intro"] → 1 segment
  // - path = ["courses", "cs101", "week1", "lecture"] → 4 segments
  // - path = ["a", "b", "c", "d", "e", "f", "g", "deep"] → 8 segments!

  const node = await getNodeByPath(planet, path);

  let imageCount = 0;

  // If no node found and path is empty, show planet root
  if (!node && path.length === 0) {
    const allChildren = await getNodeChildren(planetData.id, "");

    // For Logseq planets, filter to show only "pages" and "journals" folders
    // For other planets, show all children
    const hasLogseqFolders = allChildren.some(
      (c) => c.slug === "pages" || c.slug === "journals"
    );
    const children = hasLogseqFolders
      ? allChildren.filter((c) => c.slug === "pages" || c.slug === "journals")
      : allChildren;

    // Get root index page to extract cited pages
    const rootIndexPage = await getFolderIndexPage(planetData.id, "");
    const rootCitedPageNames = rootIndexPage?.metadata?.page_refs ||
      (rootIndexPage?.content ? getUniquePageReferences(rootIndexPage.content) : []);

    console.log(`[DEBUG] Planet root: ${planet}, planetId: ${planetData.id}`);
    console.log(`[DEBUG] All children count: ${allChildren.length}`);
    console.log(`[DEBUG] Filtered children count: ${children.length}`);
    console.log(`[DEBUG] Children:`, children.map(c => ({ id: c.id, slug: c.slug, namespace: c.namespace, type: c.type })));

    return (
      <>
        {isOwnWorkspace && (
          <EditingToolbar
            workspaceSlug={planet}
            planetId={planetData.id}
            planetName={planetData.name}
          />
        )}
        <main
          className="min-h-[calc(100vh-113px)] flex-1 overflow-y-auto p-4 pt-0 "
          id="main-content"
        >
          <div className="container mx-auto p-4 max-w-7xl">
        <EditablePlanetTitle planet={planetData} isEditing={isEditingActive} />

        {/* Show root index page (page.md) if exists */}
        <FolderIndexContent planetId={planetData.id} namespace="" />

        {children.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <EditableCard
                key={child.id}
                node={child}
                href={`/${planet}/${child.slug}`}
                imageCount={imageCount++}
                isEditing={isEditingActive}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {hasLogseqFolders
                ? "Upload a Logseq graph to populate pages and journals!"
                : "This planet is empty. Add some content to get started!"}
            </p>
          </div>
        )}

        {/* Display water cards for cited pages in root index (if any) */}
        {rootCitedPageNames.length > 0 && (
          <CitedPagesCards
            pageNames={rootCitedPageNames}
            planetId={planetData.id}
            planetSlug={planet}
          />
        )}
          </div>
        </main>
      </>
    );
  }

  if (!node) return notFound();

  // If it's a file (drop), render its markdown content
  if (node.type === "file") {
    // Check if this is a Logseq page (has page_name field)
    const isLogseqPage = !!node.page_name;

    // Extract page references for cited pages cards
    // Use metadata.page_refs from Rust export
    const citedPageNames = node.metadata?.page_refs || [];

    return (
      <>
        {isOwnWorkspace && (
          <EditingToolbar
            workspaceSlug={planet}
            planetId={planetData.id}
            planetName={planetData.name}
          />
        )}

        <main
          className="min-h-[calc(100vh-113px)] flex-1 overflow-y-auto p-4 pt-0 "
          id="main-content"
        >
          <div className="container mx-auto p-4 max-w-4xl">
        {/* Editable markdown editor (only in edit mode) */}
        {isEditingActive && (
          <EditableMarkdown node={node} isEditing={isEditingActive} />
        )}

        {/* History-based breadcrumb navigation */}
        <HistoryBreadcrumbs />

        {/* Main content - Logseq pages use pre-rendered HTML ONLY */}
        {isLogseqPage ? (
          // Logseq page rendering - ONLY use parsed_html from Rust export tool
          node.parsed_html ? (
            <StaticContentRenderer
              html={node.parsed_html}
              className="prose prose-lg dark:prose-invert max-w-none"
            />
          ) : (
            // If parsed_html is missing, show error message
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Content Not Available
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                  This Logseq page has not been properly ingested. Please re-upload your Logseq graph.
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Logseq pages require the Rust export tool to generate pre-rendered HTML.
                </p>
              </div>
            </div>
          )
        ) : (
          // Regular page rendering
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h1 className="text-4xl font-bold mb-4">{node.title}</h1>

            {node.metadata?.cover && (
              <Image
                loading={imageCount++ < 15 ? "eager" : "lazy"}
                decoding="sync"
                src={node.metadata.cover as string}
                alt={node.title}
                width={800}
                height={400}
                quality={80}
                className="w-full h-64 object-cover lg mb-6"
              />
            )}

            {node.parsed_html && (
              <div className="mt-6">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: node.parsed_html }} />
                </div>
              </div>
            )}
          </article>
        )}

        {/* Display water cards for cited pages (Logseq requirement) */}
        {citedPageNames.length > 0 && (
          <CitedPagesCards
            pageNames={citedPageNames}
            planetId={planetData.id}
            planetSlug={planet}
          />
        )}
          </div>
        </main>
      </>
    );
  }

  // If it's a folder (ocean/sea/river), show children navigation
  // This works at ANY level - no hardcoded depth checks!
  const namespace = path.length > 0 ? path.join("/") : ""; // Namespace from path
  const children = await getNodeChildren(planetData.id, namespace);

  // Check if this is a Logseq folder (pages or journals)
  const isLogseqFolder = node.metadata?.isLogseqFolder === true;

  // If it's a Logseq folder, show all Logseq pages from that source folder
  if (isLogseqFolder) {
    const sourceFolder = node.slug as 'pages' | 'journals';

    const logseqPages = await db.query.nodes.findMany({
      where: and(
        eq(nodes.planet_id, planetData.id),
        eq(nodes.source_folder, sourceFolder),
        eq(nodes.type, "file")
      ),
      orderBy: sourceFolder === 'journals'
        ? [desc(nodes.journal_date)]
        : [nodes.page_name],
    });

    return (
      <>
        {isOwnWorkspace && (
          <EditingToolbar
            workspaceSlug={planet}
            planetId={planetData.id}
            planetName={planetData.name}
          />
        )}
        <main
          className="min-h-[calc(100vh-113px)] flex-1 overflow-y-auto p-4 pt-0 "
          id="main-content"
        >
          <div className="container mx-auto p-4 max-w-7xl">
            <HistoryBreadcrumbs />
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">{node.title}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {sourceFolder === 'journals'
                  ? 'Your daily journal entries'
                  : 'All your Logseq pages'}
              </p>
            </div>

            <LogseqPageLinks
              pages={logseqPages}
              planetSlug={planet}
              currentPath={path}
            />
          </div>
        </main>
      </>
    );
  }

  // Determine which display style to use
  const useLogseqLinks = isLogseqContext(path);

  // Get folder index page (page.md or readme.md) to extract cited pages
  const folderIndexPage = await getFolderIndexPage(planetData.id, namespace);
  const citedPageNames = folderIndexPage?.content
    ? getUniquePageReferences(folderIndexPage.content)
    : [];

  return (
    <>
      {isOwnWorkspace && (
        <EditingToolbar
          workspaceSlug={planet}
          planetId={planetData.id}
          planetName={planetData.name}
        />
      )}

      <main
        className="min-h-[calc(100vh-113px)] flex-1 overflow-y-auto p-4 pt-0 "
        id="main-content"
      >
        <div className="container mx-auto p-4 max-w-7xl">
      {/* History-based breadcrumb navigation */}
      <HistoryBreadcrumbs />

      {/* Page title and description */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{node.title}</h1>
        {node.metadata?.summary && (
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {node.metadata.summary as string}
          </p>
        )}
      </div>

      {/* Show folder index page (page.md) if exists */}
      <FolderIndexContent planetId={planetData.id} namespace={namespace} />

      {/* Show children - either as Logseq links or water cards */}
      {children.length > 0 ? (
        useLogseqLinks ? (
          // Logseq-style links for pages inside "pages" or "journals"
          <LogseqPageLinks
            pages={children}
            planetSlug={planet}
            currentPath={path}
          />
        ) : (
          // Water cards for planet root and oceans
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <EditableCard
                key={child.id}
                node={child}
                href={`/${planet}/${[...path, child.slug].join("/")}`}
                imageCount={imageCount++}
                isEditing={isEditingActive}
              />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {useLogseqLinks
              ? "No pages yet. Upload a Logseq graph to get started!"
              : "This folder is empty."}
          </p>
        </div>
      )}

      {/* Display water cards for cited pages in folder index (if any) */}
      {citedPageNames.length > 0 && (
        <CitedPagesCards
          pageNames={citedPageNames}
          planetId={planetData.id}
          planetSlug={planet}
        />
      )}
        </div>
      </main>
    </>
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
