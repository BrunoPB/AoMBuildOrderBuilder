# Atlanteans + shared sources — research log

Checked: 2026-10-17.

## Patch

- Latest patch found: **19.17020** (minor update, 2026-07-01, no Atlantean changes). The last update with Atlantean balance changes is **19.16313** (2026-06-23). Minor update 19.16764 (2026-06-23) only fixed an Oracle Hero range-circle display bug.
- The newest update referenced on the fandom wiki pages used is 19.16313, so wiki values match the current patch.
- Patch notes read: 19.12998 (Time Shift / Temporal Chaos), 19.14612 (Shockwave, Spider Lair, Perception, Frontline Heroics, Chaos, Heroic Renewal, Horns of Consecration, Automaton, Lampades, Contarius), 19.16313 (Implode, Automaton, Caladria, Stymphalian Bird: no cost/time changes).

## Sources used (priority order)

1. **Project owner values** (measured / sources), given in the task: start state, Citizen (30 s measured), gather rates, Counter-Barracks 25 s, Armory 150 wood, age-up costs/times, Promethean, Turma, Cheiroballista, Behemoth, Kronos Manor bonus, Kronos 2 free myth units, Time Shift 100% build time, oracle favor rule.
2. **aomr-analyzer.com** (extracted game data):
   - https://aomr-analyzer.com/frise/civ/atlantean: costs of all buildings, units and technologies, per age and building; HP/train time for human units.
   - https://aomr-analyzer.com/unit-comparison: costs and pop of the myth units (embedded JSON).
   - https://aomr-analyzer.com/gods/kronos, /gods/oranos, /gods/gaia: god bonuses, starting units, minor gods per age, myth units and techs per minor god.
   - Build times and research times are **not** published there.
3. **Official patch notes** (ageofempires.com/news): update 19.12998, 19.14612, 19.16313, 19.16764 and 19.17020.
4. **Age of Empires Series Wiki (fandom)**: wikitext read through the MediaWiki API for every unit, building, technology, god and god power page used (e.g. `Citizen`, `Oracle_(unit)`, `Manor_(Age_of_Mythology)`, `Temple_(Age_of_Mythology)`, `Counter_Barracks`, `Kronos`, `Gaia_(goddess)`, `Deconstruction`, `Theft_of_Fire`, `Berry_Bush`, `Deer`, `Gold_Mine`, `Tree`, `Mahi`, `God_power`...). Used for build times, research times, train times of myth units, promotion costs/times, power cooldowns and reuse costs, and resource amounts.
5. **Map scripts** (https://github.com/Skrylas/AoMR-RMS-SkirmishMapPack, community maps built on the official Retold templates): starting-object counts (one medium Gold Mine; 4-6 Berry Bushes; ~7 deer or 4 Aurochs; 4-7 Chickens; 2-4 herdables). Used only for typical amounts in `sources.json`.
6. Icons: https://github.com/Kries-Dev/BuildOrders (61 icons, each checked with an HTTP request: 200 image/png) and fandom wiki file URLs from the MediaWiki `imageinfo` API (135 icons).

## Conventions chosen

- **buildTime = base build time** (what the in-game tooltip/wiki calls "base"). The project owner's measured Counter-Barracks (25 s) equals the wiki's base value, so Citizen `buildRate` is 1 and Citizen Hero 1.1. The wiki also says a Citizen builds +50% faster than base (+25% for Town Centers): Manor 16.66 s, Temple/Armory/Market 26.67 s, Counter-Barracks 16.67 s, Town Center 120 s. Those values are recorded in each building's `fieldMeta.buildTime.note`. **To confirm** (see PENDING).
- Kronos' Manor bonus is a `buildRate` ×1.25 modifier with `condition: "nearManor"` (not a buildTime modifier). It stacks per Manor in game; one Manor is modelled.
- Hero units (`*-hero`) are separate units with `trainedAt: []`, `trainTime: 0`, and `cost` = base unit cost + promotion cost (matches aomr-analyzer's hero cost). The real promotion cost and time (7 s) are in the base unit's `promotion`.
- God powers: in Retold the **first cast of every power is free**. `cost` is left out; the reuse cost and ramp are in `meta.note`.
- Gaia's "Economic Guild technologies one age earlier" is modelled as separate `*-gaia` research entries (same cost/time/effects, one age earlier, `requires: ["gaia"]`, listed in Gaia's `unlocks`). Gaia's -35% is a cost modifier on the guild and on both sets of ids.
- Gaia's `startExtras.units` = `{ "citizen": 0, "citizen-hero": 2 }` means **replace** the 2 starting Citizens with 2 Citizen Heroes (not additive).
- Minor-god technologies have the tag `myth-tech` (used by Rheia's Gift); economic ones also have `economic`.
- Economic effects use `mul` modifiers (e.g. Hand Axe ×1.1, Bow Saw ×1.15, Carpenters ×1.2 on wood).

## Conflicts and resolution

| Item                              | Values                                                                                                                   | Used                      | Why                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Citizen train time                | 28 s (wiki, analyzer) vs ~30 s measured                                                                                  | **30**                    | measured wins                                                                                                                                                       |
| Turma train time                  | 9.5 s (wiki, analyzer) vs 10 s (owner: sources + measured)                                                               | **10**                    | measured wins                                                                                                                                                       |
| Building times vs Citizen         | wiki base (Manor 25, Temple 40, CB 25) vs wiki "with a Citizen" (16.66 / 26.67 / 16.67) vs CB measured 25                | **base**                  | consistent with the measured CB                                                                                                                                     |
| Farm cost                         | 150 wood (wiki, Atlantean) vs 75 wood (analyzer)                                                                         | **150**                   | analyzer seems to show the generic Farm proto without the Atlantean modifier (it also shows 200 HP where the wiki says Atlantean farms have 400). Medium confidence |
| Dock cost                         | 125 wood (wiki, Atlantean) vs 100 (analyzer)                                                                             | **125**                   | same reason                                                                                                                                                         |
| Heavy / Champion Cavalry          | 400f 200g / 700f 200g (analyzer) vs Atlantean -25% (wiki)                                                                | **300f 150g / 525f 150g** | wiki gives an Atlantean-specific discount the analyzer does not apply                                                                                               |
| Weightless Mace favor             | 20 (analyzer) vs 15 (wiki)                                                                                               | **20**                    | higher-priority source                                                                                                                                              |
| Asper Blood favor                 | 12 (analyzer) vs 15 (wiki)                                                                                               | **12**                    | higher-priority source                                                                                                                                              |
| Frontline Heroics effect          | -20% (techbox, patch 19.14612) vs -30% (Oceanus page)                                                                    | -20% (note only)          | patch notes                                                                                                                                                         |
| Poseidon's Secret cost reduction  | -10% (techbox) vs -15% (Theia page)                                                                                      | **×0.9**                  | techbox; low impact                                                                                                                                                 |
| Oranos favor bonus                | +25% at full LOS (analyzer) vs ~+28% from the wiki formula (+4 max LOS)                                                  | **×1.25**                 | higher-priority source                                                                                                                                              |
| Atlantean favor from Town Centers | aomr-analyzer's overview text says TCs give a passive favor trickle; wiki says that was removed in Retold (Oracles only) | **Oracles only**          | wiki changelog + favor rule given by the owner; analyzer text is a prose summary, not extracted data                                                                |
| Fish                              | owner: only farms infinite                                                                                               | **fish `infinite: true`** | Retold in-game description: fish provide an unlimited supply of food                                                                                                |
