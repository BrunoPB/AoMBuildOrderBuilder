# Norse: sources

Checked 2026-10-17. Scope: base-game Norse (Odin, Thor, Loki and their 9 minor gods). Freyr (New Gods Pack DLC) and his minor gods Ullr, Aegir and Vidar are left out on purpose, along with their techs (Freyr's Gift, Ring-Oath, Ydalir, Servants of Glory, Valgaldr, Feasts of Renown, Nine Waves, Grasp of Ran, Granite Maw, Avenging Spirit, Twilight of the Gods, Fury of the Fallen, Silent Resolve) and units (Draugr, Rock Giant, Fafnir).

## Patch

- **19.17020** (minor update, 2026-07-01), from patched.gg (https://patched.gg/games/age-of-mythology-retold/age-of-mythology-retold-minor-update-1917020). The latest balance update the wiki cites is 19.16313. The highest update number it mentions anywhere is 19.17020.
- aomr-analyzer.com changelog: "2026-09-01 data: game data re-extracted (6 July patch)". That is consistent with 19.17020.
- No official ageofempires.com patch note after 19.17020 was found.

## Sources used (priority order)

1. **aomr-analyzer.com** (data extracted from the game files):
   - https://aomr-analyzer.com/frise/civ/norse gave costs, train times, pop and HP for units and buildings, and costs of technologies.
   - https://aomr-analyzer.com/frise/pantheons gave the Norse minor-god blocks: god powers, myth unit cost/pop/train time, and myth tech costs.
   - https://aomr-analyzer.com/gods/odin, /gods/thor and /gods/loki gave bonuses, starting kit, archaic power and the minor-god pairs.
   - https://aomr-analyzer.com/guides/favor gave the favor cap of 200.
   - https://aomr-analyzer.com/changelog gave the data date.
   - The site shows **no research or build times and no gather rates**.
   - Its age columns follow the proto age, not when a unit is really available. For example, Huskarl shows under Archaic but the Hill Fort is Heroic, so those columns were not used for ages.
   - Note for the owner: the site footer says reproduction and scraping are prohibited without consent. Only individual numeric game facts were taken, and no text or layout was copied. You may want to review this.
2. **Official**: no Norse page on ageofempires.com with numbers. The patch number comes from patched.gg, which mirrors the official notes.
3. **Age of Empires Series Wiki** (ageofempires.fandom.com). Read as wikitext through the MediaWiki API (`api.php?action=parse`), because the HTML pages sit behind a Cloudflare challenge. Pages used:
   - Norse, Gatherer, Dwarf, Ox Cart (Age of Mythology), Hersir, Godi, Berserk (AoM), Hirdman (AoM), Throwing Axeman (AoM), Huskarl (AoM), Raiding Cavalry, Jarl (AoM), Portable Ram, Ballista (AoM), Longboat, Dreki (AoM), Dragon Ship (AoM), Fishing Ship (AoM), Transport Ship (AoM), Caravan (AoM).
   - Valkyrie, Einheri, Troll, Battle Boar, Frost Giant, Mountain Giant, Fire Giant, Fenris Wolf Brood, Kraken, Jormun Elver.
   - Town Center (AoM), Village Center, House (AoM), Temple (AoM), Longhouse (AoM), Great Hall, Hill Fort (AoM), Armory, Dwarven Armory, Market (AoM), Dock (AoM), Sentry Tower (AoM), Wooden Wall, Wooden Gate, Farm (AoM), Wonder (AoM).
   - Classical Age (AoM), Heroic Age, Mythic Age, Archaic Age (AoM).
   - Odin, Thor, Loki and the 9 minor-god pages.
   - The God power page (Retold cooldown, repeat cost and ramping table) and the 12 god-power pages.
   - About 90 technology pages, used for research times and ages.
4. Liquipedia and Pro Game Guides were not needed.
5. aomstats.io was not used.

## Values that come from one source only

- **Research times**: wiki only. Each research has `fieldMeta.time` set to medium.
- **Gather rates** of Gatherer, Dwarf and Fishing Ship: wiki only (Retold values from update 18.52475 onward).
- **Build times**: wiki only (the analyzer shows none).
- **Age-up costs, times and requirements**: wiki only.
- **God power cooldowns and costs**: wiki only.
- **Favor rule details**: 1 favor per 80 damage, and the gain falls linearly from x1 at 100 to x0.5 at 300 total combat favor. Both come from the wiki Norse page. The analyzer only confirms "favor from combat, cap 200".

## Conflicts and which source won

| Item                       | aomr-analyzer                       | Wiki                                                  | Used                                                               | Why                                                                                                                           |
| -------------------------- | ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| House cost                 | 50 wood                             | 45 wood (Norse -10%)                                  | 45                                                                 | The analyzer's shared-building values are identical to its Greek page (generic protos), so it ignores the Norse civ modifier. |
| Temple cost                | 150 wood + 150 gold                 | 135 wood + 150 gold, 30 s build                       | wiki                                                               | Same reason.                                                                                                                  |
| Dock cost                  | 100 wood                            | 90 wood, 25 s build                                   | wiki                                                               | Same reason.                                                                                                                  |
| Armory cost                | 150 wood                            | 135 wood                                              | wiki                                                               | Same reason.                                                                                                                  |
| Sentry Tower cost          | 150 wood + 100 gold                 | 150 wood + 100 gold generic, with -10% wood for Norse | 135 wood + 100 gold                                                | Same reason (low/medium confidence).                                                                                          |
| Market cost                | 150 wood                            | Market page: -20% (old text); Norse page: -10%        | 135 wood (low)                                                     | The Norse page is more recent.                                                                                                |
| Wonder cost                | 5000 of each                        | Norse -10% wood                                       | 5000 kept                                                          | Unclear, and not relevant to build orders.                                                                                    |
| Great Hall cost            | 135 wood                            | 160 wood                                              | 135                                                                | Norse-only building, so the analyzer's game data is trusted.                                                                  |
| Hamask age                 | listed as an "Archaic improvement"  | Classical, at the Longhouse                           | classical                                                          | The Longhouse is a Classical building.                                                                                        |
| Huskarl age                | Archaic column                      | Heroic ("actually Classical" proto)                   | heroic                                                             | Trained only at the Hill Fort, which is Heroic.                                                                               |
| Longhouse age              | Berserk shown in the Archaic column | Classical                                             | classical                                                          | Berserks are trained at the TC in Archaic.                                                                                    |
| Hammer of Thunder building | Dwarven Armory                      | Great Hall or Dwarven Armory                          | dwarven-armory                                                     | Single `at` field. The Great Hall alternative is noted.                                                                       |
| Thor armory techs          | base costs                          | -10% (Thor bonus)                                     | base cost in the pantheon file + `cost x0.9` modifier in thor.json | Keeps one source of truth.                                                                                                    |

## Modelling decisions

- **Ox Cart** is a _building_ (`ox-cart`). Workers build it from a foundation (40 food + 40 wood, 15 s), then it becomes a mobile 0-pop dropsite. It is placed in `start.buildings` and hosts all economic techs.
- Every Norse builder (infantry and humanoid heroes) has `worker: { gatherRates: {}, canBuild: true, buildRate: 1, needsDropsite: false }`. Gatherers and Dwarves also have `canBuild: true`, but in game they can only build Houses, Farms and Ox Carts (see the notes).
- **Thor armory techs**: research `at` is a single building. Thor's Dwarven Armory therefore has its own copies (`copper-weapons-thor`, ..., `dwarven-breastplate-thor`), each with `requires: ["thor", ...]` and age `archaic`. Odin and Loki use the plain ids at `armory`.
- Train-time and research-time effects (Levy/Conscript, Rigsthula, Rampage, Dwarven Auger, Conscript Sailors) were kept as `effects`, because they change build-order timing. All other military effects are `[]`.
- Godi and Hersir have `favorRate: 0.6` for the passive 0.01 favor/s trickle. Combat favor is covered by the pantheon favor rule.
- Myth units shared by two minor gods (Frost, Mountain and Fire Giant with Hel) list only the first minor in `requires`. Hel lists them in `unlocks`.
- Power `cost` is the Retold **base reuse cost**. The first cast is always free, and each further reuse adds a ramp (given in `meta.note`).
- Free unit on age up: one of each Temple myth unit of the chosen minor god (Temple page rule). Hel gets only a Fire Giant (Hel page).

## Icons

- 69 icons come from Kries-Dev/BuildOrders. Each was checked with a range GET and returned an `image/png`.
- 102 icons come from the Fandom CDN (`static.wikia.nocookie.net`, with the `/revision/...` suffix stripped).
  - The CDN returns 403 to non-browser clients (curl, urllib, WebFetch).
  - Each file was confirmed to exist through the wiki API (`prop=imageinfo`).
  - In the built-in browser, stripped URLs on that CDN loaded directly as 256x256 images, but only a few could be checked (another session was sharing the browser).
