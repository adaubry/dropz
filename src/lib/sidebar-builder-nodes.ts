import { SidebarItem } from "@/components/universal-sidebar";
import {
  getPlanets,
  getPlanetBySlug,
  getNodeByPath,
  getNodeChildren,
} from "./queries";

/**
 * Build sidebar for catch-all route (nodes-based)
 * Parent (n-1): Back button to parent
 * Current (n+1): Children of current node
 * Grandchildren (n+2): Children of children
 */
export async function buildNodesSidebar(
  planetSlug: string,
  path: string[],
): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  const planet = await getPlanetBySlug(planetSlug);
  if (!planet) {
    return { currentItems: [] };
  }

  // Determine current namespace
  const currentNamespace = path.length > 0 ? path.join("/") : "";

  // Get parent link (n-1)
  let parentLink: { title: string; href: string } | undefined;
  if (path.length > 0) {
    // Has a parent - either another node or planet root
    if (path.length > 1) {
      const parentPath = path.slice(0, -1);
      const parentNode = await getNodeByPath(planetSlug, parentPath);
      if (parentNode) {
        parentLink = {
          title: `${parentNode.title}`,
          href: `/${planetSlug}/${parentPath.join("/")}`,
        };
      }
    } else {
      // Parent is the planet root
      parentLink = {
        title: `${planet.name}`,
        href: `/${planetSlug}`,
      };
    }
  } else {
    // At planet root, parent is home
    parentLink = {
      title: "Home",
      href: "/",
    };
  }

  // Get children (n+1) of current node
  const children = await getNodeChildren(planet.id, currentNamespace);

  // Build sidebar items: children (n+1) with grandchildren (n+2)
  const currentItems: SidebarItem[] = await Promise.all(
    children.map(async (child) => {
      const childNamespace = currentNamespace
        ? `${currentNamespace}/${child.slug}`
        : child.slug;

      // Get grandchildren (n+2) of this child
      const grandchildren = await getNodeChildren(planet.id, childNamespace);

      return {
        id: child.id,
        title: child.title,
        href: `/${planetSlug}/${childNamespace}`,
        children:
          grandchildren.length > 0
            ? grandchildren.map((grandchild) => ({
                id: grandchild.id,
                title: grandchild.title,
                href: `/${planetSlug}/${childNamespace}/${grandchild.slug}`,
              }))
            : undefined,
      };
    }),
  );

  return {
    parentLink,
    currentItems,
  };
}
