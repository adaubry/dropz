import { NextRequest, NextResponse } from "next/server";
import { getPlanetBySlug } from "@/lib/queries";
import { db } from "@/db";
import { nodes } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Validates if a given path exists in the application
 *
 * Static routes: /, /scan, /profile, /profile/edit, /docs, /logseq-demo
 * Dynamic routes: /[planet]/[[...path]]
 */
export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Static routes that are always valid
    const staticRoutes = [
      "/",
      "/scan",
      "/profile",
      "/profile/edit",
      "/docs",
      "/logseq-demo",
    ];

    if (staticRoutes.includes(path)) {
      return NextResponse.json({ valid: true });
    }

    // For dynamic routes, check if the node exists
    const segments = path.split("/").filter(Boolean);

    if (segments.length === 0) {
      // Root path
      return NextResponse.json({ valid: true });
    }

    // First segment is the planet slug
    const planetSlug = segments[0];
    const planet = await getPlanetBySlug(planetSlug);

    if (!planet) {
      return NextResponse.json({ valid: false });
    }

    // If path is just the planet (e.g., /myplanet), it's valid
    if (segments.length === 1) {
      return NextResponse.json({ valid: true });
    }

    // For deeper paths, check if the node exists
    const pathSegments = segments.slice(1); // Remove planet slug
    const slug = pathSegments[pathSegments.length - 1];
    const namespace = pathSegments.slice(0, -1).join("/");

    const node = await db.query.nodes.findFirst({
      where: and(
        eq(nodes.planet_id, planet.id),
        eq(nodes.namespace, namespace),
        eq(nodes.slug, slug)
      ),
    });

    return NextResponse.json({ valid: !!node });
  } catch (error) {
    console.error("Error validating path:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
