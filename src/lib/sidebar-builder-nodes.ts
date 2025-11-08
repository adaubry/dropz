import { SidebarItem } from "@/components/universal-sidebar";
import {
  getPlanets,
  getPlanetBySlug,
  getNodeByPath,
  getNodeChildren,
} from "./queries-nodes";

/**
 * Build sidebar for catch-all route (nodes-based)
 * Parent: Parent node in hierarchy
 * Current (n): Siblings of current node
 * Children (n+1): Children of current node
 */
export async function buildNodesSidebar(
  planetSlug: string,
  path: string[]
): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  const planet = await getPlanetBySlug(planetSlug);
  if (!planet) {
    return { currentItems: [] };
  }

  // If we're at planet root (no path), show all planets with their children
  if (path.length === 0) {
    const planets = await getPlanets();
    const currentItems: SidebarItem[] = await Promise.all(
      planets.map(async (p) => {
        const children = await getNodeChildren(p.id, "");
        return {
          id: p.id,
          title: p.name,
          href: `/${p.slug}`,
          children: children.map((child) => ({
            id: child.id,
            title: child.title,
            href: `/${planetSlug}/${child.slug}`,
          })),
        };
      })
    );

    return {
      currentItems,
    };
  }

  // Get current node
  const currentNode = await getNodeByPath(planetSlug, path);
  if (!currentNode) {
    return { currentItems: [] };
  }

  // Get parent node for the parent link
  let parentLink: { title: string; href: string } | undefined;
  if (path.length > 1) {
    const parentPath = path.slice(0, -1);
    const parentNode = await getNodeByPath(planetSlug, parentPath);
    if (parentNode) {
      parentLink = {
        title: parentNode.title,
        href: `/${planetSlug}/${parentPath.join("/")}`,
      };
    }
  } else {
    // Parent is the planet root
    parentLink = {
      title: planet.name,
      href: `/${planetSlug}`,
    };
  }

  // Get siblings (nodes at the same level)
  const parentNamespace = path.length > 1 ? path.slice(0, -1).join("/") : "";
  const siblings = await getNodeChildren(planet.id, parentNamespace);

  // Build sidebar items with children
  const currentItems: SidebarItem[] = await Promise.all(
    siblings.map(async (sibling) => {
      const siblingPath = parentNamespace
        ? `${parentNamespace}/${sibling.slug}`
        : sibling.slug;

      // Get children of this sibling
      const children = await getNodeChildren(planet.id, siblingPath);

      return {
        id: sibling.id,
        title: sibling.title,
        href: `/${planetSlug}/${siblingPath}`,
        children: children.map((child) => ({
          id: child.id,
          title: child.title,
          href: `/${planetSlug}/${siblingPath}/${child.slug}`,
        })),
      };
    })
  );

  return {
    parentLink,
    currentItems,
  };
}
