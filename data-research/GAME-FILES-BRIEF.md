# Game files pass (brief for agents)

Owner decision (2026-10-18): **the installed game is the absolute source of truth.** Whatever the game files say is fact; wikis and other sites are support only.

## Where things are

- Game install (read-only, never modify): `C:\Program Files (x86)\Steam\steamapps\common\Age of Mythology Retold\` (`game\data\*.bar`, `game\ui`, `game\art`, `game\random_maps`, ...). Build 19.17020.
- Already extracted (read-only copies): `C:\Users\bruno\AppData\Local\Temp\claude\C--Users-bruno-Documents-Projetos-AoMBuildOrderBuilder\6dea76dd-a967-4554-931c-46782537c566\scratchpad\ex\`
  - `gameplay\` — proto.xml, techtree.xml, major_gods.xml, minor_gods.xml, cultures.xml, god_powers\, abilities\, tactics\ ...
  - `strings\English\string_table.txt`, `strings\PortugueseBrazil\string_table.txt` — official names (proto/tech entries reference string ids, e.g. DisplayNameID).
- A `.bar` reader exists at `...scratchpad\tools\bar.py` (copy it; extract anything else you need into your own scratchpad sub-folder).
- Findings so far: `data-research/game-files-findings.md`.

## Rules

- Read `data-research/RESEARCH-BRIEF.md` and `src/data/schema.ts` first. The schema is authoritative.
- Every value you confirm from the files: `meta`/`fieldMeta` source `"Game files 19.17020 (<file>)"`, `checkedAt` today, `confidence: "high"`.
- Values only an owner measurement gives (no file value) keep `"source": "measured"`. When a file value conflicts with a measurement, the **file wins**; record the conflict in your pantheon's `SOURCES.md` and in your final report.
- **Names:** `name["pt-BR"]` and `name.en` must be the official strings from the game's PortugueseBrazil and English string tables. Plurals (`plural`) only when the string table has them or Portuguese grammar needs it (e.g. "Cidadão" → "Cidadãos").
- Keep every existing id and icon id stable (builds reference them). You may add missing entities. Remove an entity only if it does not exist in Retold **and** no file in `src/presets/` or `tests/fixtures/` references it.
- Base game only (no DLC pantheons/gods).
- Use your own scratchpad sub-folder; other agents work in parallel on other pantheons.
- Do not edit engine/UI code, presets, tests, or files of other pantheons. Do not commit.
- When done: `npx tsx scripts/merge-powers.ts`, `npm run check-data`, `npx vitest run tests/data`. Also run `npx vitest run tests/engine` and report (do not fix) any engine test that changed because of data.
