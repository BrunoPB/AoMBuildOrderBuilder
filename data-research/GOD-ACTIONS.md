# Actions per major god

Research from the game files (build 19.17020), with the web as support. Full details, numbers and file references: `data-research/<pantheon>/ACTIONS.md` and `actions.json`.

Every god has the generic actions: train, build, research, age up, move villagers, god powers, auto queue, manual event. The table lists what changes per god.

| God          | Extra actions in the editor                                              | Passive rules the simulator applies                                                  | Not simulated (no economic effect or needs a map) |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Zeus**     | —                                                                        | Heroes in their own queue; +10 starting favor; Temple prayer +20%; myth units −1 pop | Hero abilities, relics                            |
| **Hades**    | —                                                                        | Heroes in their own queue; Vaults of Erebus (+105 gold/min); ranged techs ×0.666     | Shades from dead soldiers                         |
| **Poseidon** | —                                                                        | Heroes in their own queue; Stable and Market wood ×0.7                               | Free Hippocampus, militia from razed buildings    |
| **Ra**       | **Empower** (Pharaoh ×1.75; Priests at 60%)                              | Empowered TC speeds the age up; dropsite ×1.2; Monument favor ×1.2                   | Ra's Monument aura (Mandjet), Son of Osiris       |
| **Isis**     | **Empower** (Pharaoh)                                                    | Empowered Monument favor ×2                                                          | Monument god-power shield, healing                |
| **Set**      | **Empower** (Pharaoh), **Summon animal** (favor; optional hunt for food) | Free animals on age ups                                                              | Priest converting wild animals                    |
| **Odin**     | **Turn into Berserk**                                                    | Builders: infantry only for most buildings                                           | Ravens (scouting)                                 |
| **Thor**     | **Turn into Berserk**                                                    | No Armory; free Dwarf per Dwarven Armory research; starts with Dwarves               | Dwarven Armory speed per age                      |
| **Loki**     | **Turn into Berserk** (−50%)                                             | Infantry builds 10% faster                                                           | Myth units spawned by combat                      |
| **Kronos**   | **Promote to hero**, **Time Shift** (12 buildings, 2 at once)            | Manor build bonus (+25% per Manor nearby); 2 free myth units per age                 | Deconstruction only affects enemy buildings       |
| **Oranos**   | **Promote to hero**                                                      | Oracle favor bonus                                                                   | Sky Passage teleport (needs a map)                |
| **Gaia**     | **Promote to hero** (Citizen −25%)                                       | Starts with Citizen heroes; Economic Guild techs earlier and cheaper                 | Gaia Forest as a wood source, Lush                |
