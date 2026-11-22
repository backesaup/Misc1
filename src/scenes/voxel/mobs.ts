import * as THREE from 'three'
import { useEffect, useState } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js'
import manifest from '@content/textures.json'

// Real 3D Minecraft mobs, built from Mojang's Bedrock geometry files (bedrock-samples) and their
// textures. Each mob becomes ONE merged geometry in its rest pose, in blocks (1 = a block), feet on
// y = 0, facing +z (towards the camera), so it can be drawn as an instanced mesh.
// Files are fetched by `npm run textures:fetch` / `npm run build`; until then useMob() returns null
// and scenes keep their simple built-in shapes.

export type MobName = 'chicken' | 'sheep' | 'pig' | 'cow' | 'iron_golem' | 'wolf' | 'bee' | 'rabbit' | 'fox' | 'villager' | 'llama' | 'parrot' | 'cod' | 'frog' | 'tadpole' | 'turtle' | 'goat' | 'panda' | 'chick'
type FileRef = { file: string }
const MODELS = (manifest as unknown as { models: Record<string, { id: string; geo: FileRef; texture: FileRef; hide?: string[]; textureSize?: number[]; overlay?: FileRef & { y: number } }> }).models
const urls = import.meta.glob<string>('../../assets/textures/models/*', { eager: true, query: '?url', import: 'default' })
const urlOf = (f: FileRef) => urls[`../../assets/textures/${f.file}`]
export const hasMob = (name: MobName) => !!(MODELS[name] && urlOf(MODELS[name].geo) && urlOf(MODELS[name].texture))

type FaceUV = { uv: number[]; uv_size: number[] }
interface Cube { origin: number[]; size: number[]; uv?: number[] | Record<string, FaceUV>; inflate?: number; mirror?: boolean; rotation?: number[]; pivot?: number[] }
interface Bone { name: string; parent?: string; pivot?: number[]; rotation?: number[]; bind_pose_rotation?: number[]; cubes?: Cube[]; mirror?: boolean; inflate?: number; neverRender?: boolean }
interface Geo { bones: Bone[]; tw: number; th: number }

/** `size` (from content/textures.json) wins over the size the file declares. Finds a geometry by id in either Bedrock format (1.12+ array, or 1.8 keyed with inheritance). */
function findGeometry(json: Record<string, unknown>, id: string, size?: number[]): Geo | null {
  const list = json['minecraft:geometry'] as { description: { identifier: string; texture_width?: number; texture_height?: number }; bones?: Bone[] }[] | undefined
  if (list) {
    const g = list.find((x) => x.description.identifier === id)
    if (g) return { bones: g.bones ?? [], tw: size?.[0] ?? g.description.texture_width ?? 64, th: size?.[1] ?? g.description.texture_height ?? 32 }
  }
  for (const [key, val] of Object.entries(json)) {
    const [name, parent] = key.split(':')
    if (name !== id) continue
    const v = val as { bones?: Bone[]; texturewidth?: number; textureheight?: number }
    const base = parent ? findGeometry(json, parent, size) : null
    // a child bone with the parent's name adds its cubes (e.g. the sheep's wool over its body)
    const bones = new Map<string, Bone>((base?.bones ?? []).map((b) => [b.name, { ...b, cubes: [...(b.cubes ?? [])] }]))
    for (const b of v.bones ?? []) {
      const had = bones.get(b.name)
      bones.set(b.name, had ? { ...had, ...b, cubes: [...(had.cubes ?? []), ...(b.cubes ?? [])] } : b)
    }
    return { bones: [...bones.values()], tw: size?.[0] ?? v.texturewidth ?? base?.tw ?? 64, th: size?.[1] ?? v.textureheight ?? base?.th ?? 32 }
  }
  return null
}

const D = THREE.MathUtils.DEG2RAD
/** Rotation about a pivot, converted from Bedrock space (x mirrored) to three.js. */
function pivotRotation(pivot: number[] = [0, 0, 0], rot: number[] = [0, 0, 0]) {
  const p = new THREE.Vector3(-pivot[0], pivot[1], pivot[2])
  const r = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-rot[0] * D, -rot[1] * D, rot[2] * D, 'ZYX'))
  return new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(r).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z))
}

