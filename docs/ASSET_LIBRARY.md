# Asset library

Everything a lesson (or the game) can be built from: what exists in this repo today, what each
piece does, how to use it, and where more comes from. **Read this before writing a lesson. Update
it in the same commit whenever you add, change or remove an asset, scene, action, library or
source.** Machine-built lists live in [`asset-index/`](asset-index/) (`npm run assets:index`).

Status keys: **ready** = in the app and used · **wired** = installed and usable, not yet in a lesson ·
**source** = a place to get more, not yet pulled in · **rejected** = considered and left out (with why).

---

## 1. Scenes (the pictures lessons are made of)

A lesson step names a scene (`"scene": { "type", "preset", "params" }`) and timeline cues
(`"animation": [{ "at": seconds, "action": name, ...params }]`). Cues are GSAP tweens on the
scene's numbers, so one scene can be reused by many lessons. The validator rejects actions a scene
doesn't have; the list lives in `src/scenes/catalog.ts`.

### `voxel:blocks64` — 64 countable blocks (ready)
`src/scenes/voxel/Blocks64.tsx`. 64 blocks, each with a thick dark outline so every block can be
counted. Morphs between layouts with a staggered hop. Uses the `planks` texture.

| Action | Params | What it does |
|---|---|---|
| `fillStack` | `to`, `duration` | Blocks drop in one by one; the counter climbs ("64 blocks") |
| `morph` | `to`: `wall` \| `square` \| `cube` | Rearranges the same blocks into a new shape |
| `showSides` / `hideSides` | `a`, `b`, `c` (labels) | Tags on the edges: "8 rows", "4 tall" |
| `lightRows` | `to` | Lights the first N rows (show one row before naming it) |
| `countRows` | `duration` | Lights rows one at a time with running totals 8, 16, 24 … |
| `countLayers` | `duration` | Lights cube layers with totals 16, 32, 48, 64 |
| `doubleTo` | `to` | Shows the first N blocks in doubling order (1, 2×1, 2×2, 2×2×2 …) with a "×2" strip |
| `spin` | `turns` | Turns the whole build (skipped in reduced motion) |

Params: `layout`, `visible`. The camera follows the layout. Good for: area, arrays, squares,
cubes, volume, doubling, powers of 2, the hollow cube (26), division into groups.

### `voxel:solarCube` — 3×3×3 cube with 54 solar panels (ready)
`src/scenes/voxel/SolarCube.tsx`. Original geometry (no game assets). Sun with light, panels that
glow, top layer that twists, pieces that explode apart to show batteries in the core, a cut-away
edge piece with springy balls, magnets and a slip ring (tappable parts), and a sun-angle mode that
shades faces turned away from the sun.

Actions: `spin`, `countPanels`, `panelsOff`, `sunrise`, `pulsePanels`, `twist`, `explode`,
`focusEdge`, `sunAngle`, `tag` (`name`: `panel`). Tags shown automatically: sun, battery, springy
balls, magnets, slip ring. Explore part ids: `springs`, `magnets`, `slipring`.

### `voxel:disco` — a disco room (ready)
`src/scenes/voxel/Disco.tsx`. Dark room, mirror ball of 10 rows × 10 mirrors on a motor, a
spotlight with a visible beam, reflected dots that land on the walls and floor and sweep as the
ball turns (a second light doubles them to 200), two speakers whose cones pump to the beat, a
4 × 4 light-up floor, and coloured light (white/red/green/yellow). Plays an original synthesised
beat (2 beats a second) through `startMusic`/`stopMusic` in `src/lib/sfx.ts`.

Actions: `lights`, `spin` (`on`), `dots` (`on`, `count`), `secondLight`, `oneMirror` (one beam
bouncing off one mirror), `countMirrors`, `clearCount`, `music` (`on`, `volume`), `colour` (`to`),
`floorDance`, `countFloor`, `tag` (`name`: ball, light, mirror, motor, speaker, floor), `untag`.
Explore part ids: `ball`, `light`, `motor`, `speaker`, `floor`. Good for: reflection, light and
colour, sound and vibration, rhythm and counting in twos, arrays (mirrors, tiles), doubling.

