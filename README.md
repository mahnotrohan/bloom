# BrewLog

BrewLog is a working prototype for **Brew**, a universal coffee recipe platform.
It turns the attached PRD into a responsive web app with a public recipe library,
a structured recipe builder, visual brew timelines, local publishing, creator
profiles, and print styling.

The current visual direction follows the **Recipe Journal** style guide: Oat &
Cadmium palette, editorial masthead, Fraunces/Space Mono/Inter typography,
paper texture, flavour-colour bars, spec ledgers, and a musical-notation-inspired
`Brew Score` timeline.

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
