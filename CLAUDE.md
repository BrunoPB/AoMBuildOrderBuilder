# CLAUDE.md

Build order builder/simulator for Age of Mythology: Retold. This file holds the project rules for people and AI assistants (see also `CONTRIBUTING.md`).

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

- Pure, deterministic, tick 1 s (works with 0.1 s). Per tick: completions → scheduled actions (build order order) → continuous rules → snapshot.
- `when`: a fixed time, or another action's start/end: `after` starts right then (+ delay), `asap` as soon as it can from then. New actions are `asap` from the start of the action before them; removing an action re-anchors the ones that waited on it.
- Costs are paid when an action starts; never negative; waiting produces `delay` warnings (`info` for `asap` actions: they have no planned time to miss). Missing requirements produce `error` warnings.
- A food source that runs out sends its workers to the next one in the food chain on its own. It is an **automatic step** (`StepAction.auto`, tagged "manual in game") in the order, not a warning, since the player does it by hand; only running out with nothing next warns.
- The build ends when every action is done (`buildEnd`); the `tail` after it is only context, so warnings there are dropped (errors kept).
- `train` with `mode: "auto"` is the building's auto queue: it trains whenever the building is free and the stock pays, for its own `duration` (seconds from its start) or to the end of the build. There is no stop action. No scheduled action reserves the building against it (as in the game): only a full queue, pop cap or missing resources stop it.
- A `rally` action points a gatherer auto queue at another resource from that moment (units already training come out going there). In the game it is cancelling the queue and starting another; the build keeps it as one action.
- Every `build` action says who builds (`builder`: from a resource, a new villager, the same builder or a soldier). Without one it is an `error`; the simulator still picks someone so the rest of the build stays readable.
- Presets must simulate without `error` warnings. The Krush times (`tests/fixtures/krush.json`) come from one real match, playing the build in `tests/fixtures/krush-build.json` (the first Krush preset, not the current one): a **reference**, never a source of truth. Never tune data or add engine knobs just to match them; compare with `npm run compare:krush`.

## UI rules

- Visual, not textual: game icons everywhere, short labels (1–3 words), explanations only in tooltips (hover, focus and touch).
- Colors carry meaning (green ok, yellow attention, red problem) and are never the only signal. Numbers in monospace.
- Every view follows the build at once: fields apply while typing (`LiveNumber`/`LiveText`), timelines and charts share one end (`viewEnd`: the build's end), other tabs reload on `storage` events.
- Pointing at another action's start or end (after/asap, milestones…) always uses `MomentPicker` (`src/ui/editor/moment-picker.tsx`): time order, grouped by age, search, start/end filter, keyboard.
- No horizontal scroll from 360 px up; keyboard navigation and visible focus; `alt`/`aria-label` on every icon.
- At the same second, events (age reached, building done, source depleted…) are listed before actions, since actions may depend on them; an action's own effects stay right after it.
- Footer keeps the Microsoft fan-content notice.
