# Game files findings (build 19.17020)

Source: the owner's installed copy of Age of Mythology: Retold, `game/data/Data.bar`, read-only (`gameplay/proto.xml`, `techtree.xml`, `major_gods.xml`, `god_powers/*.godpowers`), plus `game/random_maps/*.xs` and the official modding guide shipped with the game (`BANG_Documentation/Data documentation/AoMRT_Comprehensive_Core_Data_Guide_Extended.pdf`). Checked 2026-10-18.

## How tech effects stack (relativity)

The modding guide defines the relativities of a `Data` effect:

| Relativity    | Meaning                                                                 | Data op |
| ------------- | ----------------------------------------------------------------------- | ------- |
| `Absolute`    | adds the amount                                                         | `add`   |
| `Percent`     | multiplies the current value by the amount                              | `mul`   |
| `BasePercent` | adds `base × (amount − 1)`, using the original unmodified value as base | `pct`   |
| `Assign`      | replaces the value                                                      | —       |
| `Override`    | replaces current and base value (only Cost and WorkRate)                | —       |

Every economic gather-rate tech uses `BasePercent`, so they add up on the base rate: Plow + Irrigation + Flood Control = +30% (not ×1.331). Train-time techs (Levy/Conscript, Dwarven Auger, Rampage, Horns of Consecration) and Shaduf/Sun-dried Mud-brick build points use `Percent` (multiplicative).

### Converted to `pct` (value = amount − 1)

| Data id                                            | Game effect (techtree.xml)                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| husbandry                                          | Gather Herdable ×1.10 (also AutoGatherFood fattening ×1.25, carry +15)        |
| plow, irrigation, flood-control (+ `-gaia` copies) | Gather AbstractFarm ×1.10 each                                                |
| hand-axe / bow-saw / carpenters (+ `-gaia`)        | Gather WoodResource ×1.10 / ×1.15 / ×1.20                                     |
| pickaxe / shaft-mine / quarry (+ `-gaia`)          | Gather GoldResource ×1.10 / ×1.15 / ×1.20                                     |
| purse-seine, salt-amphora                          | Fishing ships Gather FishResource ×1.5 each                                   |
| adze-of-wepwawet                                   | Wood ×1.10                                                                    |
| sacred-cats                                        | Farm ×1.08; Huntable/Herdable/WildCrops ×1.1                                  |
| book-of-thoth                                      | Farm, hunt, herd, berries, wood, gold ×1.10                                   |
| winter-harvest                                     | Farm ×1.20; hunt/herd/berries ×1.10                                           |
| theft-of-fire                                      | Citizen Hero gather (all) and build ×1.20                                     |
| divine-blood                                       | Villager Build ×1.15                                                          |
| golden-apples                                      | Temple Gather (favor) ×1.20                                                   |
| necropolis                                         | Monument Autogather Favor ×1.25                                               |
| hammer-of-thunder                                  | Hersir AutoGather Favor ×1.5                                                  |
| prophetic-sight                                    | Oracle AutoGatherFavor WorkRate ×1.10                                         |
| sun-dried-mud-brick (cost)                         | Building gold cost ×0.90 BasePercent (build points ×0.85 Percent stays `mul`) |
| spirit-of-maat (cost)                              | Priest gold ×0.70                                                             |
| tusks-of-apedemak                                  | War Elephant food/gold ×0.90, plus PopulationCount −1 (new `pop` add −1)      |
| poseidons-secret                                   | Cavalry food/wood/gold ×0.90 (also Turma/Contarius promotions, not modelled)  |
| safeguard                                          | All buildings except Wonder/Titan Gate gold ×0.50                             |
| rheias-gift                                        | All techs favor ×0.00; Secrets of the Titans and promotions ×2.00 (net same)  |
| Zeus                                               | Temple favor ×1.20 (so Zeus + Golden Apples = +40%, not ×1.44)                |
| Ra / Odin                                          | Berries ×1.30 / Hunt ×1.1 (all economic units)                                |
| Thor                                               | Dwarves ×1.25 on hunt, herd, berries, farm, wood; ArmoryTechnology cost ×0.90 |
| Loki                                               | AbstractInfantry and Godi build ×1.1; Ox Cart cost ×0.5                       |
| Gaia                                               | Citizen promotion cost ×0.75 (food, wood, favor)                              |
| Rain / Prosperity / Eclipse (god powers)           | Farm ×2.5 + fish ×1.5 / gold ×1.5 / Monument favor ×1.5, all BasePercent      |

