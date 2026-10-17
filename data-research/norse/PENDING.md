# Norse: pending / low-confidence

## Rules and schema questions for the owner

- [ ] **Thor `startExtras.units = { gatherer: 0, dwarf: 3 }`**: this assumes `startExtras.units` overrides the pantheon start counts and does not add to them. If the simulator adds them instead, Thor would start with 3 Gatherers and 3 Dwarves.
- [ ] **Any-of `requires`**: Frost Giant (Skadi or Hel), Mountain Giant (Njord or Hel) and Fire Giant (Baldr or Hel) only list the first minor in `requires`. Hel's `unlocks` includes them, but a strict `requires` check would block them for Hel.
- [ ] **Armory vs Dwarven Armory**: nothing stops Thor from building a normal `armory`, and `requires` cannot express "not Thor". The simulator should hide `armory` (and its techs) for Thor.
- [ ] **Thor's free Dwarf**: each research at the Dwarven Armory spawns 1 free Dwarf. This is not expressible, so a field like `spawnOnResearch` would be needed.
- [ ] **Dwarven Armory research speed** scales by age (x0.33 Archaic, x1 Classical, x1.5 Heroic, x2 Mythic). The base (Classical) time is stored.
- [ ] **Ox Cart** is modelled as a building with `dropsiteFor` all land sources. Confirm the simulator accepts a mobile dropsite as a building.
- [ ] **Odin's +25% Great Hall combat favor** is only in `meta.note`. A `favorRate` modifier would also boost the Hersir/Godi passive trickle.
- [ ] **Loki's build bonus** is modelled as `buildRate x1.1` scoped to builder tags `infantry`/`hero`. Confirm how the simulator applies a builder-scoped `buildRate`.
- [ ] **Not modelled**:
  - Gatherer/Dwarf to Berserk transformation (30 food + 20 gold or 10 food + 30 gold; Loki -50%).
  - Loki myth-unit spawning.
  - Vikings (gold from combat).
  - Call of Valhalla (favor on Berserk death).
  - Great Hunt and Dwarven Mine food/gold amounts.
  - Village Center's 25% slower worker training.

## Values with low or single-source confidence

- [ ] **Norse -10% wood on shared buildings** (wiki only; the analyzer shows generic values):
  - House 45 wood
  - Temple 135 wood + 150 gold
  - Dock 90 wood
  - Armory 135 wood
  - Market 135 wood (**low**: the Market page says -20%)
  - Sentry Tower 135 wood + 100 gold
  - Wonder kept at 5000 wood
  - Please measure in game.
- [ ] **Great Hall cost**: analyzer 135 wood vs wiki 160 wood (135 used).
- [ ] **Norse building times** (wiki): Temple 30 s, Dock 25 s, Longhouse 25 s, Great Hall 40 s, Hill Fort 135 s, Dwarven Armory 40 s, Armory 40 s, Market 40 s, Sentry Tower 60 s, House 15 s, Farm 10 s, Ox Cart 15 s, Town Center / Village Center 150 s.
- [ ] **Norse infantry build speed** is assumed equal to the base builder (`buildRate 1`). Not verified.
- [ ] **Gather rates** (wiki only, per minute):
  - Gatherer: hunt 54, herd 48.6, berries 37.8, farm 37.8, wood 54, gold 46.2.
  - Dwarf: hunt 42, herd 37.8, berries 29.4, farm 29.4, wood 42, gold 58.8.
  - Fishing Ship: fish 33.
- [ ] **Eco tech stacking**: unclear whether Bow Saw / Carpenters (+15% / +20%) and similar techs stack additively on base or compound. They are stored as `mul`.
- [ ] **Winter Harvest**: "+10% other food sources" is assumed to exclude fishing ships.
- [ ] **Watch Tower upgrade research time** (20 s, a pre-Retold value): **low**.
- [ ] **Kraken and Jormun Elver**: wiki only (cost, pop 4, 10 s train). Both are generic Norse Dock myth units in Retold.
- [ ] **Omniscience cost**: 100 gold x enemy population. Only the factor of 100 is stored.
- [ ] **Hersir/Godi passive favor** 0.6/min: wiki only.
- [ ] **Favor rule** (1 per 80 damage, decay from 100 to 300 down to x0.5): wiki only.
  - Other rates: ships 1/160, myth units 1/160, Odin Great Hall units 1/64, workers 1/20.
  - Target multipliers are in `favor.meta.note`.
- [ ] **Age-up costs, times and requirements** (wiki only):
  - Classical: 400 food, 60 s, Temple.
  - Heroic: 800 food + 500 gold, 75 s, Armory / Dwarven Armory / Market.
  - Mythic: 1200 food + 1200 gold, 120 s, Hill Fort.
- [ ] **God power costs and cooldowns**: wiki only.
- [ ] **pt-BR names**: all are translations by the research agent. The official Brazilian localization of AoM Retold was not found. Please check, in particular: Coletor, Anão, Carro de Boi, Berserker, Huscarlo, Cavalaria de Saque, Lançador de Machados, Casa Longa, Grande Salão, Forte da Colina, Arsenal Anão, Centro de Vila, the Levy/Conscript names, and the god power names (e.g. "Solapar" for Undermine, "Congelamento" for Frost).

## Icons

- [ ] 102 icon URLs point to `static.wikia.nocookie.net`. That CDN returns 403 to curl and urllib, so the icon pipeline may need a browser User-Agent or Referer. Each file was confirmed to exist through the wiki API, and a few were seen loading in a browser.
- [ ] `units/norse-dreki` uses the Kries file `dreki.png`. It is assumed to be the Norse Dreki icon, which was not checked visually.
- [ ] Generic (non-Norse) building art is used for Armory, Dock, House, Market, Temple, Sentry Tower and Wonder. The wiki has no Norse-specific icon for these.
- [ ] No icons for Ravens, Heroes of Ragnarok or Nidhogg (the unit). These are not in the database.
