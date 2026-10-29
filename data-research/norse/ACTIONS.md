# Norse: god actions (Odin, Thor, Loki)

Checked against the game files, build 19.17020, on 2026-10-29. The files were extracted to the scratchpad `gf\gameplay\`. Names come from `strings\English` and `strings\PortugueseBrazil\string_table.txt`. Web sources (aomr-analyzer Norse page, the official Norse pantheon page, forum threads) only helped find mechanics. Every fact and number below comes from the files. Data: [actions.json](actions.json).

Abbreviations: **tt** = `techtree.xml`, **proto** = `proto.xml`, **mg** = `major_gods.xml`, **abil** = `abilities/abilities.xml`, **puc** = `proto_unit_commands.xml`, **ut** = `unit_transform.xml`.

## Shared by every Norse god

`ArchaicAgeOdin`, `ArchaicAgeThor` and `ArchaicAgeLoki` all activate `ArchaicAgeNorse`. That tech enables the units below and sets `VillagerNorseToBerserk` and `VillagerDwarfToBerserk` to _active_.

| Action (pt-BR / en)                              | Issuer                                                                                  | What it does                                                                                                                                                                                                                                                                                 | Numbers                                                                        | Source                                                                                                                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vire Berserker / Go Berserk                      | Gatherer                                                                                | Turns the Gatherer into a Berserk. Per unit, instant.                                                                                                                                                                                                                                        | 30 food + 20 gold; 0 research points; pop 1 → 2                                | tt `VillagerNorseToBerserk` (`cost`, `researchpoints`, techtype `ResearchableCommand`); puc `VillagerNorseToBerserk` `<transformvillager/>`; ut; proto VillagerNorse `<command>`/`<transformcommand>` |
| Vire Berserker / Go Berserk                      | Dwarf                                                                                   | Same, from a Dwarf                                                                                                                                                                                                                                                                           | 10 food + 30 gold; instant                                                     | tt `VillagerDwarfToBerserk`; puc `VillagerDwarfToBerserk` (`displayontarget`)                                                                                                                         |
| Carroça de Boi / Ox Cart (build)                 | Gatherer, Dwarf                                                                         | Places an `OxCartBuilding` foundation. When finished, it is replaced by the mobile `OxCart` unit.                                                                                                                                                                                            | 40 food + 40 wood; 15 build points (15 s for 1 builder); 0 pop; no build limit | proto `OxCartBuilding` (`buildreplacement` OxCart, `cost`, `buildpoints`); proto VillagerNorse/VillagerDwarf `<train>OxCartBuilding`                                                                  |
| Carroça de Boi / Ox Cart (dropsite)              | Ox Cart                                                                                 | Takes food (hunt, herd, berries, farm), wood and gold, but not favor. It claims herdables (`LogicalTypeConvertsHerds`). It researches Husbandry, Plow, Irrigation, Flood Control, Hunting Equipment, Hand Axe, Bow Saw, Carpenters, Pickaxe, Shaft Mine, Quarry and Winter Harvest.          | HP 80, LOS 6                                                                   | proto `OxCart` unittypes `FoodDropsite`/`WoodDropsite`/`GoldDropsite`, `<tech>` list                                                                                                                  |
| Carroça de Boi / Ox Cart (move)                  | Ox Cart                                                                                 | There is **no pack/unpack**: it is a normal land unit that works as a dropsite wherever it stands. Right-clicking a resource sends it to within 2 m of the resource; it deposits nothing itself. Its only extra command is Seek Shelter.                                                     | speed 3.8                                                                      | proto `OxCart` `maxvelocity`, `<command>SeekShelter`; `tactics/ox_cart.tactics` Gather `maxrange 2`, `donotdepositresources 1`                                                                        |
| Construir / Build (workers)                      | Gatherer, Dwarf                                                                         | Can build only **House, Farm, Ox Cart**. Can repair only Houses.                                                                                                                                                                                                                             | build rate 1.0; repair 0.4                                                     | proto VillagerNorse/VillagerDwarf `<train>`, `Build` rate Farm/House/OxCartBuilding, `Repair` rate House                                                                                              |
| Construir / Build (soldiers)                     | Berserk, Hersir (Archaic); Hirdman, Throwing Axeman (Classical); Huskarl, Godi (Heroic) | Can build every other Norse building, and Houses too: Temple, Dock, Longhouse, Great Hall, Market, Armory or Dwarven Armory, Town Center, Village Center, walls, Sentry Tower, Hill Fort, Wonder, Titan Gate. They cannot place a Farm or an Ox Cart. Jarl and Raiding Cavalry cannot build. | build rate 1.0 (`Building`); repair 0.4 (walls 0.2)                            | proto `<train>` lists + `Build`/`Repair` protoactions of each unit                                                                                                                                    |
| Hersir (Herói) / Godi (Herói): favor trickle     | Hersir, Godi                                                                            | Passive favor while the unit is alive                                                                                                                                                                                                                                                        | 0.01 favor/s = 0.6/min each                                                    | proto Hersir/Godi `AutoGather` rate Favor 0.01 (persistent)                                                                                                                                           |
| Mãos Sagradas (Passivo) / Sacred Hands (Passive) | Hersir, Godi                                                                            | Pick up one relic and drop it at a Temple                                                                                                                                                                                                                                                    | maxcontained 1                                                                 | proto `Pickup`/`DropOff`; abil `PassiveSacredHands`                                                                                                                                                   |
| Reconhecimento Automático / Auto Scouting        | Berserk (and Odin's Ravens)                                                             | Auto-scout toggle. Off by default (`noautocast`). The name is taken from the rollover text `STR_PUC_AUTO_SCOUT`; there is no short name.                                                                                                                                                     | —                                                                              | abil `berserk`/`raven` `AbilityAutoScout`; puc `AutoScout`/`AutoScoutCancel`                                                                                                                          |
| Free Kraken / Jormun Elver                       | Dock (automatic)                                                                        | Reaching Heroic gives 1 Kraken, reaching Mythic gives 1 Jormun Elver, at a Dock (a Dock is needed)                                                                                                                                                                                           | 1 each                                                                         | tt `HeroicAgeNorse`/`MythicAgeNorse` `CreateUnit` generator Dock                                                                                                                                      |

Generic actions that also apply to the Norse (confirmed, not detailed):

- train, build, research, age up;
- move workers between resources, garrison, Town Bell, Seek Shelter;
- Market buy/sell and Ox Caravan trade;
- god powers;
- the starting auto-queue: `mg` `startingqueue` auto-trains a **Gatherer** (VillagerNorse) for all three gods, Thor included.

Starting units:

- 3 Gatherers for Odin and Loki, 3 Dwarves for Thor;
- 1 Ox Cart (as the `OxCart` unit, delay 3 s);
- 1 Berserk.

Dropsites:

- Town and Village Centers take food, wood, gold and favor.
- The Dock takes food only.
- The Ox Cart takes food, wood and gold (proto unittypes).

## Odin

| Action (pt-BR / en)                         | Issuer    | What it does                                                                                                                                                                                                                                 | Numbers                                                                                                                   | Source                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Batedores Corvos / Raven scouts (automatic) | Temple    | The first Temple spawns 2 Ravens. After that, while a Temple stands and fewer than 2 Ravens are alive, 1 Raven is created at a Temple every 180 s. Ravens are flying scouts with 0 pop. Their commands are Patrol, Delete and Auto Scouting. | 2 at first; +1 per 180 s up to 2. Raven HP 30, regen 0.5/s, speed 4.0, LOS 16, +2 LOS per age (Classical, Heroic, Mythic) | tt `ArchaicAgeOdin` → `RavenFirstSpawn` (prereqs Temple>0, Raven<1; 2× `CreateUnit` at `AbstractTemple`) and `RavenRespawn` (`delay 180`, `MultipleActivation`, `DelayedFirstActivation`, prereqs Temple>0, Raven<2); tt `ClassicalAgeOdin`/`HeroicAgeOdin`/`MythicAgeOdin` LOS +2; proto `Raven`; string `STR_CIV_ODIN_LR` |
| Grande Caça / Great Hunt                    | god power | Already in `powers.json`                                                                                                                                                                                                                     | cooldown 90                                                                                                               | tt `ArchaicAgeOdin` GodPower                                                                                                                                                                                                                                                                                                |

Odin passives (no command):

- Hunting x1.1 for `EconomicUpgraded` (Gatherers and Dwarves).
- Human soldiers and healable heroes regenerate 0.4 HP/s.
- Combat favor x1.25 for Hersir, Jarl, Godi and Raiding Cavalry (`mg` `bountyreward`).
- Hamask (Berserk passive).

Odin has an Armory from Classical (`ClassicalAgeOdin` Enable Armory). The `OdinsRavens` object added to the Wonder is only decoration (`EmbellishmentClass`).

## Thor

| Action (pt-BR / en)                          | Issuer         | What it does                                                                                                                                                                                                                                                                                                                                                                                                              | Numbers                                                                                                             | Source                                                                                                                                                                                                                    |
| -------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Armaria de Anões / Dwarven Armory (research) | Dwarven Armory | Thor has **no Armory**. The Dwarven Armory can be built from the Archaic Age and researches every armory tech in **any age**: `ArchaicAgeThor` makes all of them obtainable, and only chain prereqs (Copper before Bronze, and so on) apply. It also has 3 extra techs: Dwarven Weapons, Meteoric Iron Armor and Dragonscale Shields. Hammer of Thunder is here too. Armory techs cost x0.9 (food, wood, gold and favor). | 135 wood, 40 build points. Research rate: 0.33 Archaic, 1.0 Classical (+0.67), 1.5 Heroic (+0.5), 2.0 Mythic (+0.5) | proto `DwarvenArmory` `researchrate 0.33`, `<tech>`; tt `ArchaicAgeThor` (Enable, TechStatus, Cost x0.90 `ArmoryTechnology`), `ClassicalAgeThor` 0.67 / `HeroicAgeThor` 0.5 / `MythicAgeThor` 0.5 `ResearchRate` Absolute |
| Anão grátis / Free Dwarf (automatic)         | Dwarven Armory | Each finished `ArmoryTechnology` (any of the 16 Dwarven Armory techs) creates 1 Dwarf at a Dwarven Armory. It does not fire for techs granted automatically.                                                                                                                                                                                                                                                              | 1 Dwarf per tech                                                                                                    | tt `ArchaicAgeThor` `SetOnTechResearchedTech` techtype `ArmoryTechnology` → `ThorDwarfSpawn` (`CreateUnit VillagerDwarf` generator `DwarvenArmory`, `InfiniteTech`, `IgnoreIfAutoActivated`)                              |
| Hersir favor (Hammer of Thunder)             | Hersir         | Hersir favor trickle x1.5                                                                                                                                                                                                                                                                                                                                                                                                 | 0.9/min                                                                                                             | tt `HammerOfThunder` (Gold 125, Favor 10; `AutoGather` Favor x1.5)                                                                                                                                                        |
| Mina Enânica / Dwarven Mine                  | god power      | Already in `powers.json`                                                                                                                                                                                                                                                                                                                                                                                                  | cooldown 120                                                                                                        | tt `ArchaicAgeThor` GodPower                                                                                                                                                                                              |

Thor passives:

- Starts with 3 Dwarves instead of Gatherers.
- Dwarves cost −10 gold (50).
- Dwarves gather hunt, herd, berries, farm and wood x1.25.

The Dwarf's Go Berserk cost (10 food + 30 gold) is unchanged for Thor.

## Loki

| Action (pt-BR / en)                                       | Issuer                       | What it does                                                                                                                                                                                                                                                                                                                                                                | Numbers                                                                  | Source                                                                                                                                                                                       |
| --------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vire Berserker / Go Berserk (cheaper)                     | Gatherer, Dwarf              | Same transform as the other gods, at half price                                                                                                                                                                                                                                                                                                                             | Gatherer 15 food + 10 gold; Dwarf 5 food + 15 gold                       | tt `ArchaicAgeLoki` Cost x0.5 BasePercent on `VillagerNorseToBerserk`/`VillagerDwarfToBerserk`                                                                                               |
| Carroça de Boi / Ox Cart (cheaper)                        | Gatherer, Dwarf              | Same Ox Cart, at half price                                                                                                                                                                                                                                                                                                                                                 | 20 food + 20 wood                                                        | tt `ArchaicAgeLoki` Cost x0.5 on `OxCartBuilding` (BasePercent) and `OxCart` (Percent)                                                                                                       |
| Construir / Build (faster)                                | infantry, Godi               | Build rate x1.1 against every `Building`. Applies to Berserk, Hirdman, Throwing Axeman, Huskarl, Hersir (all `AbstractInfantry`) and Godi; Gatherers and Dwarves do not get it.                                                                                                                                                                                             | +10%                                                                     | tt `ArchaicAgeLoki` `WorkRate` Build 1.1 on `AbstractInfantry` and `Godi`                                                                                                                    |
| Gerar unidades mitológicas / Spawn myth units (automatic) | Hersir, Godi, human soldiers | Damage to enemy **units** fills a meter. Buildings, myth units and huntables do not count. When the meter reaches the next myth unit's cost, a random myth unit spawns **at the damaged target**. The cost counts food + wood + gold, with favor x10. Kraken, Jormun Elver, Dryad and Maquizcoatl are never chosen. Tracking is `Single`, so there is one reward at a time. | contribution: Hersir 0.5, Godi 0.15, `HumanSoldier` 0.15 of damage dealt | mg Loki `<bonusunitspawning><damagegoal name="LokiSpawn">` (`contributor`, `rewardpointcost`, `excludedtarget`, `excludefromreward`, `spawnlocation DamageTarget`); string `STR_CIV_LOKI_LR` |
| Espião / Spy                                              | god power                    | Already in `powers.json`                                                                                                                                                                                                                                                                                                                                                    | cooldown 30                                                              | tt `ArchaicAgeLoki` GodPower                                                                                                                                                                 |

Loki passives:

- +10% bonus damage for Hersir and Godi against myth units.
- +10% bonus damage for Hirdman against cavalry, Throwing Axeman against infantry, and Huskarl and Raiding Cavalry against archers.

Loki has an Armory from Classical.

## Military-only abilities (`"buildOrder": false`)

Hero and berserk passives:

- **Hamask (Passive)**: Berserk, Odin. Moves and attacks faster as it loses HP.
- **Lifesteal (Passive)**: Berserk, from Berserkergang (Tyr).
- **Valhalla's Chosen (Passive)**: Berserk, from Call of Valhalla (Bragi).
- **Nature's Eyes (Passive)**: every Norse unit, from Eyes in the Forest (Loki).
- **Viking (Passive)**: Raiding Cavalry, from Vikings (Njord). Gives gold from damage dealt.

Ship passives:

- **Skaldic Inspiration**: Longboat, from Long Serpent (Bragi).
- **Skadi's Breath**: Dreki, from Arctic Winds (Skadi).

Myth units:

- **Heal**: Valkyrie (Freyja), heal rate 7.5, range 10.
- **Horn Blast**: Einheri (Heimdall).
- **Boulder Toss**: Troll (Forseti), 45 damage, area 1.5, range 14.
- **Buck**: Battle Boar (Bragi), 20 damage.
- **Frigid Breath**: Frost Giant (Skadi or Hel).
- **Bludgeon**: Mountain Giant (Njord or Hel), 400 damage against buildings.
  - It also has Dwarven Punt (100 damage).
  - Jotuns adds Punt (250 damage) and removes Dwarven Punt.
- **Fire Storm**: Fire Giant (Baldr or Hel), 15 damage, area 4.
- **Pack (Passive)**: Fenris Wolf Brood (Tyr), +10% per nearby wolf.
- **Throw / Capsize**: Kraken.
- **Wake of Destruction**: Jormun Elver.
- **Blazing Strafe**: Nidhogg (Hel's god power).

Hersir and Godi have no active ability. Their only abilities are Sacred Hands and Nature's Eyes (abil `hersir`, `godi`).

Sources:

- Abilities: abil (per unit) and `abilities/norse.abilities`.
- Numbers: proto protoactions.

The minor-god → major-god assignment comes from `src/data/gods/*.json`.

## Not settled

1. **Go Berserk and population.** Gatherer and Dwarf are pop 1; Berserk is pop 2. The files do not say whether the transform needs a free pop slot or can exceed the cap. Owner measurement needed.
2. **Free Dwarf and population.** Thor's free Dwarf (`CreateUnit`) and Odin's Ravens (pop 0) are created without a stated pop check. Whether the free Dwarf is blocked at the pop cap is unknown.
3. **Loki's myth unit spawn.**
   - The files do not say which myth units can come: age rules, or only the chosen minor gods' units.
   - They do not say what the meter starts at, or whether pop room is needed.
   - Shennong's goal has explicit `agerestricted`/`archaicspawn`/`nextageonly` flags; Loki's has none.
4. **Ox Cart herd claim.** `LogicalTypeConvertsHerds` probably claims herdables as a Town Center does. Not checked in game.
5. **Infantry on worker foundations.** Infantry have Build rate `Building` 1.0. They probably can help finish a Farm or Ox Cart foundation placed by a worker, but cannot place one. Not checked in game.
6. **Loki's build bonus scope in `loki.json`.** It is stored as "+10% on every building except House, Farm, Ox Cart". In the files the bonus is on the _builder_ (infantry and Godi), so infantry building a House also get +10%, and Gatherers or Dwarves building anything do not. This is the same limitation already listed in `norse/PENDING.md`.
7. **No short official name** for Auto Scouting, the free Dwarf, Raven scouts or Loki's spawn.
   - Auto Scouting is taken from the rollover `STR_PUC_AUTO_SCOUT`.
   - The free Dwarf, Raven scouts and Loki's spawn are taken from the god descriptions `STR_CIV_*_LR`.
