import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { recipes } from "../../../db/schema";

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table")) {
    return "The recipes table is unavailable. Apply the migration in drizzle/ to the D1 database, then redeploy.";
  }

  return message;
}

// GET /api/recipes — every published recipe, newest first.
export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(recipes)
      .orderBy(desc(recipes.createdAt), desc(recipes.id));

    const parsed = rows
      .map((row) => {
        try {
          return JSON.parse(row.data) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((recipe): recipe is Record<string, unknown> => recipe !== null);

    return Response.json({ recipes: parsed });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

// POST /api/recipes — create or update a recipe (idempotent by id).
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const id = typeof payload.id === "string" ? payload.id.trim() : "";

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const creator = typeof payload.creator === "string" ? payload.creator : "";
    const title = typeof payload.title === "string" ? payload.title : "";
    const createdAt =
      typeof payload.createdAt === "string" && payload.createdAt
        ? payload.createdAt
        : new Date().toISOString();
    const data = JSON.stringify({ ...payload, id, createdAt });

    const db = getDb();
    await db
      .insert(recipes)
      .values({ id, creator, title, data, createdAt })
      .onConflictDoUpdate({
        target: recipes.id,
        set: { creator, title, data, createdAt },
      });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

// DELETE /api/recipes?id=<id> — remove a recipe permanently.
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const db = getDb();
    await db.delete(recipes).where(eq(recipes.id, id));

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
