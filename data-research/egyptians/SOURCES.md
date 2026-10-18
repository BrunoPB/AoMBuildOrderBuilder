# Egyptians — sources

Last checked: 2026-10-18. Game build: **19.17020** (AoMRT_s.exe FileVersion 100.19.17020.0, Steam build id 23996698).

## Source of truth: the installed game (owner decision 2026-10-18)

Everything in `src/data/pantheons/egyptians.json`, `src/data/gods/{ra,isis,set}.json`, the nine Egyptian minor gods and `data-research/egyptians/powers.json` was re-checked on 2026-10-18 against the owner's install (`game/data/Data.bar`, read-only copies). Every entity now has `meta.source` = `Game files 19.17020 (<files>)`, `confidence: "high"`.

Files used:

- `gameplay/proto.xml`: unit and building cost, `trainpoints`, `buildpoints`, `populationcount`, `populationcapaddition`, `buildlimit`, `<train>` and `<tech>` lists (trainedAt / trains / researches / at), Gather and Build rates, Monument and Wonder `AutoGather` favor.
- `gameplay/techtree.xml`: `ArchaicAgeEgyptian` (cost overrides, enabled units/buildings), `Classical/Heroic/MythicAgeEgyptian` (what each age enables), `ArchaicAge{Ra,Isis,Set}` and their Classical/Heroic/Mythic followers (god bonuses, minor god choices, Set animals), the nine minor god age techs (cost, time, prereqs, free unit, god power + cooldown, techs made obtainable), and every Egyptian research (cost, researchpoints, prereqs, effects and their relativity).
- `gameplay/major_gods.xml`: `startingunits` and `startingresources` for Ra, Isis and Set.
- `gameplay/god_powers/egyptian.godpowers`: cost, repeat cost, active time, build-up and effects of the 12 Egyptian god powers.
- `gameplay/tactics/pharaoh.tactics`, `priest.tactics`, `monument.tactics`: empower rates (Pharaoh x1.75 / x1.2, Ra Priest and Monument aura x1.45 / x1.12), Devotees (Set) x0.90 within 20.
- `strings/English` and `strings/PortugueseBrazil/string_table.txt` (`displaynameid` of each proto/tech/power, `STR_CIV_*`), `strings/string_replacement_values.xml` (god bonus numbers).
- Modding guide shipped with the game (`BANG_Documentation/Data documentation/AoMRT Comprehensive Core Data Guide.pdf`): meaning of the relativities, and of `ignoreAgeUps` on a `techAll` target.

Conversions:

- Gather rates = proto `<Gather>` rate per second x 60 (per minute). Favor = AutoGather x 60.
- `buildTime` = buildpoints / Laborer build rate 0.75 (Obelisk: built by Priests at rate 1.0).
- Effect ops: `BasePercent` -> `pct` (value = amount - 1), `Percent` -> `mul`, `Absolute` -> `add`, `ResourceTrickleRate` -> `trickle`.

## Changes in the 2026-10-18 pass

- Names: Priest, Pharaoh and Pharaoh (New Kingdom) now use the official display strings, which carry the hero suffix: "Priest (Hero)" / "Sacerdote (Herói)", "Pharaoh (Hero)" / "Faraó (Herói)", "Pharaoh (New Kingdom) (Hero)" / "Faraó (Novo Reino) (Herói)". All other names already matched the string tables exactly.
- Plurals added where the string table has them (`STR_FISHING_SHIP` "Fishing Ships" / "Navios Pesqueiros", `STR_HISTORY_LINK_TOWN_CENTERS` "Town Centers" / "Centros Urbanos", "Quartéis" in several strings, "Petsuchoi" in `STR_TECH_CROCODILOPOLIS_LR`) or where pt-BR grammar needs them and the automatic rule fails (Cavalarias Mercenárias, Campos Madeireiros, Faróis, Fênix). "Barracks" and "Siege Works" are their own English plurals.
- Wonder: `trickle.favor` 60 added (proto `AutoGather` Favor 1.0/s).
- Village Center: `limit` 1 removed. Its proto `buildlimit` is 1, but `ClassicalAgeGeneral` sets BuildLimit -1 (unlimited) for TownCenter and VillageCenter, which is how the Town Center is already modelled.
- `roc`, `sentry-tower`, `wall`, `stone-wall`, `fortified-wall`, `citadel-wall`, `guard-tower`, `ballista-tower`: raised from `medium` to `high` (file values; no second source needed under the owner rule).
- All `meta`/`fieldMeta`: source format `Game files 19.17020 (...)`, `checkedAt` 2026-10-18.

