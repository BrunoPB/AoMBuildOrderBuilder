# Data changelog

## 2026-11-01 — icon manifest moved

- `public/icons/manifest.json` → `src/data/icons.json`: the app imports it, and Vite does not allow importing from `public/`. The WebP files stay in `public/icons/`.

## 2026-10-29 — actions of the 12 major gods

- Research per god in `data-research/<pantheon>/ACTIONS.md` and summary in `data-research/GOD-ACTIONS.md`.
- Egyptians: Pharaoh/Priest Empower (`pantheon.empower`: ×1.75 build/research/military training, ×1.2 dropsite and Monument favor; Ra's Priests at 60%; Isis Monument favor ×2).
- Set: Animals of Set summoned by the Pharaoh (`pantheon.summon`), with their carcass food.
- Thor: no Armory (`excludeGods`), free Dwarf per Dwarven Armory research (`research.spawn`).
- Loki: +10% build speed on the builder (`builderRate`).
- Greek heroes train in their own queue (`unit.splitQueue`).
- Owner answers: Berserk transform needs a free population slot; Empower does not stack (strongest counts).

## 2026-10-29 — god-specific actions

- Time Shift rules come from `major_gods.xml` `<timeshifting>`: only Kronos, 2 at once, 12 buildings (Palace, Sentry Tower, Mirror Tower cost 50%).
- Norse Gatherer/Dwarf → Berserk promotion (`VillagerNorseToBerserk` 30 food + 20 gold, `VillagerDwarfToBerserk` 10 food + 30 gold, instant; Loki −50%).
- Promotion discounts use the new `promotionCost` modifier (Gaia, Loki, Frontline Heroics, Sons of the Sun).

## 2026-10-18 — Krush as reference only

- Krush preset back to the default settings (no calibration); the measured match is a reference (`npm run compare:krush`).
- Kronos Manor bonus stacks additively per Manor in range (manor.tactics + official forum).

## 2026-10-18 — installed game as source of truth

- All four pantheons reconciled against the game files (proto.xml, techtree.xml, god files, string tables): official pt-BR/en names, values, research lists, effect ops.
- Citizen train time 28 s (file) instead of the measured 30 s; the Krush preset uses a 2 s auto-queue delay to match the measured rhythm. Turma 9.5 s.
- Greek minor gods give one free myth unit on age up; hero train times per age; Hades discount ×0.666 incl. favor.
- Norse Gatherers/Dwarves only build House, Farm and Ox Cart; infantry can build (builder `{ unit }`).
- Wonder favor trickle 60/min for every pantheon. Zeus favor bonus scoped to Temple prayer.
- 9 Atlantean techs added (towers, walls, Omniscience, Secrets of the Titans).
- All 779 icons extracted from the game.

## 2026-10-18 — game files pass (patch 19.17020)

- Gather techs and other base-percent bonuses now use `op: "pct"` (they add on the base rate).
- Multiple builders: 2nd at 60%, further at 30% (`common.defaults`).
- Hunt default 1200 (owner estimate). 4 Sentry Towers at start for every pantheon.
- Trickles: Hersir/Godi favor, Plenty, Vaults of Erebus, Flood of the Nile. Zeus myth units −1 pop.
- Heart of the Titans: hero promotion time ×0.25. Gaia Citizen promotion −25%.
- Atlantean Town/Village Center build time 180 (Citizens build them at 1.25).
- No favor cap for any culture.

## 2026-10-17 — first version (game patch 19.17020)

- Added the four base pantheons: units, buildings, researches, age ups, start state and favor rules.
- Added the 12 major gods, 36 minor gods (Sobek replaces Hathor in Retold) and 49 god powers.
- Added resource sources (hunt, herd, berries, farm, fish, wood, gold).
- Atlantean values measured by the owner take priority: Citizen 30 s, Counter-Barracks 25 s, Classical 400 food / 60 s, Heroic 800 food + 500 gold / 75 s, Promethean, Turma, Kronos build bonus near a Manor, Time Shift = 100% of build time.
- Citizen build rate set to 1.5 (wiki), consistent with the measured Krush.
- Norse giants also available to Hel; Animals of Set no longer list the Pharaoh as a building.
- Icons: 732 converted to WebP (64 and 128 px), 47 placeholders.
