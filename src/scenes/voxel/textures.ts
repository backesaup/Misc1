import * as THREE from 'three'
import manifest from '@content/textures.json'

// Built-in block looks: small pixel textures drawn in code (original art).
// A file listed in content/textures.json replaces the built-in look when present.

type Painter = (g: CanvasRenderingContext2D, rnd: () => number) => void

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

function speckle(base: [number, number, number], spread: number, edge = 0.18): Painter {
  return (g, rnd) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const n = (rnd() - 0.5) * spread
        const rim = x === 0 || y === 0 ? 1 + edge : x === 15 || y === 15 ? 1 - edge : 1
        const [r, gg, b] = base.map((c) => Math.round(Math.min(255, Math.max(0, c * rim + n))))
        g.fillStyle = `rgb(${r},${gg},${b})`
        g.fillRect(x, y, 1, 1)
      }
  }
}

const painters: Record<string, Painter> = {
  planks: (g, rnd) => {
    speckle([196, 148, 92], 18, 0.12)(g, rnd)
    g.fillStyle = 'rgba(120,75,35,0.28)'
    for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1)
    g.fillRect(rnd() > 0.5 ? 5 : 9, 0, 1, 3)
    g.fillRect(rnd() > 0.5 ? 3 : 12, 4, 1, 3)
    g.fillRect(7, 8, 1, 3)
    g.fillRect(rnd() > 0.5 ? 2 : 13, 12, 1, 3)
  },
  stone: speckle([150, 150, 146], 36),
  dirt: speckle([140, 98, 66], 34),
  grass_top: speckle([118, 168, 84], 30),
  clay: speckle([226, 132, 92], 16, 0.14),
}

const cache = new Map<string, THREE.Texture>()
const loader = new THREE.TextureLoader()
// Only textures that were actually fetched exist here, so nothing 404s.
const fetched = import.meta.glob<string>('../../assets/textures/*.png', { eager: true, query: '?url', import: 'default' })
const fetchedUrl = (file: string) => fetched[`../../assets/textures/${file}`]

function pixelate(t: THREE.Texture) {
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestMipmapLinearFilter
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function blockTexture(name: string, seed = 7): THREE.Texture {
  const key = `${name}:${seed}`
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 16
  const g = canvas.getContext('2d')!
  ;(painters[name] ?? painters.clay)(g, rng(seed * 9973 + name.length))
  const tex = pixelate(new THREE.CanvasTexture(canvas))
  cache.set(key, tex)

  const file = (manifest.blocks as Record<string, { file: string }>)[name]?.file
  const src = file && fetchedUrl(file)
  if (src) {
    loader.load(
      src,
      (img) => {
        tex.image = img.image
        tex.needsUpdate = true
      },
      undefined,
      () => {
        /* not fetched: keep the built-in look */
      },
    )
  }
  return tex
}

/** Deep blue solar cell with a silver grid, drawn in code. */
export function solarCellTexture(): THREE.Texture {
  const hit = cache.get('solar')
  if (hit) return hit
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  g.fillStyle = '#1b2b52'
  g.fillRect(0, 0, s, s)
  const grad = g.createLinearGradient(0, 0, s, s)
  grad.addColorStop(0, 'rgba(120,160,255,0.28)')
  grad.addColorStop(1, 'rgba(10,20,60,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  g.fillStyle = 'rgba(214,224,240,0.75)'
  for (let i = 1; i < 4; i++) g.fillRect(0, (i * s) / 4, s, 1)
  g.fillRect(s / 2, 0, 2, s)
  g.fillStyle = 'rgba(214,224,240,0.35)'
  for (let i = 1; i < 16; i++) g.fillRect((i * s) / 16, 0, 0.6, s)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  cache.set('solar', t)
  return t
}
