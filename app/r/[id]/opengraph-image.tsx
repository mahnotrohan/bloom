/* ============================================================================
   Per-recipe link-preview card.

   This is the advertisement. When a Bloom link lands in a coffee Discord, a
   WhatsApp group or a tweet, this image is what people actually see — so it
   carries the four numbers that make a recipe recognisable at thumbnail size.

   Rendered with next/og (satori + resvg-wasm). If that fails on the Workers
   runtime for any reason, the catch below returns a plain wordmark card rather
   than a broken image, and the text metadata in page.tsx still does its job.
   ========================================================================== */

import { ImageResponse } from "next/og";
import { getRecipe, formatTime, totalSecondsFor, roastLabel } from "../../lib/recipe-server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Bloom coffee recipe";

const paper = "#f8faf0";
const ink = "#1a1c17";
const muted = "#6b7163";
const soft = "#43483e";
const rule = "#c9cdbf";
const accent = "#456743";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: paper,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        fontFamily: "sans-serif",
      }}
    >
      {children}
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const recipe = await getRecipe(id);

    if (!recipe) {
      return new ImageResponse(
        (
          <Shell>
            <div style={{ fontSize: 56, fontWeight: 500, color: ink }}>Bloom</div>
            <div style={{ fontSize: 28, color: soft, marginTop: 12 }}>
              Brew, log and share coffee recipes
            </div>
          </Shell>
        ),
        size,
      );
    }

    const total = totalSecondsFor(recipe);
    const stats: [string, string][] = [
      ["RATIO", `1:${recipe.ratio}`],
      ["COFFEE", `${recipe.dose}g`],
      ["WATER", `${recipe.water}g`],
      ["TIME", total ? formatTime(total) : "—"],
    ];
    const kicker = [recipe.brewer, roastLabel(recipe.roast)]
      .filter(Boolean)
      .join(" · ")
      .toUpperCase();

    return new ImageResponse(
      (
        <Shell>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
              <div style={{ fontSize: 22, letterSpacing: 3, color: muted }}>{kicker}</div>
              <div
                style={{
                  fontSize: recipe.title.length > 26 ? 58 : 68,
                  fontWeight: 500,
                  color: ink,
                  marginTop: 18,
                  lineHeight: 1.1,
                }}
              >
                {recipe.title}
              </div>
              {recipe.creator ? (
                <div style={{ fontSize: 30, color: soft, marginTop: 16 }}>{recipe.creator}</div>
              ) : null}
            </div>
            <div style={{ display: "flex", width: 8, height: 84, background: accent }} />
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 64,
              paddingTop: 32,
              borderTop: `2px solid ${rule}`,
            }}
          >
            {stats.map(([label, value]) => (
              <div
                key={label}
                style={{ display: "flex", flexDirection: "column", width: 260 }}
              >
                <div style={{ fontSize: 20, letterSpacing: 2, color: muted }}>{label}</div>
                <div style={{ fontSize: 52, fontWeight: 500, color: ink, marginTop: 8 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 40,
              paddingTop: 24,
              borderTop: `2px solid ${rule}`,
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 500, color: ink }}>Bloom</div>
            <div style={{ fontSize: 22, color: muted }}>bloom.rohanmahnot.space</div>
          </div>
        </Shell>
      ),
      size,
    );
  } catch {
    // Never ship a broken image to a crawler.
    return new ImageResponse(
      (
        <Shell>
          <div style={{ fontSize: 56, fontWeight: 500, color: ink }}>Bloom</div>
          <div style={{ fontSize: 28, color: soft, marginTop: 12 }}>
            Brew, log and share coffee recipes
          </div>
        </Shell>
      ),
      size,
    );
  }
}
