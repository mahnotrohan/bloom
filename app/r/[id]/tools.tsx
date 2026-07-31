"use client";

/* ============================================================================
   The interactive part of a shared recipe page.

   Two jobs, both of which are the reason someone opens a shared link:
     1. Translate the grind into the reader's own grinder.
     2. Hand over the recipe as plain text, for video descriptions and captions.

   Everything else on /r/<id> is server-rendered and works without JS. This
   island is additive.
   ========================================================================== */

import { useMemo, useState } from "react";
import {
  grinderNames,
  translateGrind,
  micronsForRecipe,
  bandFor,
  type GrindSource,
} from "../../lib/grind";
import { GrindSwatch, spreadFor } from "../../lib/grind-canvas";
import { useMyGrinder } from "../../lib/use-my-grinder";

const ink = "#2c2c2a";
const muted = "#888780";
const soft = "#5f5e5a";
const rule = "#d3d1c7";
const accentBg = "#f0ece3";

export default function RecipeTools({
  recipe,
  shareBlock,
  recipeId,
}: {
  recipe: GrindSource & { temp?: number };
  shareBlock: string;
  recipeId: string;
}) {
  // Same store the main app uses, so a grinder chosen here is remembered there.
  const [myGrinder, chooseGrinder] = useMyGrinder();
  const [copied, setCopied] = useState<"" | "text" | "link">("");

  const translation = useMemo(
    () => (myGrinder ? translateGrind(recipe, myGrinder) : null),
    [recipe, myGrinder],
  );

  // Independent of the grinder — microns belong to the recipe, so the swatch
  // renders for a visitor who has never set anything up.
  const microns = useMemo(() => micronsForRecipe(recipe), [recipe]);

  async function copy(kind: "text" | "link") {
    const payload =
      kind === "text" ? shareBlock : `https://bloom.rohanmahnot.space/r/${recipeId}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(kind);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      // Clipboard blocked — leave the textarea below as the fallback.
    }
  }

  const published = recipe.grind || (recipe.grinder && recipe.clicks)
    ? recipe.grinder && recipe.clicks
      ? `${recipe.clicks} on a ${recipe.grinder}`
      : recipe.grind
    : null;

  return (
    <div style={{ marginTop: 4 }}>
      <section
        style={{
          border: `1px solid ${rule}`,
          borderRadius: 10,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: muted,
            marginBottom: 10,
          }}
        >
          Grind
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* A first-time visitor arriving from a shared link has no idea what
              "21 clicks" means. The picture and the household reference do. */}
          {microns ? (
            <GrindSwatch
              microns={microns.mid}
              width={124}
              height={70}
              spread={spreadFor(translation?.confidence ?? microns.confidence)}
            />
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 500, color: ink }}>
              {translation?.ok ? translation.display : published || "Not specified"}
            </div>
            {translation?.ok ? (
              <div style={{ fontSize: 12, color: muted, marginTop: 3 }}>
                on your {translation.grinderName}
                {published ? ` · published as ${published}` : ""}
              </div>
            ) : null}
            {microns ? (
              <div style={{ fontSize: 12, color: soft, marginTop: 5 }}>
                ≈ {microns.mid} µm — like {bandFor(microns.mid).like}
              </div>
            ) : null}
          </div>
        </div>

        <label
          style={{
            display: "block",
            fontSize: 12,
            color: soft,
            marginTop: 14,
            marginBottom: 5,
          }}
        >
          Your grinder
        </label>
        <select
          value={myGrinder}
          onChange={(e) => chooseGrinder(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 320,
            padding: "8px 10px",
            fontSize: 14,
            color: ink,
            border: `1px solid ${rule}`,
            borderRadius: 7,
            background: "transparent",
          }}
        >
          <option value="">Choose to convert this recipe…</option>
          {grinderNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {translation && !translation.ok && translation.reason === "out-of-range" ? (
          <p style={{ fontSize: 13, color: soft, marginTop: 10 }}>
            This grind sits outside your grinder&apos;s range.
          </p>
        ) : null}

        {translation?.ok && translation.caveats.length ? (
          <div
            style={{
              marginTop: 12,
              background: accentBg,
              borderRadius: 7,
              padding: "9px 11px",
            }}
          >
            {translation.caveats.map((c) => (
              <p key={c} style={{ fontSize: 12, color: soft, margin: "2px 0", lineHeight: 1.5 }}>
                {c}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => copy("link")}
          style={{
            fontSize: 13,
            padding: "8px 13px",
            borderRadius: 7,
            border: `1px solid ${rule}`,
            background: "transparent",
            color: ink,
            cursor: "pointer",
          }}
        >
          {copied === "link" ? "Link copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => copy("text")}
          style={{
            fontSize: 13,
            padding: "8px 13px",
            borderRadius: 7,
            border: `1px solid ${rule}`,
            background: "transparent",
            color: ink,
            cursor: "pointer",
          }}
        >
          {copied === "text" ? "Recipe copied" : "Copy as text"}
        </button>
      </section>
    </div>
  );
}
