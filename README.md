# AoM Retold · Build Order Builder

Static website that builds and simulates build orders for **Age of Mythology: Retold** (1v1, base game). It computes action times, population, villager allocation, resources second by second and warnings. Everything runs in the browser; builds are stored in `localStorage`.

## Requirements

Node 22+ and npm.

## Commands

```bash
npm install
npm run dev          # dev server at http://localhost:5173
npm test             # unit, golden (Krush), data, i18n and API tests (Vitest)
npm run test:e2e     # Playwright smoke tests (run `npm run build` first; `npx playwright install chromium` once)
npm run lint         # ESLint + Prettier check
npm run check-data   # validates the game database and lists low-confidence values
npm run build        # type check + Vite build + static API in dist/
npm run preview      # serves dist/
```

## Deploy

`dist/` is a plain static site. Set `BASE_PATH` when it is served from a sub-folder and `SITE_URL` to make the API URLs absolute:

```bash
BASE_PATH=/AoMBuildOrderBuilder/ SITE_URL=https://<user>.github.io/AoMBuildOrderBuilder/ npm run build
```

GitHub Pages: `.github/workflows/ci.yml` deploys `master` when the repository variable `PAGES_ENABLED` is `true` (Settings → Pages → Source: GitHub Actions). GitHub Pages on a private repository needs a paid plan.

### Static API

`npm run build` writes `dist/api/v1/` (index, presets, dashboard format, simulated timelines in pt-BR and en, game data, icon manifest). GitHub Pages already sends `Access-Control-Allow-Origin: *`. On other hosts, add that header for `/api/*` so other sites can read it, e.g. Netlify `_headers`:

```
/api/*
  Access-Control-Allow-Origin: *
```

## Updating the game data

1. Edit the JSON in `src/data/` (schemas in `src/data/schema.ts`). Every value needs `meta.source`, `checkedAt` and `confidence`.
2. Record sources and conflicts in `data-research/SOURCES.md`, open items in `data-research/PENDING.md` and the change in `data-research/changelog.md`.
3. God powers are researched per pantheon in `data-research/<pantheon>/powers.json`; `npx tsx scripts/merge-powers.ts` rebuilds `src/data/powers.json`.
4. New icons: add `{ id, url, origin, license }` to `data-research/<pantheon>/icons.json`, then `npm run fetch-icons`.
5. `npm run check-data && npm test`.

## Project layout

```
src/data       game database (JSON) + zod schemas + loader
src/engine     simulator (pure functions), build format, timeline formatter
src/i18n       pt-BR / en messages
src/presets    standard builds (read-only)
src/storage    localStorage + migrations
src/io         import/export, dashboard (custom_builds) format
src/api        static API generator
src/ui         Preact UI
scripts        build-api, check-data, fetch-icons, merge-powers
data-research  research notes, sources, pending items
tests          Vitest + Playwright
```

Age of Mythology © Microsoft Corporation. Non-profit fan project, not affiliated with or endorsed by Microsoft.
