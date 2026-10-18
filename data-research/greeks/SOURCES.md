# Greeks: sources

Checked 2026-10-18. Scope: base-game Greeks only (Zeus, Hades, Poseidon and their 9 minor gods).
Left out: Demeter (DLC major god), her minor gods Pan, Hestia and Persephone, and her units (Orpheus, Iolaus, Icarus, King Midas, Amazon Archer, Lykaon, Hamadryad, Harpy, Siren). The Titan is also left out.

## Source of truth: the installed game (build 19.17020)

The owner decided on 2026-10-18 that the installed game is the absolute source of truth. Every value in the Greek files was reconciled against it. Values confirmed from the files have `source: "Game files 19.17020 (<file>)"`, `checkedAt: 2026-10-18`, `confidence: "high"`.

Files read (read-only, from `game/data/Data.bar` and `game/config`):

- `gameplay/proto.xml`: unit and building cost, `populationcount`, `trainpoints`, `buildpoints`, `buildlimit`, `populationcapaddition`, dropsite types, `train`/`tech` lists (where things are trained and researched), gather and build rates, `trainingrate` (Village Center 0.75).
- `gameplay/techtree.xml`: research cost, `researchpoints`, prereqs and effects; age techs (`ArchaicAgeGreek`, `ClassicalAgeGreek`, `HeroicAgeGreek`, `MythicAgeGreek`, `ArchaicAge<God>`, `<Age><God>`, the minor-god age-up techs `ClassicalAgeAthena` and so on), god bonuses, god power grants and cooldowns, and which age makes each unit and tech available.
- `gameplay/major_gods.xml`: start units and resources, Hades shades, building efficiency.
- `gameplay/god_powers/greek.godpowers`: god power cost, repeat cost, active time and parameters.
- `gameplay/tactics/fortress.tactics`: Argive Patronage Maintain action (60 train points).
- `game/config/game.cfg`: prayer formula constants (`PrayerEfficiencyEarlyIncomeReductionV=10.1111`, `PrayerEfficiencyLaterGrowthG=0.01`, `PrayerEfficiencyModifierZ=10.0`).
- `strings/English/string_table.txt`, `strings/PortugueseBrazil/string_table.txt`: every `name` is the official display string of the entity (`displaynameid`).

How effect relativities were converted: `BasePercent` → `pct` (value − 1), `Percent` → `mul`, `Absolute` → `add`; `ResourceTrickleRate` → `trickle` (per second × 60).

## Key values (from the files)

- **Start**: 4 Villagers, 1 Kataskopos, 200 food / 250 wood / 50 gold; Zeus also 10 favor. Town Center 15 pop. 4 Sentry Towers from the random-map scripts.
- **Villager** (rates per second × 60): hunt 60, herd 54, berries 42, farm 42, wood 60, gold 51; build 1.0. Fishing Ship 33.
- **Favor**: Villager `Gather AbstractTemple 0.1`; game.cfg constants give favor/s = N × M × (1/(N + 10.1111) + 0.01). Zeus and Golden Apples are each `x1.20 BasePercent` on the rate (M = 1.2 or 1.4 together). No favor cap in any file.
- **Age-ups** (Town Center or Village Center): Classical 400 food, 60 s, Temple; Heroic 800 food + 500 gold, 75 s, Armory or Market; Mythic 1200 food + 1200 gold, 120 s, Fortress.
- **Free units on age-up**: every minor-god age tech creates one of its myth units at a Temple (Minotaur, Centaur, Cyclops, Manticore, Hydra, Nemean Lion, Medusa, Colossus, Chimera). `HeroicAgeGreek` also creates a Scylla and `MythicAgeGreek` a Carcinos, at a Dock (not modelled, see PENDING).
- **Hero train time**: proto base (Archaic heroes 5 s, Classical 20 s, Heroic 25 s, Mythic 30 s, The Argo 25 s) × 0.9 for each of `ClassicalAgeGreek`, `HeroicAgeGreek`, `MythicAgeGreek` (TrainPoints ×0.90 Percent on HeroShadowUpgraded). `trainTime` holds the value in the unlock age: 5, 18, 20.25, 21.87, 20.25.
- **God powers**: cooldown from the `GodPower` effect that grants the power (amount 1); `cost` is the file `<cost>`; each recast adds `<repeatcost>`.

