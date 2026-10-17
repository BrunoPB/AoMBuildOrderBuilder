# Sources

Game: **Age of Mythology: Retold**, base game, patch **19.17020** (minor update, 2026-07-01). The last balance changes for the four base pantheons are in **19.16313** (2026-06-23).

Detailed per-pantheon notes, including every conflict and which source won:

- [atlanteans/SOURCES.md](atlanteans/SOURCES.md)
- [greeks/SOURCES.md](greeks/SOURCES.md)
- [egyptians/SOURCES.md](egyptians/SOURCES.md)
- [norse/SOURCES.md](norse/SOURCES.md)

## Priority (SPEC 4.2)

1. Measured in game by the project owner (`"source": "measured"`).
2. Extracted game data: aomr-analyzer.com and, for the Egyptians, the game's own `Data.bar` (proto.xml, techtree.xml, major_gods.xml) from the owner's installed copy, read-only.
3. Official pages and patch notes (ageofempires.com).
4. Community wikis: Age of Empires Series Wiki (fandom), Liquipedia, Pro Game Guides.
5. aomstats.io (metadata only).

## Project-level decisions

| Topic                      | Decision                                                 | Why                                                                                                                       |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Atlantean build speed      | Citizen `buildRate` 1.5 over base build times            | Wiki says Citizens build 50% faster; matches the measured Krush Temple (~27 s) and Counter-Barracks near a Manor (~13 s). |
| Kronos Manor bonus         | ×1.25 build rate once the first Manor is ready           | SPEC 6.2 simplification (no map). In game it stacks per Manor in range.                                                   |
| Free myth units (Kronos)   | `ageUpFreeUnits` replaces the minor god's own free units | Kronos gets 2 instead of 1; measured in Krush.                                                                            |
| God `startExtras.units`    | Replaces the start count of that unit                    | Thor `{gatherer: 0, dwarf: 3}`, Gaia hero Citizens.                                                                       |
| Minor gods in `requires`   | Any one of the listed minor gods is enough               | Norse giants are available to more than one minor god.                                                                    |
| Fish                       | Infinite                                                 | Retold fish do not run out.                                                                                               |
| Hunt amount (Krush preset) | 2000 food                                                | Typical value unknown (open question); calibrated to the measured Krush. Data default stays 1400.                         |

## Icons

`public/icons/manifest.json` records the origin of every icon. Sources: [Kries-Dev/BuildOrders](https://github.com/Kries-Dev/BuildOrders) (`Icons/`), [MiguelMG24/aom-retold-build-order](https://github.com/MiguelMG24/aom-retold-build-order) (`assets/`) and the AoE fandom wiki. Neither repository has a license file; all icons are game assets © Microsoft, used as fan content under the Game Content Usage Rules. The wiki CDN blocks scripted downloads, so `scripts/fetch-icons.ts` falls back to the two repositories by file name.
