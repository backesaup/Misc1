# Blockwise

An offline web app for iPad and iPhone that teaches Ismaeel how real things are made, how to build
in Minecraft, and maths, through short narrated lessons where he guesses before every answer.

- **Lessons are data** (`content/lessons/`), played by one lesson player with 3D voxel scenes and
  diagrams driven by GSAP timelines.
- **How lessons teach** follows the lesson direction brief (`docs/LESSON_DIRECTION.md`).
- **What lessons can use**: `docs/ASSET_LIBRARY.md`.

## Run it
```bash
npm install
npm run textures:fetch   # optional: real block textures (otherwise built-in originals)
npm run dev
```

## Voice
Narration is pre-generated with Kokoro (voice `bm_lewis`) on the laptop:
```bash
pip install kokoro soundfile    # and ffmpeg on PATH
python scripts/generate-audio.py
npm run check:audio
```
Until then, lessons use the device's voice (development only).

## Test
```bash
npm test               # lesson rules, glossary, Minecraft facts
npm run test:e2e:dev   # plays every lesson in a browser
```

## Deploy (Vercel, static)
Build command `npm run build`, output `dist`. Run `npm run predeploy` first (tests, audio check,
build). Add to the home screen from Safari's share menu; it then works offline.

## Grown-ups
Hold the settings button on the home screen for 3 seconds: captions, sounds, simpler motion,
narration speed, drafts (and the facts to check), Ismaeel's requests (export), what he's been
doing, and progress.
