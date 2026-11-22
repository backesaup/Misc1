# How lessons are written

The full briefs are in [`briefs/`](briefs/) (PDF + text): the app brief, the lesson direction
brief, and the game section brief. This page is the working summary plus the decisions made
since. **Where a brief and Esa's later instructions disagree, the instructions below win.**

## Decisions that override the briefs
- React + Vite + TypeScript (not plain TS/Preact): Esa asked for React libraries (R3F, shadcn,
  React Bits, Fancy, etc.).
- Minecraft textures and assets **may** be used (from the sources in `ASSET_LIBRARY.md`).
- Builds don't have to be Bedrock-only. Tag each with `edition`.
- External links are allowed.
- No hard 50 MB size limit (keep it reasonable: iOS can evict offline storage for unused apps).
- The learner is **Ismaeel** (`src/config.ts`). The app is called **Blocky**.
- **Every lesson needs a hook worth tapping.** The title is a mystery, a problem or stakes
  ("The table that wouldn't stop rocking", "Is £1 less than 50p?"), never a topic name ("Halves").
  Each lesson has a `thumb`: 1–3 big words (`"WOBBLE!"`), an accent colour, and the `step` whose
  scene makes the best picture. Run `npm run thumbs` (with `npm run dev` running) to capture the
  picture into `src/assets/thumbs/`; the cover adds the words and Steve's face. The validator
  refuses a lesson without one.
- The sidekick is **Steve** (Minecraft), not a robot. He names the farm himself (in the game, by speaking or typing).
- Use Minecraft art wherever it fits: skins, items, mob faces, blocks. Real-world lessons show real-looking objects, with Steve alongside.
- Speech input is on: he can say answers. Narration is recorded by a GitHub Action, not on a laptop.

## The learner
Five, genuinely capable: knows square and cube numbers, loves arithmetic, asks real engineering
questions. Not a genius, still five. Reads very little: voice and pictures carry everything.

## Every lesson
1. **Write the step chain** (`_stepChain` in the JSON) from what he knows to the goal. Check every
   link is known (`content/known.json`) or taught earlier in this lesson or a `requires`d lesson.
2. **One new term per step** (`term`). Show the thing first, then name it.
3. **Define everything**: every number says what it counts; every symbol (×, =, −) is said in
   words before it's shown; every unit gets a picture (milliamps → water from a tap) and the
   analogy's limit is said out loud.
4. **Predict before reveal** at the key moment. Wonder can come first ("this cube can charge a
   phone!").
5. **Wrong choices are real mistakes**: each has `mistake` (the misunderstanding), `hint` (a small
   nudge; he gets one more try) and `say` (re-explains the broken step a different way). Then a
   similar `retry` question where it helps.
6. **Specific praise only** (`onRight`: say what he did). Banned: just, simply, obviously, of
   course, super, genius, smart, clever, great job, good job, wow…, "does that make sense".
   The validator enforces this.
7. **Apply it to something new** in at least one question. Mix in an earlier idea where possible.
8. **End**: he says the rule out loud before it's shown (`rule.ask`), then a `handsOn`
   real-world challenge, a `talk` card for a grown-up, and an optional `bonus` stretch.
9. Keep steps short; something moves every few seconds; he taps every few steps; he controls pace.
10. Say when something is hard ("This part is tricky. Lots of grown-up engineers find it tricky
    too."). Never "too grown-up".
11. If there's a story, its problem can only be solved with the lesson's idea, and the idea
    arrives within 20 seconds.
12. Unverified facts → `"verify": [...]` and `"status": "draft"` (hidden from him until a grown-up
    turns drafts on).

`npm test` checks the parts a machine can check (structure, misunderstandings + hints, banned
words, glossary across lessons, scene actions, talk card, hands-on).

## Ideas to build next (from Esa, agreed)
- **Teach the sidekick** (protégé effect): the sidekick gets stuck or makes a mistake; he explains
  or shows the fix.
- **Understanding unlocks tools** in the sandbox/game (series & parallel → wires; volume → pool
  builder). Never points, stars, streaks or badges.
- **A world that grows with him**: what he builds and solves stays in his world.
- **Idea cards** he collects (Area, Volume, Parallel…); later lessons combine two.
- **Open with a mystery** (information gap): "Why didn't the cube charge the phone?"
- **His questions become lessons**: the Ask tile (done) → `requests/`.
- **Let him choose the order**: a lesson map rather than a fixed sequence (sections are free
  choice today).
- **Watch him**: the activity log on the parent screen (done); adjust lessons from what he replays,
  gets wrong, or quits.

## Game section
See `briefs/game-brief.txt`. First slice: the farm (bed = area, sheep pen = perimeter, water tank =
volume, hollow watchtower = 26), the block-store number dial as his prediction, the world gives
the feedback, hint ladder at 20/40/60 s, no rewards beyond the world changing. Milestone 1 is a
grey-box of the bed puzzle: **built** (`src/game/Farm.tsx`, `content/puzzles/bed.json`, the Farm tile). Next: test the controls with him, then the sheep pen (perimeter), water tank (volume) and hollow watchtower (26).
