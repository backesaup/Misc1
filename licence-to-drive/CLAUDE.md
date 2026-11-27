# Licence to Drive: notes for Claude

A separate game from Blocky (see `README.md` and the brief in `docs/brief.pdf`). It lives in
this folder of the Blocky repo for now; the brief wants its own repo and Vercel project.

- Build **one step of the build order at a time**, then stop and say what to test.
- No external art or sound files: bricks, figures and scenery are procedural Three.js; sounds
  are Web Audio. Brick look and feel like the toy-brick video games, but every character, name
  and logo is original. No branded names anywhere.
- Target a steady 60 fps on his iPad in Safari. Check with `?fps` before adding detail.
- The licence code is the only key to the save. Never put his name alone in a URL.
- Calm design: points only go up, no failing, crashes are bonks. Buttons ≥ 64 px. Everything he
  needs is spoken and shown with icons. Respect reduced motion.
- Don't put model names in commits or code.
