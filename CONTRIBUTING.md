# Contributing

> **Português:** contribuições são bem-vindas em português ou inglês. Abra uma issue para erros, números errados do jogo ou ideias; o resto deste guia explica como mexer no código.

Thanks for helping! This is a fan-made, open source build order builder and simulator for **Age of Mythology: Retold**. Issues and pull requests are welcome in English or Portuguese.

## Ways to help

- **Report a bug**: something that does not work or looks wrong. Use the _Bug_ issue form.
- **Fix a game number**: a cost, train time, gather rate… that does not match the game. Use the _Game data_ form and say where the right value comes from (game files, an in-game test, a patch note).
- **Suggest an idea**: use the _Idea_ form.
- **Propose a standard build**: in the app, open your build → **…** menu → **Propose as standard build**. A bot checks it and opens a pull request.
- **Write code**: pick an issue (look for `good first issue` and `help wanted`), say in it that you are on it, then open a pull request.

Anything else, or something you would rather not post in public: [brunopenabaeta@gmail.com](mailto:brunopenabaeta@gmail.com).

## Running the project

Node 22+ and npm.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit, data, i18n and API tests
npm run lint         # ESLint + Prettier
npm run check-data   # validates the game database
npm run build && npx playwright install chromium && npm run test:e2e   # browser tests
```

On Windows, `start.bat` installs the dependencies and starts the dev server.

## Rules of the project

The full list is in [`CLAUDE.md`](CLAUDE.md) (it guides both people and AI assistants). The ones that matter most:

- **Code, identifiers and commits in English.** UI text only through `src/i18n/pt-BR.json` and `src/i18n/en.json`, with the same keys in both (a test checks it).
- **No game numbers in code.** Every number lives in `src/data/*.json` with `meta { source, checkedAt, confidence }`. Source priority: the game installation (files, string tables) > in-game measurements > aomr-analyzer > official sources > wikis. Never guess: an unknown value gets `confidence: "low"` and an entry in `data-research/PENDING.md`. Log data changes in `data-research/changelog.md`.
- **The simulator** (`src/engine`) is pure and deterministic. New behaviour comes with a test.
- **The UI** is visual: game icons, short labels, explanations in tooltips; no horizontal scroll from 360 px up; keyboard and screen reader friendly.
- Say "unidade mitológica", never "mítica" ("Mítica" is only the age).

## Pull requests

1. Fork, create a branch, keep commits small and focused.
2. Run `npm run lint`, `npm run check-data` and `npm test` (and the e2e tests when you change the UI).
3. Describe what changed and why; link the issue (`Closes #123`).

CI runs the same checks on every pull request. A maintainer reviews and merges.

## Game content

Icons and images in `public/icons/` are © Microsoft and are not covered by the MIT license (see [`LICENSE`](LICENSE)). Do not add files extracted from the game other than the icons made by `scripts/game-icons.py`.

By contributing you agree that your contribution is licensed under the MIT license of this project and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
