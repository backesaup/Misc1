# Licence to Drive

A brick-built driving game for Ismaeel, unlocked by tapping or scanning his real driving licence.
Separate from Blocky: its own look, sounds, progress and URL. Brief: `docs/brief.pdf`.

**Built so far: step 1 of the build order.** START ENGINE screen, the licence-verified intro,
NFC/Shortcut entry on phones, in-game QR scan on the iPad, and one shared save that every device
loads.

## How it works
- `/start?code=<licence code>`: what the NFC tag and the iPhone Shortcut open. The code is taken
  out of the address bar straight away. A full-screen **START ENGINE** button (the touch the
  browser needs before it can play sound) leads to the intro (under 4 s, tap to skip), then home.
- `/`: the **Licence Check** the iPad home-screen app opens on. The front camera reads the QR
  inside the game. Android phones also get a **Tap card** button (Web NFC).
- `/setup`: for grown-ups. Makes the licence code and shows the start link and a printable QR.
- `/api/save` and `/api/licence`: the shared save. The licence code (32 random characters,
  about 158 bits) is the only key. It travels in a header, not a URL, and the database stores
  only its SHA-256 hash. His name is never in a link. The game keeps a local copy, so it opens
  offline and syncs when it's back online. Merges never lose anything (engine starts are counted
  per device and the larger count wins).
- Everything you see and hear is made in code: Three.js bricks with studs, Web Audio sounds, the
  device's own voice for "Licence accepted". No art or sound files.
- Add `?fps` to any game URL to show a frame counter (stays on for that visit).

## Run it
```bash
npm install
npm run dev      # API runs inside Vite; saves go to .data/dev-db.json
npm test
npm run build
```
In dev, make a licence at `/setup` (no set-up key needed locally).

## Deploy to Vercel
1. New Vercel project from this folder (Root Directory: `licence-to-drive` while it lives in
   the Blocky repo). Framework: Vite.
2. Storage → add **Upstash for Redis** (free) and connect it to the project. It sets
   `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Settings → Environment Variables → add `SETUP_KEY` (any long password; it guards `/setup`).
4. Deploy, open `/setup`, make the licence, then follow the steps on that page for the NFC
   sticker, the iPhone Shortcut and the iPad QR.

## Layout
- `shared/`: licence codes and the save format + merge rules (used by both sides).
- `server/`: the API handlers (web Request/Response) and the store (Upstash REST or a dev file).
- `api/`: Vercel functions, thin wrappers around `server/`.
- `src/screens/`: check, start (+ intro), hub, setup. `src/three/`: procedural bricks and the
  scene. `src/lib/`: audio, voice, device, local save + sync.
