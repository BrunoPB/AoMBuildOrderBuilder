# Norse: pending

All values were checked against the game files (build 19.17020) on 2026-10-18. What is left is behaviour the files define but the schema or simulator cannot express, plus a few things the files do not say.

## The files define it, but the data cannot express it

- [ ] **Who builds what.**
  - Gatherers and Dwarves can only build House, Farm and Ox Cart (proto `Build` and `train` lists).
  - Infantry and heroes build everything else, but not Farms or Ox Carts.
  - The schema has only `canBuild`, so the simulator lets a Gatherer build a Temple (the Thor example fixture does this).
- [ ] **Loki's +10% build speed** applies to AbstractInfantry and Godi builders. The simulator scopes `buildRate` by building, so it is stored as +10% on every building except House, Farm and Ox Cart.
- [ ] **Armory for Thor.** Only `ClassicalAgeOdin` and `ClassicalAgeLoki` enable the Armory. `requires` cannot express "Odin or Loki", so the simulator should hide `armory` (and its techs) for Thor.
- [ ] **Dwarven Armory research speed** depends on the age:
  - Research rate: x0.33 Archaic, x1.0 Classical, x1.5 Heroic, x2.0 Mythic.
  - The stored times are at x1.0.
- [ ] **Thor's free Dwarf** (`ThorDwarfSpawn`): 1 Dwarf at the Dwarven Armory per ArmoryTechnology researched.
- [ ] **Free Kraken and Jormun Elver.** HeroicAgeNorse and MythicAgeNorse create one at a Dock (`generator=Dock`) for every Norse god. They are not in `freeUnitsOnAgeUp`, because that would spawn them without a Dock.
- [ ] **Godi in Classical with Freyja.** Sessrumnir has `Enable Godi`. The unit has a single `age` (heroic).
- [ ] **One research in several buildings.** Each has a single `at`:
  - Medium/Heavy/Champion Infantry: also at the Hill Fort.
  - Hammer of Thunder: also at the Great Hall.
  - Hall of Thanes: also at the Great Hall.
  - Masons, Architects, Rigsthula and the age-ups: also at Village Centers.
- [ ] **Village Center** `trainingrate 0.75` (workers train 25% slower there).
- [ ] **Starting auto-queue.** major_gods.xml `startingqueue` auto-trains a Gatherer (VillagerNorse) at the start for Odin, Thor and Loki (likely the same for every civ). Not modelled.
- [ ] **Odin's x1.25 combat favor** for Hersir, Jarl, Godi and Raiding Cavalry (1 per 64 damage) is only in notes. A `favorRate` modifier would also change their trickle.
- [ ] **Not modelled:**
  - Gatherer/Dwarf to Berserk transform: 30 food + 20 gold / 10 food + 30 gold, instant; Loki -50%.
  - Loki's myth unit spawning (`bonusunitspawning`).
  - Vikings: 10 gold per 80 damage.
  - Call of Valhalla: ResourceReturn Favor 0.5.
  - Great Hunt food: 500 / 600 / 1200 / 2100.
  - Dwarven Mine gold: 500 / 1000 / 3000 / 6000, gathered x1 / x1.1 / x1.25 / x1.5.

## The files do not say

- [ ] **First cast of a god power.** Whether it is free is not stated (godpowers has `cost` and `repeatcost` only). The data stores `cost` as the godpowers `<cost>`.
- [ ] **Call of Valhalla:** how much favor a dying Berserk gives (`ResourceReturn` Favor 0.5 Assign: 0.5 favor flat or 50% of its cost?).

## Names

- [ ] **English plurals.** The default pluralizer only changes the first word, so it gives "Throwings Axeman", "Raidings Cavalry", "Fishings Ship". The string tables have no plurals, so none were added for English (pt-BR plurals were added where grammar needs them).

## Icons (unchanged)

- [ ] 102 icon URLs point to `static.wikia.nocookie.net`. That CDN returns 403 to curl and urllib, so the icon pipeline may need a browser User-Agent or Referer.
- [ ] `units/norse-dreki` uses the Kries file `dreki.png`. It is assumed to be the Norse Dreki and was not checked visually.
- [ ] Generic building art is used for Armory, Dock, House, Market, Temple, Sentry Tower and Wonder.
- [ ] No icons for Ravens, Heroes of Ragnarok or Nidhogg (the unit). These are not in the database.