// Box faces in BoxGeometry order (+x, -x, +y, -y, +z, -z). The mob faces -z here (turned at the end).
// For each: the axis the texture's left→right runs along (as seen from outside), and its top→bottom axis.
const FACE_AXES: { s: [number, number]; t: [number, number] }[] = [
  { s: [2, -1], t: [1, -1] }, // +x: the mob's right side
  { s: [2, 1], t: [1, -1] }, // -x: the mob's left side
  { s: [0, -1], t: [2, -1] }, // top
  { s: [0, -1], t: [2, -1] }, // bottom
  { s: [0, 1], t: [1, -1] }, // +z: back
  { s: [0, -1], t: [1, -1] }, // -z: front
]
const FACE_NAMES = ['west', 'east', 'up', 'down', 'south', 'north'] // Bedrock names (x is mirrored)

function cubeGeometry(c: Cube, boneMirror: boolean, boneInflate: number, tw: number, th: number) {
  const [w, h, d] = c.size
  const inf = c.inflate ?? boneInflate
  const g = new THREE.BoxGeometry(Math.max(w + inf * 2, 0.001), Math.max(h + inf * 2, 0.001), Math.max(d + inf * 2, 0.001))
  const mirror = c.mirror ?? boneMirror
  const pos = g.attributes.position
  const uv = g.attributes.uv
  const half = [w / 2 + inf, h / 2 + inf, d / 2 + inf]
  for (let f = 0; f < 6; f++) {
    // texture rectangle for this face, in texture pixels
    let rect: number[] | null = null
    if (Array.isArray(c.uv) || !c.uv) {
      const [u, v] = (c.uv as number[] | undefined) ?? [0, 0]
      const box: Record<string, number[]> = {
        west: [u, v + d, d, h], // mob's right side
        east: [u + d + w, v + d, d, h],
        up: [u + d, v, w, d],
        down: [u + d + w, v, w, d],
        north: [u + d, v + d, w, h],
        south: [u + d * 2 + w, v + d, w, h],
      }
      let name = FACE_NAMES[f]
      if (mirror && (name === 'west' || name === 'east')) name = name === 'west' ? 'east' : 'west'
      rect = box[name]
    } else {
      const fu = (c.uv as Record<string, FaceUV>)[FACE_NAMES[f]]
      if (fu) rect = [fu.uv[0], fu.uv[1], fu.uv_size[0], fu.uv_size[1]]
    }
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k
      if (!rect) {
        uv.setXY(i, 0, 0)
        continue
      }
      const ax = FACE_AXES[f]
      const val = (a: [number, number]) => (pos.getComponent(i, a[0]) * a[1]) / (half[a[0]] * 2) + 0.5
      let s = val(ax.s)
      const t = val(ax.t)
      if (mirror) s = 1 - s
      uv.setXY(i, (rect[0] + s * rect[2]) / tw, 1 - (rect[1] + t * rect[3]) / th)
    }
  }
  uv.needsUpdate = true
  // place it: Bedrock origin is the min corner, x mirrored
  const cx = -(c.origin[0] + w / 2), cy = c.origin[1] + h / 2, cz = c.origin[2] + d / 2
  const m = new THREE.Matrix4().makeTranslation(cx, cy, cz)
  if (c.rotation) m.premultiply(pivotRotation(c.pivot ?? [c.origin[0] + w / 2, cy, cz], c.rotation))
  g.applyMatrix4(m)
  return g
}

