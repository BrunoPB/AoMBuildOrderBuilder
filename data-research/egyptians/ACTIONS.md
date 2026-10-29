# Egyptians — player actions per major god

Checked 2026-10-29 against the installed game files, build 19.17020. The extracted copy is in the session scratchpad, at `gf\gameplay\…` and `strings\…`, plus `strings\string_replacement_values.xml` from `Data.bar`. Data: `actions.json` in this folder.
Web sources were used only to find and understand actions (marked **[web]**). Every number comes from the files.

## Shared by Ra, Isis and Set

### Pharaoh — Fortalecer / Empower (`pharaoh-empower`)

| Item               | Value                                                                                                                                                                                                     | Source                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Issuer             | Pharaoh; also Pharaoh (New Kingdom) and Son of Osiris                                                                                                                                                     | `abilities\abilities.xml` `<pharaoh>`, `<pharaohnewkingdom>`, `<sonofosiris>` → `AbilityEmpower` (`noautocast`) |
| Name               | pt-BR "Fortalecer", en "Empower"                                                                                                                                                                          | `STR_ABILITY_EMPOWER` / `STR_ACTION_EMPOWER`                                                                    |
| Range              | 3                                                                                                                                                                                                         | `tactics\pharaoh.tactics` Empower `<maxrange>3`                                                                 |
| Cost / cooldown    | none                                                                                                                                                                                                      | —                                                                                                               |
| Buildings at once  | 1 per empowerer. It is a continuous unit action, so the Pharaoh must stay on the building. **The files have no duration.**                                                                                | engine behaviour; tutorial `STR_TUT_EGYPTIANS_CHAT_03`                                                          |
| Allied buildings   | yes                                                                                                                                                                                                       | `egyptian.abilities` AbilityEmpower `<placement ally="">`                                                       |
| Targets (full set) | Town Center, Village Center (and Citadel Center), House, Granary, Mining Camp, Lumber Camp, Temple, Dock, Sentry Tower, Armory, Market, Wonder, the 5 Monuments, Barracks, Migdol Stronghold, Siege Works | `proto.xml` unittype `LogicalTypeBuildingThatCanBeEmpowered`                                                    |
| Targets (LOS set)  | Obelisk, Lighthouse                                                                                                                                                                                       | `proto.xml` unittype `LogicalTypeBuildingEmpoweredForLOS`                                                       |
| Not targets        | Farm, Walls                                                                                                                                                                                               | absent from both lists                                                                                          |

What each multiplier from `pharaoh.tactics <empowerdata>` does:

| Modify type          | Pharaoh | Applies to                                                                                    | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BuildRate            | ×1.75   | all targets; also a TC foundation on a Settlement (`<natureempowerdata><abstractsettlement>`) | foundation builds 1.75× faster (build time ×0.571)                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ResearchRate         | ×1.75   | all targets                                                                                   | researches and age-ups in that building ×0.571 time                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| MilitaryTrainingRate | ×1.75   | full set                                                                                      | **military units only** (`MilitaryUnit`: Priest, Mercenaries, soldiers, siege, warships, myth units). **Laborers, Fishing Ships and Camel Caravans (`EconomicUnit`) are not sped up.** The engine has separate "Training Rate (Economic)" and "(Military)" strings (`STR_GAME_EMPOWER_TRAINING_RATE_ECONOMIC_*`), and the tutorial says "Empowered buildings train military units … faster" (`STR_TUT_EGYPTIANS_CHAT_04`). The Transport Ship has neither type (assumed not sped up). |
| DropsiteRate         | ×1.20   | full set (only matters on dropsites)                                                          | +20% on resources dropped at the building. The tutorial (`STR_TUT_EGYPTIANS_CHAT_05`) names the droppers: Laborers, Fishing Ships, Camel Caravans. TC/VC: all land resources; Granary: food; Mining Camp: gold; Lumber Camp: wood; Dock: fish; Market: caravan gold.                                                                                                                                                                                                                  |
| FavorGatherRate      | ×1.20   | Monuments                                                                                     | Monument favor/min ×1.2                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ROF                  | ×0.75   | full set                                                                                      | attack interval −25% (TC, towers): military                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| LOSFactor            | ×1.75   | Obelisk, Lighthouse                                                                           | line of sight                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| GodPowerBlockRadius  | ×2.0    | Monuments                                                                                     | only matters for Isis (25 → 50)                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Barracks and Migdol Strongholds also match `<logicaltypeaffectedbyvalleyofthekings>` (Build/Research/MilitaryTraining ×1.75, ROF 0.75). Without Valley of the Kings this is identical to the full set.

Related rules:

