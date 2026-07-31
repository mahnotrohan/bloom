# Bloom — project context

Bloom is a coffee recipe builder and shared library. Browse recipes, write your
own in plain language, brew along with a guided timer, and share a recipe as an
image. No accounts, no login.

Live at **https://bloom.rohanmahnot.space** (`brew-log.rohanmahnot.space` still
resolves as a legacy alias).

## Where everything lives

| Thing | Value |
| --- | --- |
| Local folder | `/Users/rohan.mahnot/Documents/Bloom` |
| GitHub repo | `https://github.com/mahnotrohan/bloom.git` (branch `main`) |
| Cloudflare Worker | **`brewlog`** — note the old name, never renamed |
| D1 database | `brewlog-db` (id `596292ce-0bfa-4dd7-997a-870dd963f07b`) |
| Analytics dataset | `bloom_events` (Workers Analytics Engine) |
| Owner's site | `rohanmahnot.space` — a **separate** GitHub Pages repo, `mahnotrohan.github.io` |

## Stack

Vite + React (the `vinext` starter) deployed as a **Cloudflare Worker**, with
**D1** for recipe storage and **Workers Analytics Engine** for events. Single
font: Hanken Grotesk (a free Graphik-alike). Tailwind is present but almost all
styling is hand-written CSS in `app/globals.css`.

Nearly the whole app is one file: `app/page.tsx` (~2600 lines). It is a
hash-routed SPA — views are `home`, `recipe`, `builder`, `about`, `grind`,
`stats`, `creator`, e.g. `#/recipe/<id>`.

## Deploying — read this before promising anything

**The build and deploy must run on the user's Mac.** The agent sandbox cannot do
it: the build needs macOS-native binaries, and `wrangler` needs the user's
Cloudflare login. Also, `git commit` from the sandbox often fails on stale
`.git/*.lock` files it lacks permission to delete — when that happens, hand the
command to the user rather than retrying.

Node is not on the default PATH (bundled with a Codex runtime), so every terminal
session needs the export first:

```bash
cd /Users/rohan.mahnot/Documents/Bloom
export PATH="/Users/rohan.mahnot/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
./node_modules/.bin/vinext build
./node_modules/.bin/wrangler deploy
git push origin main
```

`npm` / `npx` / `pnpm` are **not available** — always call binaries directly from
`./node_modules/.bin/`. Wrangler subcommands that target the Worker need
`--name brewlog` (there is no committed `wrangler.toml`; the deploy config is
generated into `dist/server/wrangler.json` at build time by `vite.config.ts`).

**Cloudflare caches the HTML aggressively.** After a deploy the custom domain can
keep serving the old build. If a change "isn't live", check
`https://brewlog.rohan-mahnot27.workers.dev` (uncached) before assuming the
deploy failed, then purge: Cloudflare → the zone → Caching → Configuration →
Purge Everything.

Type-checking works fine in the sandbox and should always be run before handing
over a change:

```bash
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
```

Expect ~8 pre-existing errors (`cloudflare:workers` module resolution, a few
implicit-`any` timeline helpers). They are harmless — the real esbuild-based
build does not care. Only new errors matter.

## Data model and the deletion trap

Recipes live only in D1 — `db/schema.ts`, table `recipes`, with the full recipe
object as JSON in `data`. Served by `app/api/recipes/route.ts`
(`GET` list / `POST` upsert / `DELETE ?id=`).

There is a second table, `deleted_recipes` (**tombstones**). This exists because
deleted recipes kept coming back: old cached clients re-uploaded their local
copies on load. Now `DELETE` records the id and `POST` returns **410 Gone** for
any tombstoned id. Two consequences:

- Deletions are permanent and cannot be undone by re-publishing the same id
  without first removing the tombstone row.
- The client no longer auto-uploads local recipes; publishing is the only write.

Migrations are plain SQL in `drizzle/`, applied by hand:

```bash
./node_modules/.bin/wrangler d1 execute brewlog-db --remote --file=./drizzle/0001_deleted_recipes.sql
```

