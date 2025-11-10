import { NextRequest, NextResponse } from "next/server";
import { getUser, getUserPlanets, createPlanet, deletePlanet } from "@/lib/queries";

/**
 * GET /api/planets
 * Get all planets owned by the current user
 */
export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planets = await getUserPlanets(user.id);

    return NextResponse.json({ planets });
  } catch (error: any) {
    console.error("Error fetching planets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch planets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/planets
 * Create a new planet
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description } = body;

    // Validation
    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const planet = await createPlanet(user.id, {
      name,
      slug,
      description,
    });

    return NextResponse.json({ planet }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating planet:", error);

    if (error.message.includes("already taken")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to create planet" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/planets
 * Delete a planet
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planetIdStr = searchParams.get("planetId");

    if (!planetIdStr) {
      return NextResponse.json(
        { error: "planetId is required" },
        { status: 400 }
      );
    }

    const planetId = parseInt(planetIdStr, 10);

    await deletePlanet(planetId, user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting planet:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete planet" },
      { status: 500 }
    );
  }
}
