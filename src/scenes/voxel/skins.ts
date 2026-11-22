import * as THREE from 'three'
import { useEffect, useState } from 'react'
import manifest from '@content/textures.json'

// Minecraft player skins (64×64) for the characters: Steve is the sidekick, Kai is the guide.
// The real skins are fetched by `npm run textures:fetch` (and by `npm run build`) into
// src/assets/textures/skins/. Without them, an original look drawn here in code is used.

export type SkinName = 'steve' | 'alex' | 'kai'
type SkinEntry = { file: string; model?: string }
const SKINS = (manifest as unknown as { skins: Record<string, SkinEntry> }).skins

const fetched = import.meta.glob<string>('../../assets/textures/skins/*.png', { eager: true, query: '?url', import: 'default' })
export const skinUrl = (name: SkinName) => fetched[`../../assets/textures/${SKINS[name]?.file}`]
export const skinModel = (name: SkinName): 'default' | 'slim' => (SKINS[name]?.model === 'slim' ? 'slim' : 'default')

const LOOKS: Record<SkinName, { skin: string; hair: string; shirt: string; trousers: string; shoe: string; hat?: string }> = {
  steve: { skin: '#c98d5c', hair: '#4a2f1f', shirt: '#3fb6b2', trousers: '#4b4fa8', shoe: '#5b5b5b' },
  alex: { skin: '#f0c49a', hair: '#e07a3a', shirt: '#6fae5a', trousers: '#7a5236', shoe: '#4a3a2a' },
  kai: { skin: '#c98d5c', hair: '#2a1d16', shirt: '#e07a4f', trousers: '#3a4f7a', shoe: '#2b2a33', hat: '#ffd166' },
}

/** An original stand-in skin, drawn in code (used until the real one is fetched). */
function drawFallback(name: SkinName, c: HTMLCanvasElement) {
  const L = LOOKS[name]
  const g = c.getContext('2d')!
  g.clearRect(0, 0, 64, 64)
  const box = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col
    g.fillRect(x, y, w, h)
  }
  box(0, 0, 32, 16, L.skin)
  box(8, 0, 8, 8, L.hair)
  box(0, 8, 32, 2, L.hair)
  box(24, 8, 8, 6, L.hair)
  box(9, 11, 2, 2, '#ffffff'); box(10, 11, 1, 2, '#2b2a33')
  box(13, 11, 2, 2, '#ffffff'); box(13, 11, 1, 2, '#2b2a33')
  box(10, 14, 4, 1, '#8a4a32')
  box(16, 16, 24, 16, L.shirt)
  box(40, 16, 16, 16, L.skin); box(40, 16, 16, 8, L.shirt)
  box(32, 48, 16, 16, L.skin); box(32, 48, 16, 8, L.shirt)
  box(0, 16, 16, 16, L.trousers); box(0, 29, 16, 3, L.shoe)
  box(16, 48, 16, 16, L.trousers); box(16, 61, 16, 3, L.shoe)
  if (L.hat) {
    box(40, 0, 8, 8, L.hat)
    box(32, 8, 32, 3, L.hat)
  }
}

interface Loaded { canvas: HTMLCanvasElement; ready: Promise<void> }
const loaded = new Map<SkinName, Loaded>()

/** The skin as a 64×64 canvas: the stand-in at once, replaced by the real skin when it loads. */
export function skinCanvas(name: SkinName): Loaded {
  const hit = loaded.get(name)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  drawFallback(name, canvas)
  const url = skinUrl(name)
  const ready = new Promise<void>((resolve) => {
    if (!url) return resolve()
    const img = new Image()
    img.onload = () => {
      const g = canvas.getContext('2d')!
      g.clearRect(0, 0, 64, 64)
      g.drawImage(img, 0, 0)
      resolve()
    }
    img.onerror = () => resolve()
    img.src = url
  })
  const l = { canvas, ready }
  loaded.set(name, l)
  return l
}

const textures = new Map<SkinName, THREE.CanvasTexture>()
export function skinTexture(name: SkinName): THREE.Texture {
  const hit = textures.get(name)
  if (hit) return hit
  const { canvas, ready } = skinCanvas(name)
  const t = new THREE.CanvasTexture(canvas)
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  t.colorSpace = THREE.SRGBColorSpace
  void ready.then(() => void (t.needsUpdate = true))
  textures.set(name, t)
  return t
}

/** Flat pictures cut from the skin: the face (8×8 + hat layer) and the whole front (16×32). */
function sprites(name: SkinName) {
  const src = skinCanvas(name).canvas
  const slim = skinModel(name) === 'slim'
  const face = document.createElement('canvas')
  face.width = face.height = 8
  const f = face.getContext('2d')!
  f.drawImage(src, 8, 8, 8, 8, 0, 0, 8, 8)
  f.drawImage(src, 40, 8, 8, 8, 0, 0, 8, 8)
  const front = document.createElement('canvas')
  front.width = 16
  front.height = 32
  const g = front.getContext('2d')!
  const part = (sx: number, sy: number, w: number, h: number, dx: number, dy: number) => g.drawImage(src, sx, sy, w, h, dx, dy, w, h)
  const aw = slim ? 3 : 4
  part(8, 8, 8, 8, 4, 0); part(40, 8, 8, 8, 4, 0) // head + hat
  part(20, 20, 8, 12, 4, 8); part(20, 36, 8, 12, 4, 8) // body + jacket
  part(44, 20, aw, 12, 4 - aw, 8); part(44, 36, aw, 12, 4 - aw, 8) // right arm (on the viewer's left)
  part(36, 52, aw, 12, 12, 8); part(52, 52, aw, 12, 12, 8) // left arm
  part(4, 20, 4, 12, 4, 20); part(4, 36, 4, 12, 4, 20) // right leg
  part(20, 52, 4, 12, 8, 20); part(4, 52, 4, 12, 8, 20) // left leg
  return { face: face.toDataURL(), front: front.toDataURL() }
}

/** Data URLs for 2D pictures of a character, updated once the real skin has loaded. */
const spriteCache = new Map<SkinName, ReturnType<typeof sprites>>()
export function useSkinSprites(name: SkinName = 'steve') {
  const [s, setS] = useState(() => spriteCache.get(name) ?? sprites(name))
  useEffect(() => {
    let live = true
    void skinCanvas(name).ready.then(() => {
      // cut once per skin, then share (many cards show Steve at once)
      if (!spriteCache.has(name)) spriteCache.set(name, sprites(name))
      if (live) setS(spriteCache.get(name)!)
    })
    return () => void (live = false)
  }, [name])
  return s
}
