# Norse: sources

Checked 2026-10-18 against the installed game (build 19.17020), which is the source of truth. Scope: base-game Norse (Odin, Thor, Loki and their 9 minor gods). Freyr (New Gods Pack DLC), Ullr, Aegir, Vidar and their content (Draugr, Rock Giant, Fafnir, Asgardian Hill Fort, Freyr's Gift, Ring-Oath, Ydalir, Servants of Glory, Valgaldr, Feasts of Renown, Nine Waves, Grasp of Ran, Granite Maw, Avenging Spirit, Twilight of the Gods, Fury of the Fallen, Silent Resolve) are left out on purpose, even where base buildings list them.

## Files read

From `game/data/Data.bar` (read-only copies):

- `gameplay/proto.xml`: units and buildings. Cost, `populationcount`, `trainpoints`, `buildpoints`, `buildlimit`, `populationcapaddition`, `Gather` / `Build` / `AutoGather` protoaction rates, `train` lists (what a building trains, what a unit can build), `tech` lists (what a building researches), `researchrate` / `trainingrate`, unit types.
- `gameplay/techtree.xml`:
  - `ArchaicAgeNorse`, `ClassicalAgeNorse`, `HeroicAgeNorse` and `MythicAgeNorse`: Norse building costs and build points, and the age in which each unit and building is enabled.
  - `ArchaicAge<God>` and `Classical/Heroic/MythicAge<God>`: god bonuses, god powers and cooldowns, and which minor gods each god can pick.
  - `ClassicalAge<Minor>`, `HeroicAge<Minor>` and `MythicAge<Minor>`: age-up cost, time, prerequisites, myth units, free units and techs.
  - Every technology: cost, `researchpoints`, prereqs, effects and their relativity.
- `gameplay/major_gods.xml`: start units, start resources and `startingqueue` for Odin, Thor and Loki; the `bountyresourceearning` combat favor rule; Loki's `bonusunitspawning`; builder efficiencies.
- `gameplay/god_powers/norse.godpowers`: power cost, `repeatcost`, `activetime`, `builduptime`, Great Hunt food and Dwarven Mine gold per age.
- `strings/English/string_table.txt` and `strings/PortugueseBrazil/string_table.txt`: every `name.en` and `name["pt-BR"]` (DisplayNameID of the proto, tech, civ or power). `STR_CULTURE_NORSE` for the pantheon name.
- `strings/string_replacement_values.xml`: the bonus numbers shown in the god tooltips. These match techtree.xml.

## How values were converted

- Gather rates: proto `Gather` rate per second x 60 = per minute.
- Gatherer: wood 54, gold 46.2, hunt 54, herd 48.6, berries 37.8, farm 37.8.
- Dwarf: gold 58.8, wood 42, hunt 42, herd 37.8, berries 29.4, farm 29.4.
- Fishing Ship: 33 food/min.
- Effects: `BasePercent` amount x becomes `pct` with value x - 1; `Percent` becomes `mul`; `Absolute` becomes `add`.
  - Eco techs, god bonuses, Safeguard, Hammer of Thunder and Winter Harvest use `pct`.
  - Levy, Conscript, Conscript Sailors, Dwarven Auger and Rampage use `mul`.
  - Rigsthula is `BuildingWorkRate x1.20 BasePercent`, stored as time `mul 0.8333`.
- Build times are `buildpoints` with one builder at rate 1.0. Every Norse builder has rate 1.0:
  - Gatherers and Dwarves: Farm, House and OxCartBuilding.
  - Infantry and heroes: `Building`.
- Trickles: Hersir and Godi `AutoGather Favor 0.01/s`, so 0.6/min each.
- Combat favor rule: `bountydamagegoal 80`, reduction from 100 to 300, `bountyreductionstrength 0.5`.

## Conflicts with the previous values (files win)

| Item                     | Before (source)                                                                            | Game files                                                                                       | Now                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Wonder wood              | 5000 (generic, analyzer)                                                                   | ArchaicAgeNorse Assign 4500                                                                      | 4500                                                                            |
| Wonder favor trickle     | none                                                                                       | Wonder proto AutoGather Favor 1.0/s                                                              | `trickle.favor` 60                                                              |
| Ring Giver time          | 20 s (wiki)                                                                                | researchpoints 30                                                                                | 30                                                                              |
| Vikings time             | 26.67 s (wiki, "Great Hall works faster")                                                  | researchpoints 40, no Great Hall research rate                                                   | 40                                                                              |
| Sons of Sleipnir time    | 26.67 s (wiki)                                                                             | researchpoints 40                                                                                | 40                                                                              |
| Safeguard scope          | included the Wonder                                                                        | LogicalTypeBuildingNotWonderOrTitan                                                              | Wonder removed                                                                  |
| Loki build bonus         | buildRate scoped to builder tags infantry/hero (never matched a building in the simulator) | Build WorkRate x1.1 for AbstractInfantry and Godi                                                | buildRate +10% on every building except House, Farm and Ox Cart (approximation) |
| Rigsthula research time  | applied everywhere                                                                         | applies to `Building` only; the Ox Cart is a unit                                                | Ox Cart researches excluded                                                     |
| Undermine duration       | 14 s (wiki)                                                                                | activetime 15                                                                                    | 15                                                                              |
| Fimbulwinter duration    | 31 s (wiki)                                                                                | builduptime 6 + activetime 25                                                                    | castTime 6, duration 25                                                         |
| Great Hall cost          | 135 wood (analyzer) vs 160 (wiki)                                                          | 135                                                                                              | 135 (unchanged, confirmed)                                                      |
| Norse -10% wood          | wiki only                                                                                  | ArchaicAgeNorse Assign: House 45, Dock 90, Temple/Market/Armory/Sentry Tower 135, Wonder 4500    | confirmed                                                                       |
| Temple / Dock build time | 30 / 25 s (wiki)                                                                           | BuildPoints Override 30 / 25                                                                     | confirmed                                                                       |
| Eco tech stacking        | "not confirmed"                                                                            | BasePercent (additive on base)                                                                   | confirmed (`pct`)                                                               |
| Free unit on age up      | wiki Temple page rule                                                                      | `CreateUnit <myth unit> generator=AbstractTemple` in every minor age tech (Hel: Fire Giant only) | confirmed                                                                       |
| Thor start               | wiki                                                                                       | startingunits 3 VillagerDwarf                                                                    | confirmed                                                                       |

No Norse value had `source: "measured"`, so no measurement conflicts.

### Names (pt-BR, from the string table; before these were translations by the research agent)

- **Units:**
  - Hersir (Herói), Godi (Herói). The English names are "Hersir (Hero)" and "Godi (Hero)".
  - Hird (was Hirdman), Huscarl (Huscarlo), Cavalaria Incursora (Cavalaria de Saque).
  - Navio Pesqueiro (Barco de Pesca), Dracar (Barco Longo), Barco Dragão (Navio-Dragão), Caravana de Boi (Caravana de Bois).
  - Gigante de Montanha (Gigante da Montanha), Ninhada de Lobo de Fenris (Ninhada do Lobo Fenris).
- **Buildings:**
  - Centro Urbano (Centro da Cidade), Centro de Aldeia (Centro de Vila).
  - Casa comunal (Casa Longa), Forte de Colina (Forte da Colina).
  - Armaria (Arsenal), Armaria de Anões (Arsenal Anão), Carroça de Boi (Carro de Boi).
- **Techs:**
  - Ox Cart: Equipamento de sobrevivência, Arco de Serra, Poços de Mina.
  - Town Center and Dock: Centro Urbano Fortificado, Ânfora com Sal, Recrutar Marinheiros.
  - Levy techs: Convocar Soldados da Casa Comunal / do Grande Salão / do Forte de Colina.
  - Conscript techs: Recrutar Soldados da Casa Comunal / do Grande Salão / do Forte de Colina.
  - Hill Fort and Armory: Cavalos de Carga, Breu Incendiário, Armas Enânicas, Peitoral Enânico.
  - Sentry Tower: Fogueiras Sinalizadoras, Pombos Correio.
  - Minor-god techs: Rigsthula, Fúria das Profundezas, Doador do Anel, Jotuns, Longa Serpente, Runa de Thurisaz, Formação Svinfylking, Verrumão dos Anões, Fúria Berserker, Rompante.
- **Minor gods:** Freia (Freyja), Balder (Baldr).
- **God powers:** Grande Caça, Mina Enânica, Desmoronar (Undermine), Fonte de Cura, Árvores Andantes, Ragnarok.
- **Plurals:** pt-BR plurals were added only where the default pluralizer breaks Portuguese grammar:
  - Units: Berserkers, Hersires (Heróis), Godis (Heróis), Cavalarias Incursoras, Navios Pesqueiros, Aríetes Portáteis.
  - Buildings: Centros Urbanos, Casas comunais, Grandes Salões.

All English names already matched the string table, except Hersir and Godi (now with "(Hero)").

## Older sources

The first pass (2026-10-17) used aomr-analyzer.com and the Age of Empires Series Wiki. They are now support only. Every Norse value they gave was either confirmed or replaced by the game files. Icon URLs in `icons.json` still come from Kries-Dev/BuildOrders and the Fandom CDN (unchanged).