Kept as `mul` because the files say `Percent`: Isis tech discount ×0.90, Hades ranged techs ×0.666, Poseidon Stable/Market ×0.70 (wood only: both buildings cost only wood), Set ×0.75 gold, Gaia Economic Guild ×0.65, Forge of Olympus cost ×0.25. Forge of Olympus research time ×0.6667 is `ResearchRate ×1.5 BasePercent` (= time / 1.5). Rigsthula is `BuildingWorkRate ×1.20 BasePercent` (= time ×0.8333).

Approximations left as they were: Oranos is `ModifyRateCap +4` on the Oracle LOS (not a multiplier, ≈ +28% at full LOS); Perception is `FullCapacityMultiplier ×1.1` and `ModifyRateCap ×1.1` (≈ +27% at full LOS); Sons of the Sun turns every Oracle into an Oracle Hero.

## 1. Atlantean hero promotion

Each promotion is a tech `<Unit>ToHero` with techtype `HeroPromotion`, made active by `ArchaicAgeAtlantean`. The unit's proto has `<transformcommand>` pointing to it; the guide says it is "researched when a transform command is issued over the unit", so it is done **on the unit**, not in a building queue. All take `researchpoints` 7 s.

| Unit           | Promotion cost            |
| -------------- | ------------------------- |
| Citizen        | 65 food, 10 wood, 2 favor |
| Oracle         | 30 food, 45 gold, 1 favor |
| Katapeltes     | 45 food, 25 gold, 2 favor |
| Turma          | 35 wood, 30 gold, 2 favor |
| Murmillo       | 40 food, 25 gold, 2 favor |
| Cheiroballista | 85 wood, 75 gold, 4 favor |
| Contarius      | 55 food, 30 gold, 3 favor |
| Arcus          | 45 wood, 25 gold, 2 favor |
| Destroyer      | 55 food, 45 gold, 3 favor |
| Fanatic        | 55 food, 40 gold, 3 favor |

The values in `atlanteans.json` were already correct.

- Gaia (`ArchaicAgeGaia`): Citizen promotion cost ×0.75 BasePercent on food, wood and favor → 48.75 food, 7.5 wood, 1.5 favor. No discount on other units.
- Heart of the Titans: HeroPromotion `ResearchPoints ×0.25` (7 s → 1.75 s). No modifier target exists for it.
- Rheia's Gift: does not change promotion favor costs (the ×0 and ×2 BasePercent cancel).
- Poseidon's Secret: −10% on Turma and Contarius promotions (techtype HeroCavalry).
- Not stated in the files: whether the unit keeps working during the 7 s.

## 2. Multiple builders

`major_gods.xml`, every civ: `<buildingefficiency>0.6</buildingefficiency>` and `<extrabuildingefficiency>0.3</extrabuildingefficiency>`. The guide: "BuildingEfficiency: Work rate multiplier to be applied to the second builder on foundations. ExtraBuildingEfficiency: Work rate multiplier for additional builders on foundations."

So with n identical builders of rate r: speed = r × (1 + 0.6 + 0.3 × (n − 2)) for n ≥ 2. Two builders = 1.6×, three = 1.9×, four = 2.2×, five = 2.5×. Which builder counts as "first" when their rates differ is not stated. The engine was not changed.

## 3. Builder rates (proto.xml `Build` protoaction)

| Unit                                                        | Rate                                              |
| ----------------------------------------------------------- | ------------------------------------------------- |
| Greek Villager                                              | Building 1.0                                      |
| Egyptian Laborer                                            | Building 0.75                                     |
| Priest                                                      | Obelisk 1.0 (Isis ×1.4 Percent)                   |
| Norse Gatherer/Dwarf                                        | Farm, House, OxCartBuilding 1.0 (nothing else)    |
| Norse infantry/heroes (Berserk, Hirdman, Hersir, Godi, ...) | Building 1.0                                      |
| Atlantean Citizen                                           | Building 1.5; Settlement and VillageCenter 1.25   |
| Citizen Hero                                                | Building 1.65; Settlement and VillageCenter 1.375 |

Data: Egyptian building times already are base / 0.75 with Laborer `buildRate` 1 (correct). Atlantean Town Center and Village Center `buildTime` changed 150 → 180 so a Citizen takes 120 s and a Hero 109 s (as in game).

## 4. Favor caps

No cap anywhere in the files: no `MaxResource` effect in techtree.xml or the god power files, nothing in major_gods.xml or game.cfg. Rheia's Gift refunds up to 2000 favor, so 200 cannot be a hard cap there. The wiki says favor has no cap since Retold; aomr-analyzer says 100 (Greeks) and 200 (others), but the owner confirmed Greeks have none. No `favorCap` is set.