- **Pharaoh spawn:** free at a TC 2 s after the start (`techtree.xml` PharaohFirstSpawn `delay 2`). If he dies he respawns free after 90 s (PharaohRespawn `delay 90`, needs a TC).
- **New Kingdom** (Osiris: Ra and Isis; 150 Gold, 20 Favor, 30 s): a second Pharaoh with the same empower, so 2 buildings at once. `NewKingdomPharaohRespawn` has `delay 90` but no `DelayedFirstActivation`, so he probably appears when the research ends (medium confidence). He respawns 90 s after dying.
- **Valley of the Kings** (Thoth: Isis and Set; 500 Gold, 40 Favor, 20 s, Migdol) → `EmpowerModify` on the Valley section of the empowerer:
  - `DoubleTrainChance` = 1.0 (Assign): every unit trained at a Pharaoh-empowered Barracks or Migdol spawns a second one.
  - `MilitaryTrainingRate` ×0.4 (BasePercent): 1.75 × 0.4 = **0.70**. Each batch is slower than in an unempowered building, but makes 2 units, so output is 1.4× instead of 1.75×.
  - Priests have no Valley section, so it only works with a Pharaoh or Son of Osiris.
  - **Conflict:** `src/data/pantheons/egyptians.json` says "+40% military training rate", but the file value is ×0.4 (see Open questions).
- **Son of Osiris** (Osiris god power, Ra and Isis; `son_of_osiris.tactics`): the Pharaoh is transformed and empowers at ×1.90 Build/Research/MilitaryTraining, ×1.24 Dropsite/Favor, ROF 0.75, LOS 1.9, GodPowerBlock ×2.4 (`son-of-osiris-empower`).

### Other shared actions (generic, not detailed)

- Train, build, research, age up, god powers, auto queue (every god starts with an autotrain Laborer queue, `major_gods.xml <startingqueue>`).
- Priests build Obelisks (`proto.xml` Priest `<train>Obelisk`, `Build rate Obelisk`).
- Temple UI shortcuts "send priest" / "send priest to build" (`MoveNearbyPriestToUnit`, `MoveNearbyPriestToBuild` in `proto_unit_commands.xml`): convenience only, not new actions. **[web]** a forum bug report says selected Pharaohs and Priests auto-empower a foundation when started with Laborers (UI behaviour).
- `buildOrder: false`:
  - Pharaoh Heal: 10 HP/s, range 10. Priest Heal: 7.5 HP/s.
  - Relic pickup ("Mãos Sagradas"): Pharaoh always; Priests after Hands of the Pharaoh.
  - Myth unit abilities: Sphinx Whirlwind, Anubite Jump, Scarab Causticity, Petsuchos Illuminate, Roc Land/Fly, Scorpion Man Sting, Mummy Reincarnation, Avenger Spin, War Turtle Buck, Phoenix Rebirth.
  - Ship and Mercenary passives.

## Ra

