# Atlanteans — research log

Last pass: 2026-10-18 (game files). Earlier web pass: 2026-10-17.

## Source of truth

The installed game, build **19.17020** (owner decision 2026-10-18). Read-only copies extracted from `game/data/Data.bar`:

- `gameplay/proto.xml` — unit/building cost, `trainpoints`, `buildpoints`, `populationcount`, `populationcapaddition`, `buildlimit`, Gather/Build rates, train/tech lists.
- `gameplay/techtree.xml` — research cost, `researchpoints`, prereqs (`OrPrereqs` flag = OR), effects; age techs (`ArchaicAgeAtlantean`, `ArchaicAgeKronos`, `ClassicalAge<minor>`, `KronosExtra<unit>`, ...).
- `gameplay/major_gods.xml` — start units/resources, starting queue, `timeshifting` (Kronos).
- `gameplay/god_powers/atlantean.godpowers` — power cost (`<cost>` = second cast, first is free), `<repeatcost>` (escalation), Deconstruction `timefactor`. Cooldowns come from the `GodPower` effect of the age tech that grants the power.
- `gameplay/tactics/manor.tactics` (Temporal Scaffolding), `oracle.tactics`, `proto_unit_commands.xml`.
- String tables `strings/English` and `strings/PortugueseBrazil` — every `name` now uses the official strings (`displaynameid`).
- Modding guide shipped with the game (`BANG_Documentation/.../AoMRT_Comprehensive_Core_Data_Guide_Extended.pdf`) for semantics (relativity, OrPrereqs, godpower Cost/RepeatCost, TimeShifting timeRatio).

Op mapping: `BasePercent` → `pct` (value = amount − 1), `Percent` → `mul`, `Absolute` → `add`, `Assign 0` → `mul 0`.

Web sources (fandom wiki, aomr-analyzer, patch notes) are now support only; see the 2026-10-17 history below.

## Key file facts

- **Build times**: `buildTime` = `buildpoints` (seconds at build rate 1). Citizen Build rate 1.5 (Settlement/Village Center 1.25), Citizen Hero 1.65 (1.375). Manor 25 bp → 16.7 s with one Citizen; Temple 40 → 26.7 s; Armory 40 → 26.7 s; Counter Barracks 25 → 16.7 s; Economic Guild 15 → 10 s; Market 40; Military Barracks 30; Dock 30; Farm 10; Sentry Tower 60; Palace 115; Town/Village Center 150 bp (stored as 180 so a Citizen at 1.5 takes the real 120 s). No Atlantean tech changes buildpoints.
- **Citizen** `trainpoints` 28; Turma 9.5. No Atlantean effect on TrainPoints/TrainingRate (Village Center has no train-rate penalty in the files).
- **Kronos Temporal Scaffolding**: `AutoRangedModify` BuildRate ×1.25, `maxrange` 20, targets unbuilt `LogicalTypeBuildingSmall`/`LogicalTypeBuildingLarge` (all Atlantean buildings except Wonder, Sky Passage, gates). Stacking across Manors is not stated.
- **Kronos free myth units**: every Kronos minor god has a `KronosExtra<unit>` tech (Promethean, Automaton, Satyr, Behemoth, Argus, Centimanus) creating one more unit at the Temple → 2 per age up. Confirmed.
- **Time Shift** (`major_gods.xml` Kronos `timeshifting maxconcurrenttimeshifts="2"`): timeRatio 1.0 for every listed building; guide: "duration ratio according to building's build points" → duration = build points (does not depend on builders). costRatio 0 (Manor, Farm, Economic Guild, Military/Counter Barracks, Dock, Temple, Armory, Market), 0.5 (Palace, Sentry Tower, Mirror Tower). Temporal Chaos: timeRatio ×0.5, +1 concurrent, costRatio 0.5 → 0.25.
- **Deconstruction**: first cast free, then 10 favor, +10 per cast; cooldown 180 (ArchaicAgeKronos); deconstructs over 0.4 × build points; refunds the building cost to its owner.
- **Age ups**: Classical 400 f / 60 s (Temple); Heroic 800 f 500 g / 75 s (Armory **or** Market, `OrPrereqs`); Mythic 1200 f 1200 g / 120 s (Palace).
- **Free units**: Oceanus also creates a Servant at a Dock; every Atlantean gets a Nereid (Heroic) and a Man O' War (Mythic) at a Dock — only when a Dock exists, so not modelled.
- **Sons of the Sun**: transforms Oracles into Oracle Heroes; Temple trains Oracle Heroes (proto cost 30 f 45 g, favor set to 0, 11 s). `oracle-hero` now has `trainedAt: ["temple"]`, `requires: ["sons-of-the-sun"]`.
- **Wonder**: AutoGather Favor 1.0/s → `trickle.favor` 60.