Bulk recipe edits are easiest done by opening the live site and calling the API
from the browser console — that is how the seeded creator/championship recipes
were added and relabelled.

## Analytics — three separate systems, easily confused

1. **In-app funnel** → `app/analytics.ts` writes to `/api/events` → Analytics
   Engine dataset `bloom_events`. Events: `brew_start`, `brew_complete`,
   `brew_abandon`, plus usage events `library_view`, `recipe_view`,
   `share_open`, `share_sent`, `recipe_publish`. **Column positions are
   permanent** — append, never reorder. See `docs/analytics.md`.
   Retention is **3 months**.
2. **`#/stats` page** reads it back via `app/api/stats/route.ts`, which queries
   the Analytics Engine SQL API server-side using two Worker secrets,
   `CF_ACCOUNT_ID` and `CF_ANALYTICS_TOKEN` (set with
   `wrangler secret put <NAME> --name brewlog`). Analytics Engine has **no
   Cloudflare dashboard** — this page is the only UI.
3. **Cloudflare Web Analytics** beacon in `app/layout.tsx` gives visitor counts
   and top pages in the Cloudflare dashboard. Because Bloom is a hash-routed
   SPA, it mostly reports a single page — per-recipe interest only comes from
   system 1.

Zone analytics for `rohanmahnot.space` includes all subdomains; filter by
Host = `bloom.rohanmahnot.space` to isolate Bloom.

## Product decisions already settled — don't relitigate

- **Simple by default.** The builder shows only Title, Brewer, Coffee, Water.
  Everything else (temp, grind, roast, agitation, grinder, pours, stirs, swirl)
  is opt-in via tap-to-add "+" chips. Pour steps are optional too.
- **Steps read as sentences**, not fields: "at 0:40 → pour to 150 g". Times are
  `m:ss`. "Start / Duration / Range / Tare" were removed as jargon — a step's
  time window is implied by its type (`Drawdown`, `Wait`), duration is derived.
- **Brewers** are a fixed list plus a free-text "Other…" option. Each named
  brewer has an accent colour and a small icon (`brewerAccent`, `BrewerIcon`).
  Icons are deliberately **symbolic, not realistic** — several attempts at
  photo-real drippers were rejected; hand-authored SVG cannot do it at 20px.
- **Share is two-speed.** The recipe page pre-renders the default card on load
  so "Share" opens the native share sheet instantly; "Customize with a photo"
  opens the bottom sheet. Library cards have their own share icon.
- **Share image styles**: Stat bar, Top bar, Timeline rail, Big type. (A "Card"
  style existed and was removed.) Formats 9:16 and 1:1.
- **Photos are never uploaded.** The share image is composed on a local canvas
  and handed to `navigator.share()`. Mismatched aspect ratios get a blurred
  backdrop with the full photo fitted on top.
- **iOS Safari ignores `ctx.filter`** on canvas, so blur is done manually by
  downscaling to a tiny canvas and scaling back up. Do not "simplify" this back
  to `ctx.filter`.
- **Onboarding** is a 3-card overlay on first visit only, flagged in
  localStorage (`bloom.onboarded.v1`), skippable via button *or backdrop tap*,
  and never shown to someone arriving on a deep link.
- Timeline stays **vertical on mobile**; a horizontal rail was tried and caused
  overflow and auto-scroll problems.

## Working style that has worked well

Show mockups before building anything visual — use rendered HTML/SVG previews,
not descriptions. The user reviews design closely and iterates, so cheap mocks
save deploy cycles. For research (recipes, championship data), extract first,
present for sign-off, then write to the platform — never post unverified data,
and say plainly when a source could not be confirmed rather than filling gaps.

Recipes seeded so far include James Hoffmann, Lance Hedrick, Tim Wendelboe,
Aramse, Tetsu Kasuya's 4:6, Osmotic Flow, and World AeroPress / World Brewers
Cup champions. A few championship recipes were skipped on purpose because their
pour schedules could not be verified.
