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
 * Shows all planets (n) with their oceans (n+1)
 */
export async function buildHomeSidebar(): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  const planets = await getPlanets();

  const currentItems: SidebarItem[] = await Promise.all(
    planets.map(async (planet) => {
      const oceans = await getOceans(planet.id);
      return {
        id: planet.id,
        title: planet.name,
        href: `/${planet.slug}`,
        children: oceans.map((ocean) => ({
          id: ocean.id,
          title: ocean.title,
          href: `/${planet.slug}/${ocean.slug}`,
        })),
      };
    })
  );

  return {
    currentItems,
  };
}

/**
 * Build sidebar for planet page
 * Parent: Home
 * Current (n): Oceans in this planet
 * Children (n+1): Rivers in each ocean
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

  const currentItems: SidebarItem[] = await Promise.all(
    oceans.map(async (ocean) => {
      // Get ocean details to find rivers
      try {
        const oceanData = await getOcean(ocean.slug);
        const rivers = oceanData?.seas.flatMap((sea) => sea.rivers) || [];

        return {
          id: ocean.id,
          title: ocean.title,
          href: `/${planetSlug}/${ocean.slug}`,
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
          href: `/${planetSlug}/${ocean.slug}`,
        };
      }
    })
  );

  return {
    parentLink: {
      title: "All Planets",
      href: "/",
    },
    currentItems,
  };
}

/**
 * Build sidebar for ocean page
 * Parent: Planet page
 * Current (n): Rivers in this ocean
 * Children (n+1): Drops in each river
 */
export async function buildOceanSidebar(
  planetSlug: string,
  oceanSlug: string
): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  const planet = await getPlanetBySlug(planetSlug);
  const oceanData = await getOcean(oceanSlug);

  if (!oceanData) {
    return { currentItems: [] };
  }
  const rivers = oceanData?.seas.flatMap((sea) => sea.rivers) || [];

  const currentItems: SidebarItem[] = await Promise.all(
    rivers.map(async (river) => {
      try {
        const drops = await getDropsForRiver(river.slug);
        return {
          id: river.slug,
          title: river.name,
          href: `/drops/${oceanSlug}/${river.slug}`,
          children: drops.map((drop) => ({
            id: drop.slug,
            title: drop.name,
            href: `/drops/${oceanSlug}/${river.slug}/${drop.slug}`,
          })),
        };
      } catch {
        return {
          id: river.slug,
          title: river.name,
          href: `/drops/${oceanSlug}/${river.slug}`,
        };
      }
    })
  );

  return {
    parentLink: planet
      ? {
          title: planet.name,
          href: `/${planetSlug}`,
        }
      : undefined,
    currentItems,
  };
}

/**
 * Build sidebar for river page
 * Parent: Ocean page
 * Current (n): Drops in this river
 */
export async function buildRiverSidebar(
  planetSlug: string,
  oceanSlug: string,
  riverSlug: string
): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  const river = await getRiver(riverSlug);
  const drops = await getDropsForRiver(riverSlug);

  const currentItems: SidebarItem[] = drops.map((drop) => ({
    id: drop.slug,
    title: drop.name,
    href: `/drops/${oceanSlug}/${riverSlug}/${drop.slug}`,
  }));

  return {
    parentLink: river
      ? {
          title: `${river.name} - ${oceanSlug}`,
          href: `/drops/${oceanSlug}`,
        }
      : undefined,
    currentItems,
  };
}

/**
 * Build sidebar for drop detail page
 * Parent: River page
 * Current (n): This drop and related drops
 */
export async function buildDropSidebar(
  planetSlug: string,
  oceanSlug: string,
  riverSlug: string,
  dropSlug: string
): Promise<{
  parentLink?: { title: string; href: string };
  currentItems: SidebarItem[];
}> {
  const river = await getRiver(riverSlug);
  const drops = await getDropsForRiver(riverSlug);

  const currentItems: SidebarItem[] = drops.map((drop) => ({
    id: drop.slug,
    title: drop.name,
    href: `/drops/${oceanSlug}/${riverSlug}/${drop.slug}`,
  }));

  return {
    parentLink: river
      ? {
          title: river.title,
          href: `/drops/${oceanSlug}/${riverSlug}`,
        }
      : undefined,
    currentItems,
  };
}