## 5. Start state (major_gods.xml `startingunits` / `startingresources`, supremacy)

| God             | Units                                   | Resources (F/W/G/Favor) |
| --------------- | --------------------------------------- | ----------------------- |
| Zeus            | 4 Villagers, 1 Kataskopos               | 200 / 250 / 50 / **10** |
| Hades, Poseidon | 4 Villagers, 1 Kataskopos               | 200 / 250 / 50 / 0      |
| Ra, Isis        | 3 Laborers, 1 Priest (+ Pharaoh at 2 s) | 200 / 100 / 50 / 0      |
| Set             | same + 1 Baboon of Set                  | 200 / 100 / 50 / 0      |
| Odin, Loki      | 3 Gatherers, 1 Ox Cart, 1 Berserk       | 200 / 150 / 100 / 0     |
| Thor            | 3 Dwarves, 1 Ox Cart, 1 Berserk         | 200 / 150 / 100 / 0     |
| Kronos, Oranos  | 2 Citizens, 3 Oracles                   | 275 / 250 / 75 / 0      |
| Gaia            | 2 Citizen Heroes, 3 Oracles             | 275 / 250 / 75 / 0      |

The Pharaoh comes from tech `PharaohFirstSpawn` (delay 2 s, at the Town Center). The data matched already.

Sentry Towers are not in `startingunits`; the random map scripts place them: 35 maps call `addObjectLocsPerPlayer(startingTowerID, true, 4, cStartingTowerMinDist, ...)` with `cUnitTypeSentryTower` at 26 m (lib/rm_util.xs). One map places 5. There is a single `SentryTower` proto for every culture, so `"sentry-tower": 4` was added to all four pantheons.

## 6. Trickles

| What                     | File                       | Value                                                 | Data                                      |
| ------------------------ | -------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| Hersir, Godi             | proto.xml AutoGather Favor | 0.01/s = 0.6/min each                                 | unit `trickle.favor` 0.6                  |
| Plenty (Greek power)     | greek.godpowers, proto.xml | permanent Plenty Vault, 3.5 food/wood/gold per second | `effect.trickle` 210/210/210, no duration |
| Vaults of Erebus (tech)  | techtree.xml               | `ResourceTrickleRate` Gold +1.75/s = 105/min          | not expressible (research has no trickle) |
| Flood of the Nile (tech) | techtree.xml               | `ResourceTrickleRate` Food +1.0/s = 60/min            | not expressible                           |
| Zeus                     | techtree.xml               | MythUnit PopulationCount −1 Absolute                  | `pop` add −1 on tags myth                 |

## 7. Oracle favor

proto.xml `AutoGatherFavor`: `rate Favor 0.01`, `modifybase 100`, `modifymultiplier 0.75`, `modifyratecap 25` (Oracle Hero: 0.80, cap 30). `AutoLOS`: LOS bonus +1 per second while standing still, `modifydecay 0.3`, cap 25 (30). This matches the wiki formula favor/s = 0.01 + m × (bonusLOS / 100)²:

- no LOS bonus (moving): 0.01/s = 0.6/min
- Oracle, full bonus 25: 0.0569/s = 3.41/min (reached after ~25 s still)
- Oracle Hero, full bonus 30: 0.082/s = 4.92/min (×1.44 of the Oracle)
- Oranos (cap +4): Oracle 4.38/min, Hero 6.15/min
- bonus 15: 1.61/min; bonus 20: 2.40/min

The 2.0/min default is a Oracle that keeps about 18 of the 25 bonus LOS on average (or full LOS with some overlap/moving). Overlap is not in these files (engine rule).

## Other values confirmed or fixed on the way

- Atlantean Farm 150 wood and Dock 125 wood (`ArchaicAgeAtlantean` Assign; aomr-analyzer shows the generic 75/100).
- Norse Market 135 wood (`ArchaicAgeNorse`: House 45, Dock 90, Temple/Market/Armory/Sentry Tower 135, Wonder 4500).
- Norse Watch Tower research 15 s (was 20 from an old wiki value).
- Sky Passage 30 s, Mirror Tower 60 s, Wonder 5400 s are base buildpoints; Carcinos train 9 s.
- Greek Wooden Gate: WallGate buildpoints 15 (medium: assumes the wall conversion builds a foundation).
- Norse combat favor rule (`bountyresourceearning`): 1 favor per 80 damage, reduction from 100 to 300 total, strength 0.5 — matches the data.
