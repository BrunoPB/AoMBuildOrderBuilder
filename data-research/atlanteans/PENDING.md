# Atlanteans + sources — pending / low-confidence values

## Most relevant for an early Atlantean build

- [ ] **Citizen build speed.** All `buildTime` values are wiki _base_ times (Citizen `buildRate` 1). The wiki says Citizens build +50% faster (Town Centers +25%), which would give Manor 16.66 s, Temple 26.67 s, Economic Guild 10 s, Counter-Barracks 16.67 s, Military Barracks 20 s, Armory/Market 26.67 s, Dock 20 s, Farm 6.67 s, Palace 76.67 s, Town/Village Center 120 s. The measured Counter-Barracks (25 s) matches the base time. Please measure one more building (e.g. Manor or Temple) with one Citizen.
- [ ] **Manor build time** 25 s (base; owner ⚠ and wiki base agree). With Citizen bonus it would be 16.66 s.
- [ ] **Temple build time** 40 s (base; owner ⚠ and wiki agree). Citizen: 26.67 s.
- [ ] **Armory build time** 40 s (base, wiki). Citizen: 26.67 s.
- [ ] **Economic Guild** 15 s (base, wiki; 10 s with Citizen).
- [ ] **Hunt amount** `hunt.defaultAmount` = 1400 (≈7 Deer × 200). Low confidence: depends on the map (4 Aurochs = 2000; 2-3 Deer + 2-3 Boar ≈ 1300-1700). Decay (12 food/min after the kill) is not modelled.
- [ ] **Herd amount** = 1000 (4-7 Chickens × 100 + 2-4 Goats/Pigs/Cows that fatten 50→300). Low confidence.
- [ ] **Berries** = 750 (5 bushes × 150). Medium: 4-6 bushes typical.
- [ ] **Oracle favor default** 2.0/min per Oracle (range 0.6-3.4). Real value depends on idle time and LOS overlap.
- [ ] **Gaia `startExtras`** uses `{ citizen: 0, citizen-hero: 2 }` with _replace_ semantics. If the engine adds start extras instead, this must change.
- [ ] **Gaia early eco techs** are duplicated as `*-gaia` entries (e.g. `plow-gaia` in the Archaic Age). The engine should not let a Gaia player research both `plow` and `plow-gaia`.
- [ ] **Kronos Manor bonus** stacks per Manor in range (20); only one Manor is modelled (×1.25).
- [ ] **Deconstruction favor cost**: first cast free; reuse 10 favor, +10 per further reuse; cooldown 180 s (wiki). `cost` left out. Not checked in game.
- [ ] **Time Shift cost**: free for most buildings; Sentry Towers, Palaces and Mirror Towers cost 50% of their resource cost (Temporal Chaos halves this again). No favor cost, no cooldown found. Not in `cost`.
- [ ] **Hero promotion favor costs** (found, single source = wiki Citizen/Oracle/unit pages, consistent with analyzer hero totals): Citizen 65f 10w 2fav, Oracle 30f 45g 1fav, Murmillo 40f 25g 2, Katapeltes 45f 25g 2, Turma 35w 30g 2, Cheiroballista 85w 75g 4, Arcus 45w 25g 2, Contarius 55f 30g 3, Destroyer 55f 45g 3, Fanatic 55f 40g 3; 7 s each.
- [ ] **Farm cost** 150 wood (wiki, Atlantean) vs aomr-analyzer 75. Please check in game.
- [ ] **Dock cost** 125 wood (wiki, Atlantean) vs aomr-analyzer 100.

## Other values to confirm

- [ ] Town Center / Village Center build time 150 s base (wiki: 120 s with a Citizen).
- [ ] Palace 115 s base (wiki: 76.67 s with a Citizen). Military Barracks 30 s base. Market 40 s. Dock 30 s. Farm 10 s. Sentry Tower 60 s.
- [ ] Sky Passage (30 s) and Mirror Tower (60 s): the wiki does not say whether these are base or Citizen times (low).
- [ ] Wonder build time 5400 s (generic wiki value, low).
- [ ] Wooden Wall uses the connector values (3 gold, 5 s); longer segments cost 6/9/15 gold.
- [ ] Village Center trains workers 25% slower than a Town Center; not modelled.
- [ ] All research times come from the wiki only (aomr-analyzer has no times): medium confidence.
- [ ] Myth unit train times are from the wiki only (Automaton 9, Caladria 9, Servant 15, Satyr 15, Stymphalian Bird 10, Dryad 13, Nereid 12, Argus 20, Centimanus 18, Lampades 20, Man O' War 10).
- [ ] Weightless Mace favor 20 (analyzer) vs 15 (wiki); Asper Blood favor 12 (analyzer) vs 15 (wiki).
- [ ] Heavy/Champion Cavalry with the Atlantean -25% discount (300f 150g / 525f 150g); analyzer shows the undiscounted cost.
- [ ] Approximate favor effects: Oranos ×1.25 (only at full LOS), Perception ×1.1 (conservative), Prophetic Sight ×1.1, Sons of the Sun ×1.44 on `oracle`.
- [ ] Gaia's -25% Citizen promotion discount is a `cost` modifier on the `citizen-hero` id; the engine must apply it to the promotion cost.
- [ ] Rheia's Gift is a favor-cost ×0 modifier on tag `myth-tech`; the refund of favor already spent is not modelled.
- [ ] Fortified Town Center: `popCap` +10 scoped to `town-center` (per Town Center).
- [ ] Not modelled: Heart of the Titans (promotion time ×0.25), Temporal Chaos (Time Shift 50% of build time, 3 concurrent shifts), Horns of Consecration (Fanatic in the Heroic Age), Kronos 20% refund on lost siege/myth units, Gaia Lush, Gaia Forest wood.
- [ ] Fish is marked `infinite: true` (Retold in-game text), although the task only named farms as infinite.
- [ ] Llama Caravan id is `llama-caravan` (in-game name), tag `caravan`.

## Names (pt-BR)

- [ ] Only the names given by the owner (Cidadão, Oráculo, Templo, Mansão, Contraquartel, Arsenal, Turma, Prometeano, Behemoth, Centro da Cidade) are treated as official. All others are translations, marked in `meta.note` ("pt-BR name not verified..."). Includes god names (Prometeu, Oceano, Hiperíon, Reia, Teia, Hélio, Hécate) and power names (e.g. Deslocamento Temporal for Time Shift).

## Icons

- [ ] 135 fandom wiki icon URLs (`static.wikia.nocookie.net/.../revision/latest?cb=...`) were taken from the MediaWiki `imageinfo` API but could **not** be checked with an HTTP request: the CDN returns a Cloudflare bot challenge (403) to curl/Python. The `/revision/...` suffix was kept (the bare URL also returned 403). The 61 Kries-Dev icons were checked (200 image/png).
- [ ] `powers/time-shift` uses the original-game "Time Shift AoM.png" icon; no Retold icon was found.
- [ ] Gaia-variant techs (`techs/atlanteans-*-gaia`) reuse the base tech's icon URL.
- [ ] Kries `temple_icon.png`, `armory_icon.png`, `market_icon.png`, `dock_icon.png` were not used (unclear if Atlantean); wiki generic Retold icons used instead.
