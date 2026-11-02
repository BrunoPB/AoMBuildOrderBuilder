# CLAUDE.md

Build order builder/simulator for Age of Mythology: Retold. Full requirements: the owner's SPEC (v2); summary below.

## Conventions

- Code, file names, identifiers and commits in **English**; few comments. UI text only through `src/i18n/{pt-BR,en}.json` (same keys in both; test enforces it).
- TypeScript strict, Vite, Preact, zod, Vitest, Playwright, ESLint + Prettier. npm. Default branch `master`.
- Frontend-only static site: no backend, no accounts. Builds in `localStorage` (`aomr-bob:builds:v1`, prefs `aomr-bob:prefs:v1`), always via `src/storage` (try/catch, in-memory fallback).
- Hash routing (`#/view/<id>` overview, the default when a build is opened; `#/build/<id>` editor; `#/play/<id>` match mode; `#/import/<code>` a build shared by link, gzipped in the URL; `#/settings`) and relative base so the site works under any sub-folder (GitHub Pages).
- Small commits per step.

## Data rules

- **Data first:** every game number lives in `src/data/*.json` with `meta { source, checkedAt, confidence }` (`fieldMeta` per field when it differs). No game numbers in code.
- Source priority: **the game installation (files, string tables, images) is absolute truth** > owner measurements (behaviour the files don't define) > aomr-analyzer > official > wikis (support only) > aomstats (metadata only). Prefer Retold/2024+ sources. Never invent: unknown → `confidence: "low"` + entry in `data-research/PENDING.md`.
- Ids are kebab-case English. Unit/building/research ids are unique per pantheon; gods, minors and powers are global.
- Say "unidade mitológica", never "mítica" ("Mítica" is only the age).
- After data changes: `npm run check-data` and `npm test`; log the change in `data-research/changelog.md`.

## Simulator (src/engine)

- Pure, deterministic, tick 1 s (works with 0.1 s). Per tick: completions → scheduled actions (build order order; `asap` = after the previous action started) → continuous rules → snapshot.
- Costs are paid when an action starts; never negative; waiting produces `delay` warnings (`info` for `asap` actions: they have no planned time to miss). Missing requirements produce `error` warnings.
- The build ends when every action is done (`buildEnd`); the `tail` after it is only context, so warnings there are dropped (errors kept).
- `train` with `mode: "auto"` is the building's auto queue: it trains whenever the building is free and the stock pays, until its own `until` (m:ss) or the end of the build. There is no stop action.
- Presets must simulate without `error` warnings. The Krush times (`tests/fixtures/krush.json`) come from one real match: a **reference**, never a source of truth. Never tune data or add engine knobs just to match them; compare with `npm run compare:krush`.

## UI rules

- Visual, not textual: game icons everywhere, short labels (1–3 words), explanations only in tooltips (hover, focus and touch).
- Colors carry meaning (green ok, yellow attention, red problem) and are never the only signal. Numbers in monospace.
- No horizontal scroll from 360 px up; keyboard navigation and visible focus; `alt`/`aria-label` on every icon.
- At the same second, events (age reached, building done, source depleted…) are listed before actions, since actions may depend on them; an action's own effects stay right after it.
- Footer keeps the Microsoft fan-content notice.
