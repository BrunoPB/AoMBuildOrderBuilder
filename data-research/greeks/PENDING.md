# Greeks: pending / not answered by the game files

Reconciled against the installed game (build 19.17020) on 2026-10-18. Everything below is either not defined in the files or not expressible in the schema.

## Not defined in the files (owner check in game)

- [ ] **First god-power cast.** The age tech grants each power with `GodPower amount 1` plus a cooldown; the file `<cost>` / `<repeatcost>` are the favor cost and per-recast ramp. The files do not say whether the first cast is free. The engine charges `cost` on every cast, including the first.
- [ ] **Free Scylla / Carcinos without a Dock.** `HeroicAgeGreek` / `MythicAgeGreek` run `CreateUnit Scylla|Carcinos generator=Dock`. Presumably nothing spawns without a Dock; not modelled (the engine would spawn it unconditionally if it were put in `freeUnitsOnAgeUp`).
- [ ] **Which builder counts as "first"** with mixed builders (generic, see game-files-findings).

## Not expressible in the current schema (in notes; simulator must special-case)

- [ ] Hero train time drops ×0.9 in each of Classical, Heroic, Mythic (`HeroShadowUpgraded`). `trainTime` is the value in the unlock age; per-age values are in each hero's `fieldMeta.trainTime`.
- [ ] Village Center `trainingrate` 0.75 (villagers take 1.33× as long there). No per-building train modifier.
- [ ] Deimos' Sword of Dread (Ares) enables the Hypaspist in the Classical Age (requires is AND-only; unit kept at heroic).
- [ ] Argonauts creates one free Argo at a Dock (researches have no spawn). The Argo has buildlimit 1.
- [ ] Winged Messenger (Hermes): extra respawning Pegasus (`PegasusWingedMessenger`).
- [ ] Argive Patronage (Hera, Zeus only): Fortress Maintain action, one Myrmidon per 60 train points.
- [ ] Hippocampus (Poseidon) respawns at a Dock; Militia partisans; Shades of Hades (20%, 10 s). Listed with `trainedAt: []`; their proto cost is shown but never paid.
- [ ] Lure: chickens (100 food each, 3/4/6/10 per age) and the lured-food cap 1200/1300/1500/1900; there is no chicken unit id.
- [ ] Carry-capacity bonuses (Husbandry, axes/picks, Salt Amphora, Divine Blood). No carry target.
- [ ] Omniscience: dynamic cost (100 gold per enemy unit); `cost` left empty.
- [ ] Research `at` holds one building. Alternatives are listed in the buildings' `researches` (Golden Apples at Village Center/Temple, Divine Blood/Masons/Architects at the Village Center, Athena/Ares/Apollo/Artemis techs at the Armory, Phobos' Spear at the Stable, Chthonic Rites at the Dock, Olympian Parentage at the Fortress).
- [ ] Wonder favor trickle (60/min) gets the unscoped Zeus `favorRate` ×1.2 in the simulator; in game Zeus only boosts Temple prayer.

## Names

- Official string-table names are used everywhere, including suffixes ("Jason (Hero)" / "Jasão (Herói)", "The Argo (Hero)" / "O Argo (Herói)"). Some official pt-BR names differ from common usage: Hércules (Herói), Perseus (Herói), Hippeis, Gastrafeta, Penteconter.
- `plural` added only for the Fishing Ship (pt "Navios Pesqueiros", en "Fishing Ships" from the string table). The generic pluralizer only pluralizes the first word, so English multi-word names (Transport Ship, Donkey Caravan, Nemean Lion, Sentry Tower...) come out wrong; that is an i18n issue, not data.

## Icons (unchanged)

- [ ] Kries files with an ambiguous subject (sentinel, lure, bolt, curse, carcinos, some buildings) and the 115 wiki URLs verified only in a browser (curl gets 403). See `icons.json`.