## Conflicts with previous values (file wins)

| Topic                                    | Before                                                 | Game files                                                                                                  | Now                                                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minor-god free myth unit on age-up       | "No free units"                                        | `CreateUnit <myth unit> generator=AbstractTemple` in every minor age tech                                   | `freeUnitsOnAgeUp: { <unit>: 1 }` on all 9 minor gods                                                                                                                                                                  |
| Hades ranged-tech discount               | ×0.67 on food/wood/gold, favor assumed unchanged       | `Cost ×0.666 Percent`, including favor on Enyo's Bow, Sun Ray, Shafts of Plague                             | value 0.666, resources food/wood/gold/favor                                                                                                                                                                            |
| Hero train times                         | 20.3 (Heroic heroes, Argo), 21.9 (Mythic heroes), wiki | 25 × 0.81 = 20.25, 30 × 0.729 = 21.87                                                                       | 20.25 / 21.87                                                                                                                                                                                                          |
| Archaic heroes (Jason, Ajax, Theseus)    | requires only the god                                  | `<Hero>Enable` needs `AbstractTemple ≥ 1`                                                                   | requires adds `temple`                                                                                                                                                                                                 |
| Village Center age                       | archaic                                                | buildlimit 1 shared with the Town Center until `ClassicalAgeGeneral`                                        | classical                                                                                                                                                                                                              |
| Levy/Conscript scope                     | tags infantry/archer/cavalry/ship                      | InfantryLine/ArcherLine/CavalryLineUpgraded, unit type Ship (not Scylla, Carcinos, Hippocampus, Kataskopos) | explicit ids                                                                                                                                                                                                           |
| Kataskopos, Militia, Shade of Hades cost | `{}`                                                   | proto cost 75 food / 70 food / 100 gold + 5 favor                                                           | file cost (never paid: not trainable)                                                                                                                                                                                  |
| Lightning Storm duration                 | 16.3                                                   | activetime 15, builduptime 1.3                                                                              | duration 15, castTime 1.3                                                                                                                                                                                              |
| Wonder favor                             | none                                                   | AutoGather Favor 1.0/s                                                                                      | trickle favor 60/min                                                                                                                                                                                                   |
| Names                                    | translations, wiki names                               | official string tables                                                                                      | e.g. Centro Urbano, Centro de Aldeia, Armazém, Armaria, Campo de Arqueiros, Navio Pesqueiro, Donkey Caravan / Caravana de Burro, "Jason (Hero)" / "Jasão (Herói)", Abundância, Cessar-fogo, Passagem do Mundo Inferior |
| Tax Collectors note                      | -25% market cost, -50% tribute penalty                 | buy/sell factor ±0.075, tribute penalty -0.10                                                               | note fixed                                                                                                                                                                                                             |
| Poseidon market note                     | +15% exchange rates                                    | buy factor -0.10, sell factor +0.10                                                                         | note fixed                                                                                                                                                                                                             |

No measured (owner) value conflicts with the files: the favor table (6.00 and 31.30 favor/min) is reproduced exactly by the game.cfg formula.

Values that matched already: every unit, building and research cost; every research time and age; all building times, pop caps and limits (House 16, Sentry Tower 30, Fortress 15, Wonder 1); all train times except heroes; gather rates; age-ups; god power costs and cooldowns; Zeus, Poseidon, Golden Apples, Divine Blood, Forge of Olympus, Vaults of Erebus (1.75 gold/s), Fortified Town Center, gather-tech effects; minor gods per major god.

## Minor gods per major god (techtree.xml TechStatus chain)

- Zeus: Athena / Hermes, then Apollo / Dionysus, then Hera / Hephaestus.
- Hades: Athena / Ares, then Apollo / Aphrodite, then Artemis / Hephaestus.
- Poseidon: Hermes / Ares, then Dionysus / Aphrodite, then Artemis / Hephaestus.

## Earlier support sources (2026-10-17, now superseded by the files)

aomr-analyzer.com (costs, pop), the Age of Empires Series Wiki (times, notes, favor table), official patch notes (19.16313, 19.16764, 19.17020). Icons: Kries-Dev/BuildOrders, rupprath/aom-counters and wiki file URLs (see `icons.json`).
