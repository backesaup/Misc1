import * as THREE from 'three'
import { useEffect, useState } from 'react'

// Java block models in 3D: vanilla Minecraft and mods (Create cogwheels, Farmer's Delight cooking
// pot, MrCrayfish furniture…). Files come from scripts/fetch-blockmodels.mjs (`blockModels` in
// content/textures.json). A model becomes one geometry with a material per texture, 1 block = 1
// unit, centred on x/z, standing on y = 0. useBlockModel() returns null until it is ready or when the
// files weren't fetched, so scenes can fall back to their own shapes.

export type BlockModelName =
  | 'cogwheel' | 'large_cogwheel' | 'shaft' | 'gearbox' | 'hand_crank' | 'encased_fan' | 'millstone' | 'mechanical_press'
  | 'cooking_pot' | 'stove' | 'cutting_board'
  | 'chair' | 'table' | 'stool' | 'desk' | 'sofa' | 'lamp' | 'fridge'
  | 'oak_stairs' | 'crafting_table' | 'furnace' | 'oak_door'

const files = import.meta.glob<string>('../../assets/textures/blockmodels/**/*', { eager: true, query: '?url', import: 'default' })
const fileUrl = (rel: string) => files[`../../assets/textures/blockmodels/${rel}`]
export const hasBlockModel = (name: BlockModelName) => !!fileUrl(`${name}.json`)

interface Face { uv?: number[]; texture: string; rotation?: number }
interface Element { from: number[]; to: number[]; rotation?: { origin: number[]; axis: 'x' | 'y' | 'z'; angle: number; rescale?: boolean }; faces: Partial<Record<FaceName, Face>> }
type FaceName = 'north' | 'south' | 'east' | 'west' | 'up' | 'down'

// Corners of each face as seen from outside: top-left, top-right, bottom-right, bottom-left.
// Each corner picks from (0) or to (1) on x, y, z.
const CORNERS: Record<FaceName, [number, number, number][]> = {
  north: [[1, 1, 0], [0, 1, 0], [0, 0, 0], [1, 0, 0]],
  south: [[0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]],
  east: [[1, 1, 1], [1, 1, 0], [1, 0, 0], [1, 0, 1]],
  west: [[0, 1, 0], [0, 1, 1], [0, 0, 1], [0, 0, 0]],
  up: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]],
  down: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]],
}
/** The game's default UVs when a face gives none. */
function defaultUV(f: FaceName, a: number[], b: number[]) {
  switch (f) {
    case 'north': return [16 - b[0], 16 - b[1], 16 - a[0], 16 - a[1]]
    case 'south': return [a[0], 16 - b[1], b[0], 16 - a[1]]
    case 'east': return [16 - b[2], 16 - b[1], 16 - a[2], 16 - a[1]]
    case 'west': return [a[2], 16 - b[1], b[2], 16 - a[1]]
    case 'up': return [a[0], a[2], b[0], b[2]]
    default: return [a[0], 16 - b[2], b[0], 16 - a[2]]
  }
}

export interface BlockModel { geometry: THREE.BufferGeometry; materials: THREE.Material[]; size: THREE.Vector3 }