### `voxel:arrange` — "make it" challenges (ready)
`src/scenes/voxel/Arrange.tsx`. The world arranges up to 100 items the way he chooses, so many
answers can be right. Modes: `rows` (equal rows, leftovers glow), `pairs` (odd/even), `split`
(two fenced fields), `tens` (rods of 10 + ones), `share` (plates for `extra` friends + leftovers).
Items: `chicken`, `sheep`, `apple`, `brick` (original toy brick with studs; tens rods alternate
red/blue, ones are yellow), `block` (outlined game block). Label shows what he made ("3 rows of 4,
2 left over"). Used by **make** steps (`kind: "make"`, see `src/lesson/types.ts`): dial + hammer,
spoken result built from number clips, ways collected as chips, `goal`, `exactOnly`.
Actions: `arrive`, `set` (`mode`, `item`, `total`, `choice`, `extra`).

### `diagram:wiring` — series and parallel (ready)
`src/scenes/diagram/Wiring.tsx`. SVG: 6 rows (faces) of 9 panels, rails, battery, moving current.
Actions: `flow` (`on`), `lightFace` (`face`), `lightRails`. Tappable: any row → part `chain` (and
it lights), rails → `rails`, battery → `out`. Shows the words "series" and "parallel" after the
idea has been shown.

### `diagram:power` — sun → battery → booster → phone (ready)
`src/scenes/diagram/Power.tsx`. Actions: `stage` (`to` 0–3), `charge` (`to` 0–1, battery gauge %).

### Adding a scene
New file in `src/scenes/<type>/`, export a `SceneDef` (defaults, Component, actions, optional
Overlay/camera/aim), register it in `registry.ts`, list its actions in `catalog.ts`, add it here.
3D labels must use `SceneHtml` (not drei `Html` directly). Blocks used for counting must have
visible outlines.

---

## 2. Card art (ready)
`src/components/CardArt.tsx` draws isometric voxel pictures as SVG (no files, no WebGL).
Presets: `stack64`, `solarCube`, `disco`, `made` (chair), `build` (grass-topped stairs), `maths`
(doubling 1, 2, 4, 8). Add a preset as a list of voxels with a base colour. Lessons pick one with `cardArt`.

## 3. Characters
- **Guide** (ready) — `src/components/Guide.tsx`. Blocky third-person builder in a yellow hard hat,
  rendered with **skinview3d** from an original 64×64 skin drawn in code. Waves on the lesson
  start and end screens. Animations available from skinview3d: idle, walk, run, fly, wave, crouch,
  hit, swim. Swap the skin by replacing `drawSkin()` or calling `viewer.loadSkin(url)`.
- **Robot sidekick** (ready, grey-box) — `Robot` in `src/game/Farm.tsx`. R3F voxel robot with a face
  and moods: `idle` (bob), `talk` (head wobble), `happy` (jumping spin, squint eyes), `sad` (droopy
  head, frown). Next: name/colour choice, victory dance, waving on return.

## 3b. Game pieces (`src/game/Farm.tsx`, ready, grey-box)
- `Block` — outlined block that drops in with a bounce; optional solid colour (bed blankets).
- `GlowCell` — pulsing outline cell he taps to place a block.
- `Scenery` — grass field, voxel trees, the barn (for the teaser).
- Number dial (plus/minus, big number, spoken 1–30 via `numberLine(n)`), take-from-store cart.
- Hint ladder (20/40/60 s), hand demo over the next target, "start this puzzle again".
- Puzzle data: `content/puzzles/<id>.json` (`lines` are narrated through the same audio pipeline:
  `audio/game-<id>/<key>.mp3`). Today: `bed` (area). Save: localStorage `game`.

## 4. Block textures
Manifest: `content/textures.json`. Each block key lists candidates `"source:path"`; `npm run
textures:fetch` downloads the first that works into `src/assets/textures/` (gitignored, bundled
only if present, so missing files never 404). Without a file, a block uses its built-in original
pixel texture (`planks`, `stone`, `dirt`, `grass_top`, `clay`). Use in code: `blockTexture(key)`.

Keys today: `planks`, `stone`, `dirt`, `grass_top`, `tnt_side`, `dispenser_front`, `redstone_dust`,
`repeater`, `lever`, `craft_atlas`, `create_cogwheel`, `create_andesite_casing`,
`fd_cutting_board`, `mek_steel_casing`.

| Source id | Repo | What's there | Edition | Status |
|---|---|---|---|---|
| `bedrock` | Mojang/bedrock-samples | Official Bedrock resource pack: every vanilla block/item texture | bedrock | ready (first choice) |
| `inventive` | InventivetalentDev/minecraft-assets (= mcasset.cloud) | Java assets per version, incl. models and sounds | java | ready (fallback) |
| `prismarine` | PrismarineJS/minecraft-assets | Java textures by version | java | wired |
| `destruc7i0n` | destruc7i0n/minecraft-textures | Texture packs by version | java | source (path not verified) |
| `owen` | Owen1212055/mc-assets | Extracted assets | java | source (path not verified) |
| `craft` | fogleman/Craft | Original MIT-licensed block atlas (`textures/texture.png`) — safe to share anywhere | original | wired |
| `create` | Creators-of-Create/Create | Cogwheels, shafts, belts, casings: real mechanical engineering | mod:create | wired |
| `mekanism` | mekanism/Mekanism | Machines, steel, energy cubes, cables | mod:mekanism | wired |
| `farmersdelight` | vectorwing/FarmersDelight | Food, cutting boards, cooking pots (fractions, sharing) | mod:farmersdelight | wired |
| `ic2` | IndustrialCraftMC/IndustrialCraft2 | Generators, solar panels, cables (electricity) | mod:ic2 | source |
| `securitycraft` | Geforce132/SecurityCraft | Keypads, sensors, alarms (logic, circuits) | mod:securitycraft | source |
| `furniture` | MrCrayfish/MrCrayfishFurnitureMod-Refurbished | Chairs, tables, kitchens (chair/table lessons) | mod:refurbished_furniture | source |
| `littletiles` | CreativeMD/LittleTiles | Sub-block building (fractions of a block) | mod:littletiles | source |
| `car` | henkelmax/car | Car parts: engine, wheels, fuel (how a car works) | mod:car | source |

Licences: Mojang assets fall under the Minecraft EULA/usage guidelines; mod art belongs to its
authors. This is a private family app, so they're used locally and kept out of git. Check terms
before making anything public. Full file lists per source: `asset-index/texture-sources.md`.

Lessons can be for any edition (`"edition": "bedrock" | "java" | "mod:<name>"`, shown as a tag).
Pick the edition the build actually works in.

## 5. Minecraft data (ready)
**PrismarineJS minecraft-data** (dev dependency): every block, item, food, recipe, entity, biome
and stack size for Java and Bedrock versions. Used in `src/lesson/facts.test.ts` to check facts in
lessons. Full tables: `asset-index/minecraft-items.md`, `asset-index/minecraft-foods.md`. The data
has errors (Bedrock cake stack size says 64), so verify any fact a lesson depends on.

## 6. UI and motion libraries

| Library | Status | Where / how it's used |
|---|---|---|
| three.js + **React Three Fiber** + drei | ready | All 3D scenes, sandbox. drei: RoundedBox, OrbitControls, Html (via `SceneHtml`) |
| **GSAP** | ready | The lesson timeline engine: every cue is a GSAP tween |
| **skinview3d** | ready | The guide character |
| **ShaderGradient** | ready | Home screen daylight backdrop (`lightType="3d"`, so offline; needs the chunk shim in `HomeBackdrop.tsx`) |
| **Paper shaders: LiquidMetal** ("liquid logo") | ready | App logo mark on the home screen (`LogoMark.tsx`) |
| **Vanta** (FOG) | ready | Section screen backgrounds, tinted per section |
| **liquid-glass-js** | ready | Draggable magnifying lens over the "How it's really made" header art |
| **Lenis** | ready | Smooth scrolling on section screens (off in reduced motion) |
| **shadcn/ui** (Switch, on Radix) | ready | Parent screen toggles (`components/ui/switch.tsx`) |
| **React Bits**: ClickSpark, CountUp | ready | Sparks on a right answer; numbers count up on reveal (`components/vendor/reactbits/`) |
| **Fancy Components**: VerticalCutReveal, Float | ready | Labels and the rule reveal; floating home tiles (`components/vendor/fancy/`) |
| motion (Framer Motion) | ready | Dependency of the vendored components |
| lucide-react | ready | All icons |
| fflate | ready | Zips the Ask requests for export |
| Bricolage Grotesque + Andika (fontsource) | ready | Display face; Andika (single-storey a/g, made for early readers) for labels |
| Playwright | ready | Smoke tests, screenshots (`scripts/shot.mjs`), icon rendering |
| cobe (globe) | rejected | No lesson needs a globe yet; add if a geography/space lesson does |
| three-ui / @react-three/uikit | rejected for now | No 3D UI panels needed; HTML overlays are clearer |
| Skiper UI, componentry.dev, animaster | rejected | Sites unreachable from the build machine; animaster isn't on npm |
| MineRender | rejected | Unmaintained, old three.js, fetches models from a server at runtime |
| noa, Divine Voxel Engine | rejected | Babylon.js engines: would ship a second 3D engine for nothing R3F can't do |
| prismarine-viewer | source | Renders real Minecraft worlds/schematics; needs world files + old three. Option for showing a real saved build later |
| fogleman/Craft | wired (textures only) | C/OpenGL game; its MIT texture atlas is the useful part |

## 7. Non-Minecraft sources (for real-world lessons)

| Source | Licence | Good for |
|---|---|---|
| **Kenney** (kenney.nl): Physics, Rolling Ball, Block Pack, Car Kit, UI Pack, Game Icons | CC0 | Ramps/balls (forces), car parts, toy blocks, icons. glTF models load straight into R3F |
| **Quaternius** (quaternius.com) | CC0 | Low-poly animals, farm, vehicles, robots (game farm slice, robot sidekick reference) |
| **PhET** (phet.colorado.edu) | CC BY 4.0 | Circuit, energy, fractions, area simulations. External links are allowed: link or embed as an optional "explore more" |
| **LDraw parts library** (library.ldraw.org) + three.js **LDrawLoader**, leozide/LeoCAD, mubaidr/ldraw-models, Mecabricks | CC BY 4.0 (LDraw) | Exact Lego builds for hands-on challenges ("build this 3×3×3 cube"). Plan: pack models with three's LDraw packer into single `.mpd` files so they work offline, add a `ldraw:model` scene |
| Poly Haven | CC0 | Textures/HDRIs for realistic objects (iPad layers, chair wood) |

## 8. Sound, voice and speech input
- Narration: Kokoro TTS, voice `bm_lewis`, 0.9× (scripts/generate-audio.py), recorded
  automatically by the GitHub Action `.github/workflows/narration.yml` whenever lesson or game text
  changes (it commits the MP3s back). Files in
  `public/audio/<lesson>/<line>.mp3` with `.hash` sidecars and `manifest.json`. Line names come
  from `src/lesson/lines.ts`. Missing files fall back to the device voice in development only.
- Effects: synthesised in `src/lib/sfx.ts` (tap, block click, right-answer chime). No buzzer, ever.
- Music: `startMusic()` / `stopMusic()` in `src/lib/sfx.ts`, an original beat (kick, hi-hat,
  bass) at 2 beats a second. Respects the sound setting.
- **Speech input** (ready): `src/lib/listen.ts` (browser speech recognition; on iPad it's Apple's)
  and `MicButton`. Used on every question (`matchChoice` turns "sixty four" into the 64 choice),
  the say-the-rule step (what he said is logged for the parent screen), Ask dictation, and naming
  the robot and the farm. `src/lib/spoken.ts` parses spoken numbers and yes/no. Parent toggle.
- Names he chooses (robot, farm) are shown, never spoken, so all narration can be pre-recorded.
- **Voices per character** (`content/voice.json`): `engine` kokoro or fish (Fish Audio API,
  model s2.1-pro, needs the `FISH_API_KEY` secret); `speakers.narrator`, `speakers.robot` (add
  more); per-speaker voice, speed, pitch and device-fallback pitch/rate; `pauses` for pacing.
  A line's `speaker` comes from `narration.speaker` in lesson JSON; game puzzle lines are the robot.
- **Voice samples** workflow renders candidate Fish voices to `public/voice-samples/` (listed on
  the parent screen). **Video notes** workflow turns `requests/videos/` uploads or links into a
  transcript + frames for building lessons.
- Game sounds from the texture sources' asset packs are available but not used yet.

## 9. App data you can build on
- `content/known.json` — words Ismaeel already knows (the glossary's starting point).
- Each lesson's taught `term`s become available to lessons that `require` it.
- `requests/` — exported voice notes, homework photos and typed ideas from the Ask tile, plus
  `activity.json` (replays, wrong answers chosen, where he stopped). Make lessons from these.

## Changelog
- 2026-11-21 — disco scene + lesson, speech input, music, recorded-narration workflow, Blocky name.
- 2026-11-21 — game grey-box: robot sidekick, Block/GlowCell, number dial, bed puzzle data.
- 2026-11-21 — first version: scenes blocks64/solarCube/wiring/power, card art, guide, textures
  from 14 sources, minecraft-data, UI libraries, non-Minecraft sources, LDraw plan.