| id                      | pt-BR / en                            | Issuer                                               | What it does                                                                                                                                                                                             | Numbers                                                                                                                                | Source                                                                                                                                                                                                                             |
| ----------------------- | ------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pharaoh-empower`       | Fortalecer / Empower                  | Pharaoh                                              | see above                                                                                                                                                                                                | ×1.75 / ×1.2                                                                                                                           | `pharaoh.tactics`                                                                                                                                                                                                                  |
| `priest-empower`        | Fortalecer / Empower                  | Priest                                               | Ra only. Same targets and rules as the Pharaoh at 60% strength. Every Priest is one more empowerer (the game starts with 1 Priest; 100 Gold, 2 pop, 10 s each).                                          | Build/Research/MilitaryTraining ×1.45, Dropsite ×1.12, Favor ×1.12, ROF 0.85, LOS ×1.45; range 3. No Valley section, no GodPowerBlock. | `priest.tactics` Empower (`active 0`); `techtree.xml` ArchaicAgeRa `ActionEnable Empower` on Priest; `abilities.xml <priest>` AbilityEmpower `tech ArchaicAgeRa`; `RA_PHARAOH_EFFICIENCY` 60                                       |
| `monument-empower-aura` | Mandjet (Passivo) / Mandjet (Passive) | Pharaoh (the click is "Pharaoh empowers a Monument") | While a **Pharaoh** (not a Priest) empowers a Monument, that Monument empowers every empowerable building within 30 at Priest strength, **foundations included**. Several Monuments' auras do not stack. | range 30; ×1.45 / ×1.12 / ROF 0.85                                                                                                     | `monument.tactics` MonumentEmpowerAura (`maxrange 30`, `restrictifempowered 1`, `restrictempowertype AbstractPharaoh`, `nostack 1`, `includeunbuilt 1`); ArchaicAgeRa `ActionEnable MonumentEmpowerAura`; `STR_ABILITY_MANDJET_LR` |
| `son-of-osiris-empower` | Fortalecer / Empower                  | Son of Osiris                                        | after the Son of Osiris power                                                                                                                                                                            | ×1.90 / ×1.24                                                                                                                          | `son_of_osiris.tactics`                                                                                                                                                                                                            |
| `pharaoh-new-kingdom`   | —                                     | —                                                    | second Pharaoh via New Kingdom (Osiris)                                                                                                                                                                  | —                                                                                                                                      | techtree NewKingdom                                                                                                                                                                                                                |

**[web]** A patch note mentions 70% Priest/Monument efficiency. The installed files say 1.45 (60%) and the civ text says 60%, so the files win.

## Isis

Isis has no click action of her own. Her differences are in the Pharaoh empower:

| What                                            | Numbers                                                                                                                 | Source                                                                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Empowered Monument favor                        | FavorGatherRate ×1.667 (BasePercent) on the empowerer, so 1.2 → **2.0** (civ text "+100%"). Son of Osiris: 1.24 → 2.07. | `techtree.xml` ArchaicAgeIsis `EmpowerModify … FavorGatherRate 1.667 BasePercent`; `ISIS_FAVOR_GEN_SPEED` 100                                                |
| Divine Shield (Escudo Divino, passive)          | Monuments block enemy god powers within 25; ×2 → 50 when empowered                                                      | ArchaicAgeIsis `GodPowerBlockRadius 25`; `pharaoh.tactics GodPowerBlockRadius 2.0`                                                                           |
| Monument heal (part of Divine Shield)           | AreaHeal 1 HP/s, range 50, only while the Monument is empowered                                                         | `monument.tactics` AreaHeal (`restrictifempowered 1`); `proto.xml` Monument AreaHeal `modifyamount 1`, `maxrange 50`; ArchaicAgeIsis `ActionEnable AreaHeal` |
| Valley of the Kings, New Kingdom, Son of Osiris | Isis has both Osiris and Thoth                                                                                          | `minor_gods` data                                                                                                                                            |

Other Isis bonuses (−10% research cost, cheaper/faster Obelisks, +5 TC pop) are already god modifiers, not actions.

## Set

| id                           | pt-BR / en                              | Issuer  | Age       | Favor | Pop | Time (s) | Food if hunted | Source                                                                                                                                             |
| ---------------------------- | --------------------------------------- | ------- | --------- | ----- | --- | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `summon-baboon-of-set`       | Babuíno de Set / Baboon of Set          | Pharaoh | Archaic   | 3     | 1   | 3        | 93.75          | ArchaicAgeSet `Enable` + `CommandAdd proto=BaboonOfSet` on Pharaoh/PharaohNewKingdom; `proto.xml` cost/trainpoints/populationcount/initialresource |
| `summon-hyena-of-set`        | Hiena de Set / Hyena of Set             | Pharaoh | Classical | 4     | 1   | 4        | 93.75          | ClassicalAgeSet `Enable HyenaOfSet`                                                                                                                |
| `summon-gazelle-of-set`      | Gazela de Set / Gazelle of Set          | Pharaoh | Classical | 3     | 1   | 3        | 150            | ClassicalAgeSet                                                                                                                                    |
| `summon-giraffe-of-set`      | Girafa de Set / Giraffe of Set          | Pharaoh | Heroic    | 5     | 1   | 4        | 300            | HeroicAgeSet                                                                                                                                       |
| `summon-crocodile-of-set`    | Crocodilo de Set / Crocodile of Set     | Pharaoh | Heroic    | 6     | 1   | 4        | 187.5          | HeroicAgeSet                                                                                                                                       |
| `summon-hippopotamus-of-set` | Hipopótamo de Set / Hippopotamus of Set | Pharaoh | Mythic    | 7     | 2   | 6        | 375            | MythicAgeSet                                                                                                                                       |
| `summon-rhinoceros-of-set`   | Rinoceronte de Set / Rhinoceros of Set  | Pharaoh | Mythic    | 9     | 2   | 6        | 487.5          | MythicAgeSet                                                                                                                                       |
| `summon-elephant-of-set`     | Elefante de Set / Elephant of Set       | Pharaoh | Mythic    | 14    | 2   | 8        | 675            | MythicAgeSet                                                                                                                                       |

Summoning:

- The buttons are added to both Pharaohs (`CommandAdd proto=…`, rows 1–2). The group name is "Animais de Set" / "Animals of Set" (`STR_GRM_PHARAOH_SET_ANIMALS`).
- Favor only, no cooldown, no limit in the files (pop-limited).
- **[web]** The Pharaoh can keep moving and empowering while he summons (AoM wiki; not checked in Retold).
- Animals of Set are `Huntable` with `DieAtZeroResources` / `DoNotDieAtZeroHitpoints`, so a killed animal leaves its Food. Summon and hunt turns Favor into Food: Gazelle 50 Food/Favor, Giraffe 60, Elephant ~48.
- Free animals on age-up, spawned at a Temple:
  - Classical: 1 Hyena + 2 Gazelles.
  - Heroic: 1 Crocodile + 2 Giraffes.
  - Mythic: 1 Rhinoceros + 2 Hippopotamuses.
  - Source: `ClassicalAgeSet` / `HeroicAgeSet` / `MythicAgeSet` `CreateUnit generator=AbstractTemple`.
- Set starts with 1 Baboon (`major_gods.xml`).

### Priest — Converter Animal / Convert Animal (`priest-convert-animal`)

- **Who:** Set only. `techtree.xml` ArchaicAgeSet `ActionEnable Convert` on Priest; `abilities.xml <priest>` AbilityConvertAnimal `tech ArchaicAgeSet`.
- **Range:** 10 (`proto.xml` Priest protoaction Convert `maxrange 10`).
- **Targets:** wild animals owned by Gaia that are `Huntable` (`egyptian.abilities` `placement natureonly`, `abstractplacementtargettype Huntable`). This includes predators (Wolf, Lion, Bear, Hyena, Crocodile…). Not Chickens (not Huntable) and not herdables.
- **Result** (`conversionprotoid` → `<Animal>OfSet`):
  - Food is 75% of the wild animal's (`SET_CONVERT_FOOD_LOSS` 25). Examples: Deer/Gazelle/Elk/Caribou 200 → 150, Boar 400 → 300, Aurochs/Hippo/Water Buffalo/Walrus 500 → 375, Rhino 650 → 487.5, Elephant 900 → 675.
  - HP also ×0.75.
  - It takes population: 1, or 2 for Boar, Aurochs, Elephant, Hippo, Rhino, Walrus, Water Buffalo.
  - Prey animals become faster (2.2 → 4.0).
  - It can be walked to a dropsite and then hunted by your Laborers. This matters for build orders.
- **Per-species `rate`/`minrate`:** Deer 35, Gazelle 35, Boar 50, Aurochs 60, Giraffe 55, Hippo 65, Rhino 80, Elephant 105, Zebra 40, Baboon/Hyena/Lion/Monkey 27.5, Wolf 30, Bear 40. The unit is not defined in the files, so the conversion duration is unknown.

### Passive Set bonus (not an action)

- "Devotos (Passivo)" / "Devotees (Passive)": −10% unit cost in Barracks/Migdol within 20 of a Monument. Empowering the Monument does not change it (`empoweredmodifymultiplier 0.90`). Already a god modifier.

## Military-only (single line)

Heal (Pharaoh 10 HP/s, Priest 7.5 HP/s, range 10), relic pickup, Ra/Isis/Set myth unit abilities (Whirlwind, Jump, Causticity, Illuminate, Land/Fly, Sting, Reincarnation, Spin, Buck, Rebirth), ship passives (Apep's Spawn, Call of Lotan), Mercenary Sellsword, empowered tower/TC ROF ×0.75, Isis Monument shield/heal.

## Open questions

1. **Valley of the Kings:**
   - Is the second unit free?
   - Is `BasePercent 0.4` really ×0.4 (giving 0.70)? The Isis case, 1.2 × 1.667 = 2.0 = "+100%", supports a plain multiplier.
   - `src/data/pantheons/egyptians.json` (valley-of-the-kings note) says "+40%", which conflicts with the file value.
2. **Stacking:** a building that is empowered directly and is also inside a Ra Monument aura, or is empowered by a Pharaoh and a Priest at once. The files do not say; assume the strongest effect only.
3. **Convert:** the unit of the convert `rate` (seconds? points/s?), and whether conversion needs free population.
4. **New Kingdom:** does the second Pharaoh appear instantly or after 90 s?
5. **Summoning while empowering** in Retold (only the legacy wiki says so).
6. **Transport Ship:** is it sped up by MilitaryTrainingRate? It has no MilitaryUnit/EconomicUnit type.
7. **Empower duration:** does the effect stop as soon as the empowerer leaves range 3? This is engine behaviour, not a file value.

## Web sources consulted

- GamesFuze guides (Valley of the Kings "100% double train"; Set/Ra build orders using Pharaoh + Priest empower): https://gamesfuze.com/guides/age-of-mythology-retold-best-new-technologies-guide/
- Age of Empires forum "Pharaoh/priest empowerment bug" (auto-empower of foundations): https://forums.ageofempires.com/t/pharaoh-priest-empowerment-bug/277741
- AoE wiki (Giraffe of Set / Set pages; summoning while moving or empowering, legacy): https://ageofempires.fandom.com/wiki/Giraffe_of_Set
- aomr-analyzer Egyptian page (no empower details): https://aomr-analyzer.com/frise/civ/egyptian
