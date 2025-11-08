import { SidebarItem } from "@/components/universal-sidebar";
import {
  getPlanets,
  getOceans,
  getPlanetBySlug,
  getNodeByPath,
  getNodeChildren,
} from "./queries-nodes";
import { getOcean, getRiver, getDropsForRiver } from "./queries";

/**
 * Build sidebar for home page
 * Shows all oceans (n+1) with their rivers (n+2) - looking forward
 */
export async function buildHomeSidebar(): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  const planets = await getPlanets();

  // Get all oceans across all planets
  const allOceansNested = await Promise.all(
    planets.map(async (planet) => {
      const oceans = await getOceans(planet.id);
      return oceans.map(ocean => ({ ...ocean, planetSlug: planet.slug }));
    })
  );
  const allOceans = allOceansNested.flat();

  // For each ocean, get its rivers
  const currentItems: SidebarItem[] = await Promise.all(
    allOceans.map(async (ocean) => {
      try {
        const oceanData = await getOcean(ocean.slug);
        const rivers = oceanData?.seas.flatMap((sea) => sea.rivers) || [];

        return {
          id: ocean.id,
          title: ocean.title,
          href: `/${ocean.planetSlug}/${ocean.slug}`,
          children: rivers.map((river) => ({
            id: river.slug,
            title: river.name,
            href: `/drops/${ocean.slug}/${river.slug}`,
          })),
        };
      } catch {
        return {
          id: ocean.id,
          title: ocean.title,
          href: `/${ocean.planetSlug}/${ocean.slug}`,
        };
      }
    })
  );

  return {
    currentItems,
  };
}

/**
 * Build sidebar for planet page
 * Parent (n-1): Just a back link to home
 * Current (n+1): Rivers from oceans in THIS planet - looking forward
 * Children (n+2): Drops in each river
 */
export async function buildPlanetSidebar(planetSlug: string): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  const planet = await getPlanetBySlug(planetSlug);
  if (!planet) {
    return { currentItems: [] };
  }

  const oceans = await getOceans(planet.id);

  // Get all rivers from all oceans in this planet
  const allRiversNested = await Promise.all(
    oceans.map(async (ocean) => {
      try {
        const oceanData = await getOcean(ocean.slug);
        const rivers = oceanData?.seas.flatMap((sea) => sea.rivers) || [];
        return rivers.map(river => ({ ...river, oceanSlug: ocean.slug }));
      } catch {
        return [];
      }
    })
  );
  const allRivers = allRiversNested.flat();

  // For each river, get its drops
  const currentItems: SidebarItem[] = await Promise.all(
    allRivers.map(async (river) => {
      try {
        const drops = await getDropsForRiver(river.slug);
        return {
          id: river.slug,
          title: river.name,
          href: `/drops/${river.oceanSlug}/${river.slug}`,
          children: drops.map((drop) => ({
            id: drop.slug,
            title: drop.name,
            href: `/drops/${river.oceanSlug}/${river.slug}/${drop.slug}`,
          })),
        };
      } catch {
        return {
          id: river.slug,
          title: river.name,
          href: `/drops/${river.oceanSlug}/${river.slug}`,
        };
      }
    })
  );

  return {
    parentLink: {
      title: "← Home",
      href: "/",
    },
    currentItems,
  };
}

/**
 * Build sidebar for ocean page
 * Parent (n-1): Just a back link to home (since we don't have planet in URL)
 * Current (n+1): Drops from rivers in THIS ocean - looking forward
 */
export async function buildOceanSidebar(
  planetSlug: string,
  oceanSlug: string
): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  const oceanData = await getOcean(oceanSlug);

  if (!oceanData) {
    return { currentItems: [] };
  }
  const rivers = oceanData?.seas.flatMap((sea) => sea.rivers) || [];

  // Get all drops from all rivers in this ocean
  const allDropsNested = await Promise.all(
    rivers.map(async (river) => {
      try {
        const drops = await getDropsForRiver(river.slug);
        return drops.map(drop => ({ ...drop, riverSlug: river.slug }));
      } catch {
        return [];
      }
    })
  );
  const allDrops = allDropsNested.flat();

  // Map drops to sidebar items (no children since drops are leaf nodes)
  const currentItems: SidebarItem[] = allDrops.map((drop) => ({
    id: drop.slug,
    title: drop.name,
    href: `/drops/${oceanSlug}/${drop.riverSlug}/${drop.slug}`,
  }));

  return {
    parentLink: {
      title: "← Home",
      href: "/",
    },
    currentItems,
  };
}

/**
 * Build sidebar for river page
 * Parent (n-1): Just a back link to ocean
 * Current (n+1): Empty (drops are leaf nodes, no further navigation)
 */
export async function buildRiverSidebar(
  planetSlug: string,
  oceanSlug: string,
  riverSlug: string
): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  // River page shows drops, so sidebar is empty (looking forward = nothing)
  return {
    parentLink: {
      title: "← Ocean",
      href: `/drops/${oceanSlug}`,
    },
    currentItems: [],
  };
}

/**
 * Build sidebar for drop detail page
 * Parent (n-1): Just a back link to river
 * Current (n+1): Empty (drop is a leaf node, no further navigation)
 */
export async function buildDropSidebar(
  planetSlug: string,
  oceanSlug: string,
  riverSlug: string,
  dropSlug?: string
): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  // Drop is a leaf node, so sidebar is empty (looking forward = nothing)
  return {
    parentLink: {
      title: "← River",
      href: `/drops/${oceanSlug}/${riverSlug}`,
    },
    currentItems: [],
  };
}
