# Bloom

Bloom is a universal coffee recipe platform — a responsive web app with a shared
recipe library, a structured recipe builder, visual brew timelines, server-backed
publishing (Cloudflare D1), creator profiles, and print styling.

The current visual direction is **Material 3 "All sage"** (locked Aug 2026):
Google's Material 3 Expressive re-voiced onto a tonal palette seeded from
Bloom's sage green — tonal containers instead of rules, full-radius controls,
Roboto, sentence-case labels, and a single sage accent. See `CLAUDE.md` for the
token map and the design-system notes.

## What Is Included

- Seeded public library with V60, AeroPress, and South Indian Filter recipes.
- Search, brewer filtering, and recency sorting.
- Structured builder for brewer, dose, ratio, water, grind, grinder, clicks,
  temperature, roast, agitation, bean notes, author name, and timeline events.
- Publishing stored in browser local storage with no login gate.
- Remembered author name via browser cookie for future recipes.
- Shareable hash URLs such as `#/recipe/tetsu-inspired-v60`.
- Recipe detail pages with header card, timeline, and print action.
- Creator profile pages.

## Local Development

This repo uses the Sites vinext starter.

```bash
pnpm install
pnpm run dev
pnpm run build
```

In this Codex desktop environment, Node is bundled separately. If your shell
does not expose Node, prefix commands with the bundled Node path:

```bash
PATH="/Users/rohan.mahnot/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm run dev
```

## Current Persistence Model

Recipes are stored in `localStorage` for this prototype, while the author name
and repeat-visitor behavior use browser cookies. Browsing, drafting, and
publishing remain open with no login. A production version would move published
recipes and creator identity into durable storage.
