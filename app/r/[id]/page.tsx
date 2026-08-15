/* ============================================================================
   /r/<id> — the canonical, shareable recipe page.

   Why this exists: the app is a hash-routed SPA, and a URL fragment is never
   sent to the server. So every link ever shared showed the homepage shell in
   WhatsApp, Slack, Twitter and Google — placeholder recipes, wrong title, no
   card. This route is a real server component, so it can emit its own title,
   description and card image, and it renders the recipe as HTML that works with
   no JavaScript at all.

   The interactive brew timer still lives in the SPA; "Brew along" links there.
   ========================================================================== */

import type { Metadata } from "next";
import Link from "next/link";
import {
  getRecipe,
  formatTime,
  totalSecondsFor,
  roastLabel,
  shareText,
  type PublicRecipe,
} from "../../lib/recipe-server";
import RecipeTools from "./tools";

const SITE = "https://bloom.rohanmahnot.space";

type Params = { params: Promise<{ id: string }> };

function describe(recipe: PublicRecipe): string {
  const bits: string[] = [];
  if (recipe.brewer) bits.push(recipe.brewer);
  if (recipe.dose && recipe.ratio) bits.push(`${recipe.dose}g at 1:${recipe.ratio}`);
  const total = totalSecondsFor(recipe);
  if (total) bits.push(`in ${formatTime(total)}`);
  const head = bits.join(" · ");
  const bean = recipe.bean ? ` ${recipe.bean}.` : "";
  return `${head}.${bean} Convert it to your own grinder and dose on Bloom.`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    return {
      title: "Recipe not found — Bloom",
      description: "This Bloom recipe is no longer available.",
      robots: { index: false, follow: true },
    };
  }

  const title = `${recipe.title}${recipe.creator ? ` — ${recipe.creator}` : ""} | Bloom`;
  const description = describe(recipe);
  const url = `${SITE}/r/${recipe.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "Bloom",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/** schema.org Recipe, so search results can show the numbers directly. */
function structuredData(recipe: PublicRecipe) {
  const total = totalSecondsFor(recipe);
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    ...(recipe.creator ? { author: { "@type": "Person", name: recipe.creator } } : {}),
    url: `${SITE}/r/${recipe.id}`,
    recipeCategory: "Coffee",
    recipeCuisine: "Coffee",
    recipeYield: `${recipe.water}g`,
    ...(total ? { totalTime: `PT${Math.max(1, Math.round(total / 60))}M` } : {}),
    recipeIngredient: [
      `${recipe.dose}g coffee${recipe.bean ? ` (${recipe.bean})` : ""}`,
      `${recipe.water}g water${recipe.temp ? ` at ${recipe.temp}°C` : ""}`,
    ],
    recipeInstructions: (recipe.timeline ?? []).map((e) => ({
      "@type": "HowToStep",
      name: e.type ?? "Step",
      text: [e.note, e.target ? `to ${e.target}` : ""].filter(Boolean).join(" — ") || (e.type ?? "Step"),
    })),
  };
}

const paper = "#f8faf0";
const ink = "#1a1c17";
const muted = "#6b7163";
const soft = "#43483e";
const rule = "#c9cdbf";

export default async function RecipePage({ params }: Params) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.25rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, color: ink }}>Recipe not found</h1>
        <p style={{ color: soft, marginTop: 8 }}>
          This recipe may have been deleted.
        </p>
        <Link href="/" style={{ color: ink, marginTop: 20, display: "inline-block" }}>
          ← Browse the library
        </Link>
      </main>
    );
  }

  const total = totalSecondsFor(recipe);
  const url = `${SITE}/r/${recipe.id}`;
  const stats: [string, string][] = [
    ["Ratio", `1:${recipe.ratio}`],
    ["Coffee", `${recipe.dose}g`],
    ["Water", `${recipe.water}g`],
    ["Time", total ? formatTime(total) : "—"],
  ];

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
      <script
        type="application/ld+json"
        // Static, server-generated from our own row — no user HTML reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(recipe)) }}
      />

      <nav style={{ marginBottom: 28 }}>
        <Link href="/" style={{ color: muted, fontSize: 14, textDecoration: "none" }}>
          ← Bloom
        </Link>
      </nav>

      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: muted,
            marginBottom: 8,
          }}
        >
          {[recipe.brewer, roastLabel(recipe.roast)].filter(Boolean).join(" · ")}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 500, color: ink, lineHeight: 1.15, margin: 0 }}>
          {recipe.title}
        </h1>
        {recipe.creator ? (
          <p style={{ color: soft, fontSize: 15, margin: "8px 0 0" }}>{recipe.creator}</p>
        ) : null}
        {recipe.bean ? (
          <p style={{ color: muted, fontSize: 14, margin: "4px 0 0" }}>{recipe.bean}</p>
        ) : null}
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 1,
          background: rule,
          border: `1px solid ${rule}`,
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {stats.map(([label, value]) => (
          <div key={label} style={{ background: paper, padding: "14px 16px" }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: muted,
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, color: ink, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </section>

      {/* Grinder translation and the copy-as-text block both need interaction,
          so they live in a client island. Everything above renders without JS. */}
      <RecipeTools
        recipe={{
          brewer: recipe.brewer,
          grind: recipe.grind,
          grinder: recipe.grinder,
          clicks: recipe.clicks,
          temp: recipe.temp,
        }}
        shareBlock={shareText(recipe, url)}
        recipeId={recipe.id}
      />

      {recipe.timeline && recipe.timeline.length ? (
        <section style={{ marginTop: 28 }}>
          <h2
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: muted,
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            Brew timeline
          </h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recipe.timeline.map((e, i) => (
              <li
                key={e.id ?? i}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "10px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${rule}`,
                }}
              >
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: muted,
                    fontSize: 14,
                    minWidth: 44,
                  }}
                >
                  {formatTime(Number(e.start) || 0)}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: ink }}>
                    {e.type ?? "Step"}
                  </span>
                  {e.target ? (
                    <span style={{ color: soft, fontSize: 15 }}> to {e.target}</span>
                  ) : null}
                  {e.note ? (
                    <span style={{ display: "block", color: muted, fontSize: 13, marginTop: 2 }}>
                      {e.note}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${rule}` }}>
        <a
          href={`/#/recipe/${recipe.id}`}
          style={{
            display: "inline-block",
            background: "#456743",
            color: "#ffffff",
            padding: "12px 22px",
            borderRadius: 999,
            textDecoration: "none",
            fontSize: 15,
          }}
        >
          Brew along with the timer →
        </a>
      </div>
    </main>
  );
}
