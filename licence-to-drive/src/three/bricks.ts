// Procedural toy bricks. One geometry per brick size, shared by every brick of that size.
// Units: 1 = one stud pitch. A brick is 1.2 tall, a plate 0.4.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const BRICK = 1.2
export const PLATE = 0.4
export const STUD_R = 0.3
export const STUD_H = 0.2
const GAP = 0.02 // tiny gap between bricks so edges catch the light

const cache = new Map<string, THREE.BufferGeometry>()

export const studGeometry = (() => {
  let g: THREE.BufferGeometry | null = null
  return () => (g ??= new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 16).translate(0, STUD_H / 2, 0))
})()

/** A w×d brick of height h (sitting on y=0, centred on x/z), with studs unless `smooth`. */
export function brickGeometry(w: number, d: number, h: number, smooth = false): THREE.BufferGeometry {
  const id = `${w}x${d}x${h}${smooth ? 's' : ''}`
  const hit = cache.get(id)
  if (hit) return hit
  const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g)
  const body = flat(new RoundedBoxGeometry(w - GAP, h - GAP, d - GAP, 2, 0.05).translate(0, h / 2, 0))
  const parts: THREE.BufferGeometry[] = [body]
  if (!smooth) {
    const stud = flat(studGeometry())
    for (let x = 0; x < w; x++)
      for (let z = 0; z < d; z++) parts.push(stud.clone().translate(x - w / 2 + 0.5, h - GAP / 2, z - d / 2 + 0.5))
  }
  const merged = mergeGeometries(parts)!
  merged.computeBoundingSphere()
  cache.set(id, merged)
  return merged
}

const mats = new Map<string, THREE.MeshStandardMaterial>()

/** Glossy toy plastic. */
export function plastic(color: string, opts: { transparent?: boolean; emissive?: string } = {}): THREE.MeshStandardMaterial {
  const id = `${color}|${opts.transparent ? 't' : ''}|${opts.emissive ?? ''}`
  let m = mats.get(id)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.28,
      metalness: 0,
      envMapIntensity: 0.9,
      transparent: !!opts.transparent,
      opacity: opts.transparent ? 0.55 : 1,
      emissive: opts.emissive ?? '#000000',
    })
    mats.set(id, m)
  }
  return m
}

export const COLORS = {
  red: '#d32f2f',
  yellow: '#ffc61a',
  blue: '#1e6fd9',
  green: '#3fa34d',
  darkGreen: '#2d7a3a',
  white: '#f4f4f0',
  black: '#1d1d1f',
  grey: '#8a8d91',
  darkGrey: '#4a4d52',
  brown: '#7a4a24',
  glass: '#9fd6ff',
  sand: '#e6c88a',
  orange: '#f57c1f',
}

/** Place a brick by its min corner (x, z in studs) and bottom y. */
export function brick(
  w: number,
  d: number,
  h: number,
  color: string,
  x: number,
  y: number,
  z: number,
  opts: { smooth?: boolean; transparent?: boolean } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(brickGeometry(w, d, h, opts.smooth), plastic(color, opts))
  mesh.position.set(x + w / 2, y, z + d / 2)
  return mesh
}

/** A big studded baseplate. Studs are one InstancedMesh: one draw call for all of them. */
export function baseplate(w: number, d: number, color: string, skip?: (x: number, z: number) => boolean): THREE.Group {
  const g = new THREE.Group()
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w, PLATE, d).translate(0, PLATE / 2, 0), plastic(color))
  plate.receiveShadow = true
  g.add(plate)
  const spots: [number, number][] = []
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) if (!skip?.(x, z)) spots.push([x, z])
  const studs = new THREE.InstancedMesh(studGeometry(), plastic(color), spots.length)
  const m = new THREE.Matrix4()
  spots.forEach(([x, z], i) => studs.setMatrixAt(i, m.makeTranslation(x - w / 2 + 0.5, PLATE, z - d / 2 + 0.5)))
  studs.receiveShadow = true
  g.add(studs)
  return g
}