Everything else was confirmed unchanged: start state (200 F / 100 W / 50 G, 3 Laborers + 1 Priest, + 1 Baboon of Set for Set, Pharaoh from `PharaohFirstSpawn`), all 40 units, 24 buildings (incl. the five Monuments at 4.5 / 6 / 7.5 / 9 / 12 Favor/min, chained by `MonumentTo*Shadow` prereqs), 105 researches (cost, time, building, prereqs, effect ops), the three age-ups (400 F 60 s with a Temple; 800 F + 500 G 75 s with an Armory or a Market; 1200 F + 1200 G 120 s with a Migdol Stronghold), Ra/Isis/Set modifiers and minor god lists, the nine minor gods (free unit, unlocks, power) and the 12 god powers (cost, cooldown, duration, build-up, effects).

Isis -10% research cost: the `techAll` target has `ignoreAgeUps`, so age-ups are excluded (as the data says); Secrets of the Titans gets +80 F/W/G back, which the `except` models.

## Conflicts with earlier values or other sources

| Item                   | Game files (used)                          | Other / previous value                  | Note                                               |
| ---------------------- | ------------------------------------------ | --------------------------------------- | -------------------------------------------------- |
| Priest / Pharaoh names | "Priest (Hero)", "Sacerdote (Herói)", etc. | "Priest", "Sacerdote" (suffix stripped) | Official display strings include the suffix.       |
| Village Center limit   | unlimited from Classical                   | `limit: 1`                              | `ClassicalAgeGeneral` BuildLimit -1.               |
| Wonder favor           | 60 Favor/min                               | none                                    | Proto AutoGather Favor 1.0/s.                      |
| Roc population         | 3                                          | Fandom wiki: 2 "since Retold"           | File wins.                                         |
| Sentry Tower cost      | 200 Gold                                   | Wiki generic 150 Wood + 100 Gold        | `ArchaicAgeEgyptian` Override.                     |
| Monument favor         | 4.5 / 6 / 7.5 / 9 / 12 per min             | Owner values                            | Agree.                                             |
| Flood of the Nile cost | 150 Gold, 8 Favor                          | Wiki 135 / 7.2                          | Wiki shows the Isis-discounted price; no conflict. |
| Hathor                 | absent                                     | Owner's early list (heroic)             | Sobek replaces Hathor in Retold.                   |

No value in these files was an owner measurement (`"source": "measured"`), so no measurement was overruled.

## Earlier support sources (no longer needed)

The 2026-10-17 pass cross-checked the Age of Empires Series Wiki (Fandom) via the MediaWiki API (161 of 169 entities agreed). aomr-analyzer.com and Liquipedia were not used.

## Icons (`icons.json`, 206 entries, all checked with HEAD: HTTP 200 and image/*)

- Kries-Dev/BuildOrders (preferred), 74 icons.
- MiguelMG24/aom-retold-build-order (`assets/egipcios/...`, file names identical to the game's), 123 icons. The repo has no license file.
- 12sg3/aom_tech_tree (`docs/img/...webp`, MIT code), 9 icons: 8 god powers and Advanced Fortifications.
- Fandom static images are blocked from this environment (Cloudflare 403).