/** Builds one merged geometry from a Bedrock geometry: rest pose, in blocks, facing +z. */
export function buildMobGeometry(json: Record<string, unknown>, id: string, hide: string[] = [], size?: number[]): THREE.BufferGeometry | null {
  const geo = findGeometry(json, id, size)
  if (!geo) return null
  const byName = new Map(geo.bones.map((b) => [b.name, b]))
  const boneMatrix = new Map<string, THREE.Matrix4>()
  const matrixOf = (b: Bone, depth = 0): THREE.Matrix4 => {
    const hit = boneMatrix.get(b.name)
    if (hit) return hit
    const parent = b.parent && depth < 32 ? byName.get(b.parent) : undefined
    // `rotation` turns the bone and its children; `bind_pose_rotation` only its own cubes (see below)
    const m = (parent ? matrixOf(parent, depth + 1).clone() : new THREE.Matrix4()).multiply(pivotRotation(b.pivot, b.rotation))
    boneMatrix.set(b.name, m)
    return m
  }
  const parts: THREE.BufferGeometry[] = []
  for (const b of geo.bones) {
    if (b.neverRender || !b.cubes?.length || hide.includes(b.name)) continue
    const m = b.bind_pose_rotation ? matrixOf(b).clone().multiply(pivotRotation(b.pivot, b.bind_pose_rotation)) : matrixOf(b)
    for (const c of b.cubes) {
      const g = cubeGeometry(c, !!b.mirror, b.inflate ?? 0, geo.tw, geo.th)
      g.applyMatrix4(m)
      parts.push(g.index ? g.toNonIndexed() : g)
    }
  }
  if (!parts.length) return null
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  if (!merged) return null
  merged.scale(1 / 16, 1 / 16, 1 / 16)
  merged.rotateY(Math.PI) // face the camera
  merged.computeBoundingBox()
  merged.translate(0, -(merged.boundingBox?.min.y ?? 0), 0) // feet on the ground
  merged.computeVertexNormals()
  merged.computeBoundingBox()
  return merged
}

export interface MobModel { geometry: THREE.BufferGeometry; material: THREE.Material; height: number; length: number }
const cache = new Map<MobName, Promise<MobModel | null>>()

export function loadMob(name: MobName): Promise<MobModel | null> {
  const hit = cache.get(name)
  if (hit) return hit
  const entry = MODELS[name]
  const geoUrl = entry && urlOf(entry.geo)
  const texUrl = entry && urlOf(entry.texture)
  const p = (async () => {
    if (!geoUrl || !texUrl) return null
    try {
      const json = await (await fetch(geoUrl)).json()
      const geometry = buildMobGeometry(json, entry.id, entry.hide, entry.textureSize)
      if (!geometry) return null
      let map: THREE.Texture
      const ovUrl = entry.overlay && urlOf(entry.overlay)
      if (ovUrl && entry.overlay) {
        // two images stacked into one texture (Java sheep body + its wool, as the Bedrock model expects)
        const [a, b] = await Promise.all([texUrl, ovUrl].map((u) => new THREE.ImageLoader().loadAsync(u)))
        const c = document.createElement('canvas')
        c.width = entry.textureSize?.[0] ?? a.width
        c.height = entry.textureSize?.[1] ?? a.height + b.height
        const g = c.getContext('2d')!
        g.drawImage(a, 0, 0)
        g.drawImage(b, 0, entry.overlay.y)
        map = new THREE.CanvasTexture(c)
      } else if (texUrl.endsWith('.tga')) {
        map = await new TGALoader().loadAsync(texUrl)
        map.flipY = true // raw rows arrive top first; match how PNG images are uploaded
      } else {
        map = await new THREE.TextureLoader().loadAsync(texUrl)
      }
      map.magFilter = THREE.NearestFilter
      map.minFilter = THREE.NearestFilter
      map.colorSpace = THREE.SRGBColorSpace
      map.generateMipmaps = false
      map.needsUpdate = true
      const material = new THREE.MeshStandardMaterial({ map, roughness: 0.9, alphaTest: 0.1, side: THREE.DoubleSide })
      const bb = geometry.boundingBox!
      return { geometry, material, height: bb.max.y - bb.min.y, length: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) }
    } catch {
      return null
    }
  })()
  cache.set(name, p)
  return p
}

/** The mob's model once loaded (null while loading or when its files weren't fetched). */
export function useMob(name: MobName | null): MobModel | null {
  const [m, setM] = useState<MobModel | null>(null)
  useEffect(() => {
    let live = true
    setM(null)
    if (name) void loadMob(name).then((x) => live && setM(x))
    return () => void (live = false)
  }, [name])
  return m
}
