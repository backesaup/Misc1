# Blocky — notes for Claude

A PWA for iPhone/iPad that teaches **Ismaeel** (5) how real things are engineered, how to build
in Minecraft, and maths, through narrated, animated lessons where he predicts before each answer.

## Read first, every time
1. `docs/LESSON_DIRECTION.md`: how lessons are written, and the decisions that override the
   briefs. Esa's later instructions win over anything in `docs/briefs/`.
2. `docs/ASSET_LIBRARY.md`: every scene, action, texture source, library and outside source you
   can build from. **Update it in the same commit whenever assets change.** Regenerate the
   machine lists with `npm run assets:index`.
3. `requests/`: things Ismaeel asked to learn about (voice, photos, text) + his activity log;
   `requests/videos/<name>/` has transcripts and frames of source videos.
4. `docs/LESSON_MAP.md`: the Year 1–2 lesson map and what's built. Understanding and creativity
   over right answers: prefer `make` steps and `open` estimates.

## Layout
- `content/lessons/*.json`: lessons are data. A new lesson needs no player code unless it adds a
  scene type. `content/known.json` = words he already knows. `content/textures.json` = block
  textures and where they come from.
- `src/player/`: the lesson player. `src/scenes/`: scenes (`catalog.ts` lists their actions).
- `src/screens/`: home, section, sandbox, ask, parent. `src/game/`: the farm game. `src/lib/`: narrator, settings, storage,
  activity log, inbox.
- `scripts/`: `generate-audio.py` (Kokoro bm_lewis; run automatically by `.github/workflows/narration.yml`), `check-audio.mjs`,
  `list-lines.ts`, `fetch-textures.mjs`, `build-asset-index.mjs`, `shot.mjs` (screenshots).

## Commands
- `npm run dev` · `npm run build` · `npm test` (lesson rules, glossary, facts)
- `npm run test:e2e:dev` plays every lesson in a browser (device voice allowed);
  `npm run test:e2e` fails if any narration file is missing.
- `npm run textures:fetch` downloads textures (gitignored). `npm run check:audio`.
- In this cloud container, Playwright needs `CHROMIUM_PATH=/opt/pw-browsers/chromium`.

## Rules
- Privacy: no accounts, analytics or trackers. Progress, activity and requests stay on the device
  (localStorage / IndexedDB, wrapped in try/catch) until a grown-up exports them.
- Calm: no points, stars, streaks, badges, timers or guilt. Wrong answers: "Let's see what
  happened", hint, one more try, then re-explain.
- Every tappable thing ≥ 64 pt. Respect reduced motion (`useSettings().reducedMotion`).
- Counting scenes show every block's outline. 3D labels use `SceneHtml`.
- Unverified facts → `"status": "draft"` with a `verify` list.
- Don't put model names in commits or code.