## Conflicts and resolution (2026-10-18)

| Item                      | Files                                              | Previous value (source)                                     | Kept                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Citizen train time        | 28 s (`trainpoints`)                               | 30 s (owner measurement)                                    | **28** (file wins). Krush golden test now trains Citizens faster than measured, see PENDING                                                                                                                                                                                                                          |
| Turma train time          | 9.5 s                                              | 10 s (owner)                                                | **9.5**                                                                                                                                                                                                                                                                                                              |
| Counter Barracks build    | 25 bp → 16.7 s with one Citizen                    | 25 s measured with one Citizen                              | **25 bp** (value unchanged; the engine already divides by the Citizen rate 1.5)                                                                                                                                                                                                                                      |
| Citizen Hero gather rates | 102 / 91.8 / 71.4 / 71.4 / 102 / 87 per min        | 102.3 / 92.4 / 71.94 / 71.94 / 102.3 / 87.12 (Citizen ×1.1) | **file**                                                                                                                                                                                                                                                                                                             |
| Oracle Hero cost          | proto 30 f 45 g 1 favor                            | 70 f 105 g 1 favor (Oracle + promotion)                     | **file**                                                                                                                                                                                                                                                                                                             |
| Halo of the Sun time      | 40 s                                               | 50 s (wiki)                                                 | **40**                                                                                                                                                                                                                                                                                                               |
| Oranos favor              | cap +4 → ×1.285 (Oracle), ×1.25 (Hero) at full LOS | ×1.25 (aomr-analyzer)                                       | **file-derived**                                                                                                                                                                                                                                                                                                     |
| Perception                | FullCapacityMultiplier ×1.10 BasePercent           | `mul` 1.1                                                   | **`pct` 0.1**                                                                                                                                                                                                                                                                                                        |
| Frontline Heroics         | HeroInfantry promotion food/gold ×0.80 BasePercent | no effect                                                   | **`pct` −0.2** on the 4 hero-infantry promotions                                                                                                                                                                                                                                                                     |
| Names (pt-BR)             | string tables                                      | translations                                                | **official**: Centro Urbano, Centro de Aldeia, Armaria, Passagem do Céu, Torre Espelho, Murmilo, Quirobalista, Navio Pesqueiro, Caravela, Beemote, Pássaro de Estínfalo, Centimanos, Lâmpade, Cronos, Urano, Hiperião, Theia, Valentia, Implodir, ... ; en "Counter Barracks" (no hyphen), "Hesperides Tree" (power) |
| `*-gaia` research names   | same tech as the base one                          | "Plow (Gaia)" etc.                                          | **official name** (e.g. "Plow"); the id still tells them apart                                                                                                                                                                                                                                                       |

Values already matching the files (no change): all unit/building/research costs (Farm 150 and Dock 125 via ArchaicAgeAtlantean Assign; Heavy/Champion Cavalry ×0.75), Manor/Temple/Armory build points, promotions (7 s, costs), Gaia discounts, start state, minor god lists, god power costs/cooldowns, Weightless Mace 20 favor, Asper Blood 12 favor.

Added (exist in Retold, available to Atlanteans): Watch Tower, Signal Fires, Crenellations, Guard Tower, Carrier Pigeons, Boiling Oil, Stone Wall, Omniscience, Secrets of the Titans. Their icon ids are borrowed from the Greek/Egyptian entries (same game icon; no `techs/atlanteans-*` entry in the icon manifest).

## History (2026-10-17 web pass, superseded where the table above says so)

- Patch: 19.17020 (minor, no Atlantean changes); last Atlantean balance changes 19.16313.
- Sources then: project owner values, aomr-analyzer.com (costs), official patch notes, fandom wiki (times, powers), community map scripts (resource amounts), icons from Kries-Dev/BuildOrders and fandom.
- Conventions kept: hero units are separate `*-hero` units with `trainedAt: []` (except Oracle Hero, see above); promotion lives on the base unit; first cast of every god power is free (`cost` omitted); Gaia's early eco techs are `*-gaia` entries; Gaia `startExtras.units` replaces the 2 Citizens; minor-god techs (and every tech flagged `MythTech`, e.g. Heroic Fleet) carry the tag `myth-tech` used by Rheia's Gift.