function build(json: { elements: Element[]; textures: Record<string, string> }, maps: Map<string, { tex: THREE.Texture; vScale: number }>) {
  const texIds = [...maps.keys()]
  const pos: number[] = [], uvs: number[] = [], groups: { start: number; count: number; mat: number }[] = []
  // collect triangles per texture so each texture is one draw group
  const perTex = new Map<number, { p: number[]; u: number[] }>()
  // the fetch script already followed #references, so a face's "#name" is a key of json.textures
  const resolve = (ref: string) => {
    const k = ref.startsWith('#') ? ref.slice(1) : ref
    return json.textures[k] ? k : null
  }
  for (const el of json.elements) {
    const a = el.from, b = el.to
    let rot: THREE.Matrix4 | null = null
    if (el.rotation && el.rotation.angle) {
      const o = new THREE.Vector3(...el.rotation.origin)
      const ang = THREE.MathUtils.degToRad(el.rotation.angle)
      const axis = new THREE.Vector3(el.rotation.axis === 'x' ? 1 : 0, el.rotation.axis === 'y' ? 1 : 0, el.rotation.axis === 'z' ? 1 : 0)
      rot = new THREE.Matrix4().makeTranslation(o.x, o.y, o.z).multiply(new THREE.Matrix4().makeRotationAxis(axis, ang))
      if (el.rotation.rescale) {
        const s = 1 / Math.cos(ang)
        rot.multiply(new THREE.Matrix4().makeScale(axis.x ? 1 : s, axis.y ? 1 : s, axis.z ? 1 : s))
      }
      rot.multiply(new THREE.Matrix4().makeTranslation(-o.x, -o.y, -o.z))
    }
    for (const [fname, face] of Object.entries(el.faces) as [FaceName, Face][]) {
      const key = resolve(face.texture)
      const ti = key ? texIds.indexOf(key) : -1
      if (ti < 0) continue
      const vScale = maps.get(key!)!.vScale
      const uv = face.uv ?? defaultUV(fname, a, b)
      const corners = CORNERS[fname].map(([x, y, z]) => {
        const v = new THREE.Vector3(x ? b[0] : a[0], y ? b[1] : a[1], z ? b[2] : a[2])
        return rot ? v.applyMatrix4(rot) : v
      })
      // uv corners TL, TR, BR, BL, turned by the face's rotation (clockwise steps of 90°)
      const uc = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]
      const steps = (((face.rotation ?? 0) / 90) % 4 + 4) % 4
      const ucr = uc.map((_, i) => uc[(i + 4 - steps) % 4])
      const bucket = perTex.get(ti) ?? { p: [], u: [] }
      for (const i of [0, 3, 2, 0, 2, 1]) {
        const c = corners[i]
        bucket.p.push(c.x, c.y, c.z)
        bucket.u.push(ucr[i][0] / 16, 1 - (ucr[i][1] / 16) * vScale)
      }
      perTex.set(ti, bucket)
    }
  }
  for (const [ti, b] of perTex) {
    groups.push({ start: pos.length / 3, count: b.p.length / 3, mat: ti })
    pos.push(...b.p)
    uvs.push(...b.u)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  for (const gr of groups) g.addGroup(gr.start, gr.count, gr.mat)
  g.scale(1 / 16, 1 / 16, 1 / 16)
  g.computeVertexNormals()
  g.computeBoundingBox()
  const bb = g.boundingBox!
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2)
  g.computeBoundingBox()
  const size = new THREE.Vector3()
  g.boundingBox!.getSize(size)
  const materials = texIds.map((k) => new THREE.MeshStandardMaterial({ map: maps.get(k)!.tex, roughness: 0.85, alphaTest: 0.1, side: THREE.DoubleSide }))
  return { geometry: g, materials, size }
}

const cache = new Map<BlockModelName, Promise<BlockModel | null>>()
export function loadBlockModel(name: BlockModelName): Promise<BlockModel | null> {
  const hit = cache.get(name)
  if (hit) return hit
  const p = (async () => {
    const url = fileUrl(`${name}.json`)
    if (!url) return null
    try {
      const json = await (await fetch(url)).json()
      const maps = new Map<string, { tex: THREE.Texture; vScale: number }>()
      const loader = new THREE.TextureLoader()
      await Promise.all(
        Object.entries(json.textures as Record<string, string>).map(async ([k, rel]) => {
          const u = fileUrl(rel)
          if (!u) return
          const tex = await loader.loadAsync(u)
          tex.magFilter = THREE.NearestFilter
          tex.minFilter = THREE.NearestFilter
          tex.colorSpace = THREE.SRGBColorSpace
          tex.generateMipmaps = false
          const img = tex.image as HTMLImageElement
          // animated textures are tall strips of frames: show the first frame
          maps.set(k, { tex, vScale: img.height > img.width ? img.width / img.height : 1 })
        }),
      )
      return build(json, maps)
    } catch {
      return null
    }
  })()
  cache.set(name, p)
  return p
}

export function useBlockModel(name: BlockModelName | null): BlockModel | null {
  const [m, setM] = useState<BlockModel | null>(null)
  useEffect(() => {
    let live = true
    setM(null)
    if (name) void loadBlockModel(name).then((x) => live && setM(x))
    return () => void (live = false)
  }, [name])
  return m
}
