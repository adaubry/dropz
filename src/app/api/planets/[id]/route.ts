import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { planets } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getUser,
  getUserWorkspace,
  getActiveEditingSession,
} from "@/lib/queries";

/**
 * PUT /api/planets/[id]
 * Update a planet (requires active editing session)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const planetId = parseInt(id);

    if (isNaN(planetId)) {
      return NextResponse.json({ error: "Invalid planet ID" }, { status: 400 });
    }

    const workspace = await getUserWorkspace(user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (workspace.id !== planetId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for active editing session
    const session = await getActiveEditingSession(user.id, workspace.id);
    if (!session) {
      return NextResponse.json(
        { error: "No active editing session. Please enable editing mode." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate slug format if provided
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      name,
      updated_at: new Date(),
    };

    if (slug) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;

    // Update the planet
    const [updatedPlanet] = await db
      .update(planets)
      .set(updateData)
      .where(eq(planets.id, planetId))
      .returning();

    revalidateTag("planets");
    return NextResponse.json(updatedPlanet);
  } catch (error: any) {
    console.error("Error updating planet:", error);
    return NextResponse.json(
      { error: "Failed to update planet", details: error.message },
      { status: 500 }
    );
  }
}
