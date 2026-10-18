# Pending

Values with `confidence: "low"`, missing data and rules the simulator does not model yet. `npm run check-data` lists the low-confidence values from the data itself.

Per-pantheon checklists: [atlanteans](atlanteans/PENDING.md) · [greeks](greeks/PENDING.md) · [egyptians](egyptians/PENDING.md) · [norse](norse/PENDING.md).

Answers taken from the game files (build 19.17020) are written up in [game-files-findings.md](game-files-findings.md).

## Open questions for the owner (SPEC 18 + research)

- [ ] Citizen train time: the game files say 28 s, the Krush measurement shows a 30 s rhythm. The data keeps 28 s; the Krush preset uses `autoQueueDelay: 2`. Is there a pause between auto-queued units in game?
- [ ] Do the bonuses of several Kronos Manors stack on the same building?

- [x] Population counts when the unit leaves the building; a finished unit waits inside while the population is full (owner). Default `popReservedAt: "end"`.
- [x] Oracle hero promotion cost: game files confirm 30 food + 45 gold + 1 favor, 7 s (`OracleToHero`, techtree.xml). All other promotion costs in the data also match the files. The Krush timing gap must come from something else (e.g. the unit stops working for the 7 s, or promotions made while the unit keeps gathering).
- [ ] Deconstruction: first cast free, then 10 favor (+10 per reuse), 180 s cooldown. Time Shift: no favor cost or cooldown (50% resource cost for towers/Palace/Mirror Tower).
- [ ] Average real Oracle favor rate in a match (default 2.0/min per Oracle). Game formula: 0.6/min (no LOS bonus) to 3.41/min (full 25 LOS bonus), see findings.
- [x] Typical hunt near the base: owner estimate 1200 (`hunt.defaultAmount`).
- [ ] Final list of standard builds (presets).
- [x] Greek favor cap: owner confirms none in Retold. The game files define no favor cap for any culture.
- [ ] Do Egyptians, Norse and Atlanteans have a favor cap (aomr-analyzer: 200)? Game files and wiki say none, so no `favorCap` is set. Check in game: does favor stop at 200?
- [x] 1v1 matches start with 4 Sentry Towers (owner; the random map scripts place 4 `SentryTower` per player at 26 m). Added to every pantheon's `start.buildings`.
- [x] Gather techs: the game uses relativity `BasePercent` (additive on the base, +10% +10% +10% = +30%). Converted to `op: "pct"`.
- [x] Promotion: villagers stop working for the 7 s; Oracles keep producing favor but stop walking (owner). Modelled.
- [x] Wooden Gate: 15 build points in proto.xml (WallGate).

## Krush calibration (known gap)

- [ ] With the researched data the model cannot feed the auto-queued Citizens and five Prometheans at the same time: by 6:20 it trains 3 Prometheans (measured 5) and 7 Turmas (measured 8). Citizens, Counter-Barracks, Manors and both ages match within ±10 s. Preset settings: efficiency 1.0, hunt 2000, Oracle 1.6 favor/min (Oracles explore early). Real food income in that match was higher than the model's.

## Not modelled yet (needs schema or engine work)

- [x] Multiple builders (engine applies it): the game uses `buildingefficiency` 0.6 (2nd builder) and `extrabuildingefficiency` 0.3 (each further builder), major_gods.xml, same for all 12 gods. Builders are sorted by rate; the fastest counts fully.
- [ ] Kronos Manor bonus stacking per Manor in range.
- [ ] Egyptian Pharaoh/Priest empower (×1.75 build/research/train, ×1.2 monument favor), Isis/Set monument auras.
- [x] Resource trickles: Hersir/Godi (`trickle.favor` 0.6) and Plenty (`effect.trickle` 210 food/wood/gold per min, permanent).
- [x] Vaults of Erebus (+1.75 gold/s = 105/min) and Flood of the Nile (+1.0 food/s = 60/min) are **techs** (`ResourceTrickleRate` on the player), not god powers. Now `Research.trickle`.
- [x] Favor trickles get `favorRate` modifiers scoped to their unit/building (Hammer of Thunder: Hersir favor ×1.5 BasePercent = 0.9/min).
- [x] Scoped `favorRate` modifiers (ids: oracle, hersir, monuments) are applied by the engine with an empty context, so they never match: Necropolis, Eclipse, Perception, Prophetic Sight, Oranos, Sons of the Sun, Hammer of Thunder now apply per Oracle / Monument / unit.
- [x] Heart of the Titans: `promotionTime` modifier ×0.25.
- [ ] Atlantean Citizens build Town/Village Centers at 1.25 instead of 1.5; handled by scaling those two buildTimes to 180 (Citizen 120 s). A per-building build rate would be cleaner.
- [ ] Carry capacity and dropsite distance (covered by `efficiency`).
- [x] Zeus myth units −1 pop: `pop` add −1 modifier on Zeus (tags myth).
- [ ] Per-age hero train time for Greeks.
- [ ] Thor: Dwarven Armory replaces the Armory; free Dwarf per Dwarven Armory tech.
- [ ] Norse infantry building (only gatherers/dwarves build in the simulator). Files: Norse infantry/heroes build at rate 1.0; Gatherers/Dwarves can only build Farm, House and Ox Cart.
- [ ] Loki: Berserk promotion (Gatherer/Dwarf → Berserk) costs −50%; Poseidon's Secret −10% on Turma/Contarius promotions. Promotions of Norse workers are not modelled.
- [ ] Set's Animals of Set (summoned by the Pharaoh) and free Leviathan/War Turtle.
- [x] Favor caps: none in the game files (see open question above).
- [ ] Hunt decay (12 food/min once killed).
- [ ] 47 icons are placeholders (see `npm run check-data`).
