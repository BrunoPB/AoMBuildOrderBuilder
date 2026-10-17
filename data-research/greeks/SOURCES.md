# Greeks: sources

Checked 2026-10-17. Scope: base-game Greeks only (Zeus, Hades, Poseidon and their 9 minor gods).
Left out: Demeter (DLC major god added in update 19.14612), her minor gods Pan, Hestia and Persephone, and her units (Orpheus, Iolaus, Icarus, King Midas, Amazon Archer, Lykaon, Hamadryad, Harpy, Siren). The Titan is also left out.

## Patch

- Latest Age of Mythology: Retold patch found: **19.17020** (minor update, 2026-07-01). The previous one was 19.16764 (2026-06-29), and the last big balance patch was 19.16313 (2026-06-23).
  - Wiki: https://ageofempires.fandom.com/wiki/Update_19.17020. It has no "Next" link, and patched.gg lists nothing newer.
  - aomr-analyzer.com changelog: "Game data re-extracted (6 July patch)", published 2026-09-01. This is assumed to be the 19.17020 data.
- Patches 19.16764 and 19.17020 contain no Greek balance changes, apart from a Hades tech-tree display fix and a fix to Demeter's campaign.

## Sources, by priority

1. **Measured (project owner)**: Greek favor is 6/min for 1 praying villager and 31.3/min for 8, global across Temples. Zeus gets favor x1.2. Both values are reproduced exactly by the formula below.
2. **aomr-analyzer.com** (extracted game data):
   - https://aomr-analyzer.com/frise/civ/greek: costs of every building, unit and technology; human-unit train times; hero roster per god.
   - https://aomr-analyzer.com/unit-comparison: embedded JSON with cost, pop, HP and speed for every Greek unit, including myth units.
   - https://aomr-analyzer.com/gods/zeus, /gods/hades, /gods/poseidon: god bonuses, starting kit, minor gods per age, powers and techs.
   - https://aomr-analyzer.com/guides/favor: favor sources and caps.
   - The analyzer has **no build times, research times, age-up costs or god-power costs**.
   - Note: the site's legal notice forbids scraping and re-hosting. I only read pages to extract facts, and no images or assets from it are referenced.
