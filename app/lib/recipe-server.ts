/* ============================================================================
   Server-side recipe reads.

   The SPA fetches every recipe through /api/recipes and routes on the hash.
   That is fine for humans but invisible to everything else: a URL fragment is
   never sent to the server, so link-preview bots and crawlers only ever saw the
   homepage shell. These helpers let a real server route load a single recipe so
   /r/<id> can emit its own title, description and card image.
   ========================================================================== */

import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { recipes as recipesTable } from "../../db/schema";

/** Only the fields the server route and the share card actually need. */
export type PublicRecipe = {
  id: string;
  title: string;
  brewer: string;
  dose: number;
  ratio: number;
  water: number;
  temp?: number;
  grind?: string;
  grinder?: string;
  clicks?: string;
  bean?: string;
  creator?: string;
  roast?: string | string[];
  milk?: boolean;
  createdAt?: string;
  timeline?: {
    id?: string;
    type?: string;
    start?: number;
    duration?: number;
    target?: string;
    note?: string;
  }[];
};

function coerce(raw: unknown): PublicRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id) return null;
  return {
    id: r.id,
    title: typeof r.title === "string" ? r.title : "Untitled recipe",
    brewer: typeof r.brewer === "string" ? r.brewer : "",
    dose: Number(r.dose) || 0,
    ratio: Number(r.ratio) || 0,
    water: Number(r.water) || 0,
    temp: r.temp == null ? undefined : Number(r.temp),
    grind: typeof r.grind === "string" ? r.grind : undefined,
    grinder: typeof r.grinder === "string" ? r.grinder : undefined,
    clicks: typeof r.clicks === "string" ? r.clicks : undefined,
    bean: typeof r.bean === "string" ? r.bean : undefined,
    creator: typeof r.creator === "string" ? r.creator : undefined,
    roast: Array.isArray(r.roast)
      ? (r.roast.filter((x) => typeof x === "string") as string[])
      : typeof r.roast === "string"
        ? r.roast
        : undefined,
    milk: typeof r.milk === "boolean" ? r.milk : undefined,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    timeline: Array.isArray(r.timeline)
      ? (r.timeline as PublicRecipe["timeline"])
      : undefined,
  };
}

/**
 * One recipe by id. Returns null rather than throwing when D1 is unbound or the
 * row is missing — a share link must degrade to the SPA, never to a 500.
 */
export async function getRecipe(id: string): Promise<PublicRecipe | null> {
  if (!id) return null;
  try {
    const db = getDb();
    const rows = await db
      .select({ data: recipesTable.data })
      .from(recipesTable)
      .where(eq(recipesTable.id, id))
      .limit(1);
    if (!rows.length) return null;
    return coerce(JSON.parse(rows[0].data));
  } catch {
    return null;
  }
}

/** Every recipe id, for the sitemap. */
export async function getAllRecipeIds(): Promise<{ id: string; createdAt?: string }[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({ id: recipesTable.id, createdAt: recipesTable.createdAt })
      .from(recipesTable);
    return rows.map((r) => ({ id: r.id, createdAt: r.createdAt ?? undefined }));
  } catch {
    return [];
  }
}

export function formatTime(totalSeconds: number | undefined | null): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "";
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Last timeline event end, which is how long the brew takes. */
export function totalSecondsFor(recipe: PublicRecipe): number | null {
  const events = recipe.timeline ?? [];
  if (!events.length) return null;
  let end = 0;
  for (const e of events) {
    const start = Number(e.start) || 0;
    const duration = Number(e.duration) || 0;
    end = Math.max(end, start + duration);
  }
  return end > 0 ? end : null;
}

export function roastLabel(roast: PublicRecipe["roast"]): string {
  if (!roast) return "";
  return Array.isArray(roast) ? roast.join(" / ") : roast;
}

/**
 * The plain-text block. This is the whole pitch to creators: they paste it
 * straight into a video description instead of retyping a recipe every upload.
 */
export function shareText(recipe: PublicRecipe, url: string): string {
  const lines: string[] = [];
  lines.push(recipe.title + (recipe.creator ? ` — ${recipe.creator}` : ""));
  lines.push("");
  if (recipe.brewer) lines.push(`Brewer:  ${recipe.brewer}`);
  lines.push(`Coffee:  ${recipe.dose}g`);
  lines.push(`Water:   ${recipe.water}g  (1:${recipe.ratio})`);
  if (recipe.temp) lines.push(`Temp:    ${recipe.temp}°C`);
  if (recipe.grind) lines.push(`Grind:   ${recipe.grind}`);
  const total = totalSecondsFor(recipe);
  if (total) lines.push(`Time:    ${formatTime(total)}`);
  if (recipe.bean) lines.push(`Coffee:  ${recipe.bean}`);

  const events = recipe.timeline ?? [];
  if (events.length) {
    lines.push("");
    for (const e of events) {
      const at = formatTime(Number(e.start) || 0);
      const target = e.target ? ` — to ${e.target}` : "";
      const note = e.note ? `  (${e.note})` : "";
      lines.push(`${at}  ${e.type ?? "Step"}${target}${note}`);
    }
  }

  lines.push("");
  lines.push(`Full recipe, and convert it to your grinder: ${url}`);
  return lines.join("\n");
}