3. **Official** (https://www.ageofempires.com/games/aom/civilizations/greeks): overview only, with no numbers. Patch-note links were taken from the wiki infoboxes.
4. **Age of Empires Series Wiki (Fandom)**. I read the wikitext of about 190 pages through the MediaWiki API (`action=query&prop=revisions`), using the infobox values marked for Retold. Key pages:
   - Villager (Age of Mythology): gather rates, and the favor formula and table.
   - Greeks (Age of Mythology): starting conditions.
   - Zeus, Hades, Poseidon, and the 9 minor-god pages: bonuses, techs and powers.
   - Classical Age (Age of Mythology), Heroic Age, Mythic Age: age-up costs, times and requirements.
   - Every unit, building and technology page, for train, build and research times and wall/tower upgrade costs.
   - God power, the 12 god-power pages, Lure, Plenty Vault.
5. **Icons**:
   - Kries-Dev/BuildOrders (preferred), 70 icons.
   - rupprath/aom-counters (`public/images/units/gr_*.png`), 13 unit icons.
   - Wiki file URLs (`static.wikia.nocookie.net/ageofempires/images/...`, without `/revision/...`), 115 icons. Each URL was resolved through the API `prop=imageinfo` and then opened in a browser, where every one rendered as a 256x256 image (one as 256x258). curl from this environment gets HTTP 403 from wikia's CDN (bot protection), but browsers load the images.

Values were cross-checked automatically. Every cost of every building, research and unit in `greeks.json` matches aomr-analyzer, except two cases that differ only by convention: the wall segment cost, and Omniscience, whose cost is variable. Pop values also match the analyzer's unit JSON.

## Key formulas and values

- **Favor (Retold, since update 19.14612)**: favor/s = N x M x (1/(N + 10.1111) + 0.01). N is the number of villagers praying across all Temples. M is 1, or 1.2 for Zeus or with Golden Apples. `favor.table` holds favor/min for N = 1..30 at M = 1: 6.00, 11.11, 15.53, 19.41, 22.85, 25.94, 28.75, 31.30, ... The wiki table covers N = 1..16 and matches to 2 decimals.
- **Villager gather rates (/min)**: hunt 60, herdables/chicken 54, berries 42, farm 42, wood 60, gold 51. Fishing Ship: 33.
- **Age-ups (Town Center)**:
  - Classical: 400 food, 60 s, needs a Temple.
  - Heroic: 800 food / 500 gold, 75 s, needs an Armory or a Market.
  - Mythic: 1200 food / 1200 gold, 120 s, needs a Fortress.
- **God powers (Retold)**: the first cast is free. `cost` is the base re-cast favor cost, and each further cast adds the "ramp", which is listed in each power's meta note.

## Conflicts and which source won

| Topic                           | Sources                                                                                                                                                                 | Used                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Greek favor cap                 | Analyzer guide: cap 100 for Greeks (200 for the others). Wiki Favor page: "Since Retold, favor no longer has a cap".                                                    | Not encoded, since the schema has no field for it. Flagged in PENDING.                             |
| Hero train times                | Analyzer shows the base time (20/25/30/5 s). Wiki gives per-age times: Greek heroes train 10% faster in each age from Classical on (18/16.2/14.6 for Classical heroes). | Wiki time at the unlock age (18, 20.3, 21.9, 5), with base values in the notes. Medium confidence. |
| Forge of Olympus research speed | Wiki tech page: "+50% research speed" (since 19.14612) but also "-25% research time". Wiki Hephaestus page: "100% faster". The analyzer gives no number.                | researchTime x0.6667 (+50% speed). Low confidence.                                                 |
| Plenty Vault trickle            | Plenty Vault page: 3.5/s per resource (since 18.65484). God power page: 4/s.                                                                                            | 3.5/s, in the note only (not expressible in the schema).                                           |
| Vaults of Erebus trickle        | Wiki: 1.75 gold/s (105/min) since 19.14612, previously 2/s. The analyzer gives no number.                                                                               | 1.75/s, in the note only.                                                                          |
| Caravan name                    | Analyzer: "Donkey Caravan". Wiki: "Caravan" (Greek variant "Donkey").                                                                                                   | id `caravan`, en "Caravan".                                                                        |
| Caravan age                     | Wiki: Heroic (Market itself is Classical since Retold). The analyzer layout is ambiguous.                                                                               | Heroic.                                                                                            |
| Hades ranged-tech discount      | Older guides and the analyzer's Artemis text mention free Ballistics/Burning Pitch. Analyzer changelog and wiki: replaced by -33% on ranged-soldier techs in 19.16313.  | -33% (cost x0.67) on the 8 techs listed on the wiki.                                               |
| Scylla / Carcinos               | Classic game: Dionysus / Hera only. Wiki (Retold): available to all Greek gods at the Dock.                                                                             | No minor-god requirement.                                                                          |
| Mythic minors for Poseidon      | Some older sources list Hera. Wiki and analyzer for Retold: Artemis / Hephaestus.                                                                                       | Artemis / Hephaestus.                                                                              |
| Starting Sentry Towers          | Wiki Sentry Tower page says standard matches start with 4 Sentry Towers around the TC. No other source confirms this.                                                   | Not added to the start state. Flagged in PENDING.                                                  |

## Minor gods per major god (Retold, wiki and analyzer agree)

- Zeus: Athena / Hermes, then Apollo / Dionysus, then Hera / Hephaestus.
- Hades: Athena / Ares, then Apollo / Aphrodite, then Artemis / Hephaestus.
- Poseidon: Hermes / Ares, then Dionysus / Aphrodite, then Artemis / Hephaestus.
