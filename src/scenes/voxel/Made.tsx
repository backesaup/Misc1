import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'
import { SceneHtml } from '../SceneHtml'
import { Steve, MOODS, type Mood } from './Steve'

// How real things are made: a chair, a table, a staircase, a car, a train carriage and an iPad,
// drawn as real-looking objects (not Minecraft blocks), with Steve alongside.
// The story of making is told with a few shared values:
//   raw     0→1 the raw material appears (a log, a steel coil, a block of aluminium…)
//   cut     0→1 the raw material turns into the separate parts, laid out on the floor
//   build   0→1 the parts fly into place one after another (tween to part-way values to pause)
//   finish  0→1 varnish / paint / screen on
//   explode 0→1 pull the finished object apart to see inside
// plus a test for each object (sit, wobble, climb, drive, roll, touch).

export const OBJECTS = ['chair', 'table', 'stairs', 'car', 'train', 'ipad'] as const
type ObjectName = (typeof OBJECTS)[number]
type V3 = [number, number, number]

interface PartSpec {
  id: string
  label?: string
  home: V3
  homeRot?: V3
  flat: V3
  flatRot?: V3
  explode?: V3
  labelAt?: V3
  node: ReactNode
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

// ---------- materials ----------
function woodTexture(base: [number, number, number], seed = 3) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')!
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  for (let y = 0; y < 64; y++) {
    const wave = Math.sin(y * 0.35 + rnd() * 0.4) * 10
    for (let x = 0; x < 256; x++) {
      const grain = Math.sin((x + wave * 2) * 0.09 + Math.sin(y * 0.11) * 2) * 0.5 + 0.5
      const k = 0.82 + grain * 0.22 + (rnd() - 0.5) * 0.05
      g.fillStyle = `rgb(${base.map((v) => Math.round(Math.min(255, v * k))).join(',')})`
      g.fillRect(x, y, 1, 1)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function useMats() {
  return useMemo(() => {
    const wood = woodTexture([196, 150, 98])
    const darkWood = woodTexture([140, 96, 58], 9)
    return {
      wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.75 }),
      varnish: new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
      darkWood: new THREE.MeshStandardMaterial({ map: darkWood, roughness: 0.7 }),
      bark: new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.95 }),
      endGrain: new THREE.MeshStandardMaterial({ color: '#d9b27c', roughness: 0.9 }),
      steel: new THREE.MeshStandardMaterial({ color: '#a9b0b8', metalness: 0.85, roughness: 0.35 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: '#4a4f57', metalness: 0.7, roughness: 0.45 }),
      alu: new THREE.MeshStandardMaterial({ color: '#d4d7dc', metalness: 0.9, roughness: 0.28 }),
      paint: new THREE.MeshPhysicalMaterial({ color: '#a9b0b8', metalness: 0.5, roughness: 0.35, clearcoat: 0, clearcoatRoughness: 0.1 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#9fc4dd', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.35 }),
      darkGlass: new THREE.MeshPhysicalMaterial({ color: '#1d2a36', metalness: 0.2, roughness: 0.1, clearcoat: 1 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#222326', roughness: 0.95 }),
      red: new THREE.MeshStandardMaterial({ color: '#d2483c', roughness: 0.45 }),
      blue: new THREE.MeshStandardMaterial({ color: '#3b6fd1', roughness: 0.5, metalness: 0.2 }),
      yellow: new THREE.MeshStandardMaterial({ color: '#f2b84b', roughness: 0.5 }),
      board: new THREE.MeshStandardMaterial({ color: '#1f3b2c', roughness: 0.6 }),
      chip: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.4, metalness: 0.3 }),
      battery: new THREE.MeshStandardMaterial({ color: '#c3c8cf', roughness: 0.5, metalness: 0.4 }),
      seat: new THREE.MeshStandardMaterial({ color: '#33363d', roughness: 0.85 }),
      light: new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff1b8', emissiveIntensity: 0.8 }),
      tail: new THREE.MeshStandardMaterial({ color: '#c0202a', emissive: '#c0202a', emissiveIntensity: 0.4 }),
    }
  }, [])
}
type Mats = ReturnType<typeof useMats>

const Box = ({ s, m, r = 0 }: { s: V3; m: THREE.Material; r?: number }) =>
  r > 0 ? (
    <RoundedBox args={s} radius={r} smoothness={3} material={m} castShadow receiveShadow />
  ) : (
    <mesh material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  )

// ---------- the objects ----------
function chairParts(fin: THREE.Material): PartSpec[] {
  const leg = (id: string, x: number, z: number, h: number, i: number, label?: string): PartSpec => ({
    id, label, home: [x, h / 2, z], flat: [-2.2, 0.04, -0.9 + i * 0.3], flatRot: [0, 0, Math.PI / 2], explode: [x * 1.6, 0, z * 1.6], node: <Box s={[0.09, h, 0.09]} m={fin} />, labelAt: [0, -h / 2 + 0.3, 0],
  })
  return [
    leg('legFL', 0.42, 0.42, 1, 0, 'leg'), leg('legFR', -0.42, 0.42, 1, 1), leg('backL', 0.42, -0.42, 2, 2), leg('backR', -0.42, -0.42, 2, 3),
    { id: 'railF', label: 'rail', home: [0, 0.9, 0.42], flat: [-1.2, 0.03, 1.4], explode: [0, -0.3, 0.9], node: <Box s={[0.76, 0.1, 0.05]} m={fin} /> },
    { id: 'railB', home: [0, 0.9, -0.42], flat: [-1.2, 0.03, 1.7], explode: [0, -0.3, -0.9], node: <Box s={[0.76, 0.1, 0.05]} m={fin} /> },
    { id: 'railL', home: [0.42, 0.9, 0], flat: [-0.2, 0.03, 1.4], flatRot: [0, Math.PI / 2, 0], explode: [0.9, -0.3, 0], node: <Box s={[0.05, 0.1, 0.76]} m={fin} /> },
    { id: 'railR', home: [-0.42, 0.9, 0], flat: [-0.2, 0.03, 1.7], flatRot: [0, Math.PI / 2, 0], explode: [-0.9, -0.3, 0], node: <Box s={[0.05, 0.1, 0.76]} m={fin} /> },
    { id: 'seat', label: 'seat', home: [0, 1.0, 0], flat: [1.6, 0.04, 0.4], explode: [0, 0.7, 0], node: <Box s={[1.0, 0.07, 1.0]} m={fin} r={0.03} />, labelAt: [0, 0.15, 0.45] },
    { id: 'backTop', label: 'back', home: [0, 1.88, -0.42], flat: [1.6, 0.03, -0.8], flatRot: [Math.PI / 2, 0, 0], explode: [0, 0.6, -0.8], node: <Box s={[0.84, 0.18, 0.05]} m={fin} r={0.02} /> },
    { id: 'backMid', home: [0, 1.5, -0.42], flat: [1.6, 0.03, -1.3], flatRot: [Math.PI / 2, 0, 0], explode: [0, 0.3, -0.8], node: <Box s={[0.84, 0.08, 0.05]} m={fin} /> },
  ]
}
const Log = ({ m }: { m: Mats }) => (
  <group rotation={[0, 0, Math.PI / 2]} position={[0, 0.42, 0]}>
    <mesh material={[m.bark, m.endGrain, m.endGrain]} castShadow>
      <cylinderGeometry args={[0.42, 0.45, 2.6, 24]} />
    </mesh>
  </group>
)

function tableParts(fin: THREE.Material, legs: number): PartSpec[] {
  if (legs === 3) {
    const ps: PartSpec[] = [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2
      const x = Math.cos(a) * 0.62, z = Math.sin(a) * 0.62
      return { id: `leg${i}`, label: i === 0 ? 'leg' : undefined, home: [x, 0.72, z] as V3, flat: [-2.2, 0.06, -0.6 + i * 0.4] as V3, flatRot: [0, 0, Math.PI / 2] as V3, explode: [x, 0, z] as V3, node: <Box s={[0.12, 1.44, 0.12]} m={fin} />, labelAt: [0, -0.4, 0] as V3 }
    })
    ps.push({ id: 'top', label: 'top', home: [0, 1.5, 0], flat: [1.4, 0.05, 0.2], explode: [0, 1, 0], labelAt: [0, 0.2, 0.7], node: (
      <mesh material={fin} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 0.95, 0.1, 48]} />
      </mesh>
    ) })
    return ps
  }
  const leg = (id: string, x: number, z: number, i: number, label?: string): PartSpec => ({
    id, label, home: [x, 0.72, z], flat: [-2.4, 0.06, -0.9 + i * 0.4], flatRot: [0, 0, Math.PI / 2], explode: [x * 0.9, 0, z * 1.4], node: <Box s={[0.12, 1.44, 0.12]} m={fin} />, labelAt: [0, -0.4, 0],
  })
  return [
    leg('legA', 0.95, 0.5, 0, 'leg'), leg('legB', -0.95, 0.5, 1), leg('legC', 0.95, -0.5, 2), leg('legD', -0.95, -0.5, 3),
    { id: 'apronF', label: 'rail', home: [0, 1.36, 0.5], flat: [-0.6, 0.05, 1.5], explode: [0, -0.2, 0.8], node: <Box s={[1.78, 0.16, 0.05]} m={fin} /> },
    { id: 'apronB', home: [0, 1.36, -0.5], flat: [-0.6, 0.05, 1.8], explode: [0, -0.2, -0.8], node: <Box s={[1.78, 0.16, 0.05]} m={fin} /> },
    { id: 'apronL', home: [0.95, 1.36, 0], flat: [0.9, 0.05, 1.6], flatRot: [0, Math.PI / 2, 0], explode: [0.8, -0.2, 0], node: <Box s={[0.05, 0.16, 0.88]} m={fin} /> },
    { id: 'apronR', home: [-0.95, 1.36, 0], flat: [1.2, 0.05, 1.6], flatRot: [0, Math.PI / 2, 0], explode: [-0.8, -0.2, 0], node: <Box s={[0.05, 0.16, 0.88]} m={fin} /> },
    { id: 'top', label: 'top', home: [0, 1.5, 0], flat: [1.3, 0.05, -0.2], explode: [0, 1, 0], labelAt: [0, 0.2, 0.7], node: <Box s={[2.3, 0.1, 1.3]} m={fin} r={0.04} /> },
  ]
}

const STAIR_H = 2.4
/** How deep each step is: narrower when there are many, so the stairs fit on screen. */
const goingFor = (n: number) => Math.min(0.5, 4.2 / n)
function stairParts(m: Mats, fin: THREE.Material, n: number, odd: boolean): PartSpec[] {
  const rise = STAIR_H / n
  const GOING = goingFor(n)
  const run = n * GOING
  const slope = Math.atan2(STAIR_H, run)
  const len = Math.hypot(STAIR_H, run)
  const ps: PartSpec[] = []
  for (const z of [0.62, -0.62])
    ps.push({ id: `stringer${z > 0 ? 'A' : 'B'}`, label: z > 0 ? 'stringer' : undefined, home: [run / 2 - 0.05, STAIR_H / 2 - 0.12, z], homeRot: [0, 0, slope], flat: [run / 2, 0.04, z > 0 ? 2.2 : 2.6], flatRot: [Math.PI / 2, 0, 0], explode: [0, 0, z * 1.5], node: <Box s={[len, 0.3, 0.06]} m={fin} />, labelAt: [-0.6, -0.3, 0.1] })
  for (let i = 0; i < n; i++) {
    const extra = odd && i === 3 ? 0.22 : 0
    ps.push({ id: `riser${i}`, home: [i * GOING, i * rise + rise / 2 + extra / 2, 0], flat: [-1.8, 0.03, -1.2 + i * 0.3], flatRot: [0, 0, Math.PI / 2], explode: [-0.3, 0, 0], node: <Box s={[0.03, rise + extra, 1.2]} m={fin} /> })
    ps.push({ id: `tread${i}`, label: i === 1 ? 'step' : undefined, home: [i * GOING + GOING / 2, (i + 1) * rise + extra, 0], flat: [-0.9 + (i % 3) * 0.6, 0.03 + Math.floor(i / 3) * 0.06, -1.6], flatRot: [0, Math.PI / 2, 0], explode: [0, 0.5, 0], node: <Box s={[GOING + 0.05, 0.05, 1.3]} m={fin} r={0.015} />, labelAt: [0, 0.12, 0.7] })
  }
  ps.push({ id: 'rail', label: 'handrail', home: [run / 2, STAIR_H / 2 + 0.95, 0.68], homeRot: [0, 0, slope], flat: [run / 2, 0.04, 3.0], explode: [0, 0.6, 0.8], labelAt: [0.3, 0.15, 0], node: <Box s={[len, 0.07, 0.07]} m={m.darkWood} r={0.03} /> })
  for (let i = 0; i < n; i++)
    ps.push({ id: `bal${i}`, home: [i * GOING + GOING / 2, (i + 1) * rise + 0.5, 0.68], flat: [-2.6, 0.02, -1.2 + i * 0.2], flatRot: [0, 0, Math.PI / 2], explode: [0, 0.3, 0.8], node: <Box s={[0.04, 0.9, 0.04]} m={m.darkWood} /> })
  return ps
}

function carParts(m: Mats): PartSpec[] {
  const body = new THREE.Shape()
  body.moveTo(-2.1, 0.35)
  body.lineTo(-1.8, 0.35)
  body.absarc(-1.35, 0.35, 0.45, Math.PI, 0, true)
  body.lineTo(0.9, 0.35)
  body.absarc(1.35, 0.35, 0.45, Math.PI, 0, true)
  body.lineTo(2.1, 0.35)
  body.lineTo(2.15, 0.75)
  body.lineTo(1.2, 0.95)
  body.lineTo(0.55, 1.38)
  body.lineTo(-0.85, 1.4)
  body.lineTo(-1.65, 0.98)
  body.lineTo(-2.15, 0.9)
  body.closePath()
  const bodyGeo = new THREE.ExtrudeGeometry(body, { depth: 1.6, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 18 })
  bodyGeo.translate(0, 0, -0.8)
  const win = new THREE.Shape()
  win.moveTo(1.12, 0.99)
  win.lineTo(0.55, 1.33)
  win.lineTo(-0.82, 1.35)
  win.lineTo(-1.55, 1.0)
  win.closePath()
  const winGeo = new THREE.ExtrudeGeometry(win, { depth: 1.8, bevelEnabled: false })
  winGeo.translate(0, 0.005, -0.9)
  const wheel = (id: string, x: number, z: number, label?: string): PartSpec => ({
    id, label, home: [x, 0.38, z], flat: [x > 0 ? 3.1 : -3.1, 0.38, z > 0 ? -1.2 : -1.9], flatRot: [0, 0, 0], explode: [x * 0.3, 0, z * 1.8], labelAt: [0, 0.5, 0],
    node: (
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={m.rubber} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.26, 32]} />
        </mesh>
        <mesh material={m.steel} position={[0, z > 0 ? -0.135 : 0.135, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, 24]} />
        </mesh>
      </group>
    ),
  })
  return [
    { id: 'floor', label: 'floor pan', home: [0, 0.3, 0], flat: [0, 0.04, -2.9], explode: [0, -0.2, 0], node: <Box s={[4.0, 0.06, 1.55]} m={m.darkSteel} />, labelAt: [-1.6, 0.1, 0.8] },
    { id: 'body', label: 'body', home: [0, 0, 0], flat: [0, 0, 0], explode: [0, 1.4, 0], labelAt: [0.8, 1.3, 0.9], node: <mesh geometry={bodyGeo} material={m.paint} castShadow receiveShadow /> },
    { id: 'battery', label: 'battery', home: [0, 0.42, 0], flat: [-1.6, 0.1, -3.0], explode: [0, -0.6, 0], node: <Box s={[2.4, 0.14, 1.3]} m={m.blue} r={0.03} />, labelAt: [0, 0.15, 0.7] },
    { id: 'motor', label: 'motor', home: [-1.35, 0.42, 0], flat: [-3.4, 0.25, -3.0], explode: [-0.8, -0.6, 0], labelAt: [0, 0.3, 0.4], node: (
      <mesh material={m.steel} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.7, 24]} />
      </mesh>
    ) },
    { id: 'seats', label: 'seats', home: [0, 0.6, 0], flat: [1.6, 0.2, -3.2], explode: [0, 2.6, 0], labelAt: [0.3, 0.6, 0.5], node: (
      <group>
        {[[0.2, 0.38], [0.2, -0.38], [-0.75, 0.38], [-0.75, -0.38]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <Box s={[0.5, 0.12, 0.5]} m={m.seat} r={0.04} />
            <group position={[-0.24, 0.3, 0]} rotation={[0, 0, -0.15]}>
              <Box s={[0.1, 0.6, 0.48]} m={m.seat} r={0.04} />
            </group>
          </group>
        ))}
      </group>
    ) },
    { id: 'glass', label: 'windows', home: [0, 0, 0], flat: [3.4, -0.9, -3.1], explode: [0, 2.2, 0], labelAt: [-0.4, 1.45, 0.9], node: <mesh geometry={winGeo} material={m.darkGlass} /> },
    wheel('wheelFL', 1.35, 0.8, 'wheel'), wheel('wheelFR', 1.35, -0.8), wheel('wheelBL', -1.35, 0.8), wheel('wheelBR', -1.35, -0.8),
    { id: 'lights', home: [2.14, 0.72, 0], flat: [4.2, 0.05, -2.4], explode: [0.7, 0, 0], node: (
      <group>
        {[0.55, -0.55].map((z) => (
          <group key={z} position={[0, 0, z]}>
            <Box s={[0.06, 0.12, 0.34]} m={m.light} r={0.02} />
          </group>
        ))}
        {[0.55, -0.55].map((z) => (
          <group key={`t${z}`} position={[-4.3, 0.12, z]}>
            <Box s={[0.06, 0.12, 0.3]} m={m.tail} r={0.02} />
          </group>
        ))}
      </group>
    ) },
  ]
}

function trainWheelGeo() {
  // a wheel with a slightly cone-shaped tread and a flange on the inside
  const pts = [new THREE.Vector2(0, -0.1), new THREE.Vector2(0.36, -0.1), new THREE.Vector2(0.36, -0.06), new THREE.Vector2(0.31, -0.05), new THREE.Vector2(0.29, 0.09), new THREE.Vector2(0, 0.09)]
  return new THREE.LatheGeometry(pts, 40)
}
function trainParts(m: Mats): PartSpec[] {
  const wheelGeo = trainWheelGeo()
  const ps: PartSpec[] = []
  for (const bx of [2.2, -2.2]) {
    ps.push({ id: `bogie${bx > 0 ? 'A' : 'B'}`, label: bx > 0 ? 'bogie' : undefined, home: [bx, 0.5, 0], flat: [bx * 1.2, 0.12, 2.4], explode: [0, -0.2, 0], labelAt: [0, 0.4, 0.8], node: (
      <group>
        <Box s={[1.7, 0.18, 1.0]} m={m.darkSteel} />
        {[0.55, -0.55].map((ax) => (
          <group key={ax} position={[ax, -0.12, 0]}>
            <mesh material={m.steel} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.5, 12]} />
            </mesh>
            {[0.72, -0.72].map((z) => (
              <mesh key={z} geometry={wheelGeo} material={m.steel} position={[0, 0, z]} rotation={[z > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0]} castShadow />
            ))}
          </group>
        ))}
      </group>
    ) })
  }
  ps.push(
    { id: 'frame', label: 'underframe', home: [0, 0.76, 0], flat: [0, 0.08, -2.4], explode: [0, 0.4, 0], labelAt: [-2.4, 0.2, 0.75], node: <Box s={[6.2, 0.16, 1.3]} m={m.darkSteel} /> },
    { id: 'body', label: 'body', home: [0, 1.62, 0], flat: [0, 0.75, 0], explode: [0, 1.8, 0], labelAt: [1.6, 0.9, 0.8], node: <Box s={[6.2, 1.55, 1.45]} m={m.paint} r={0.25} /> },
    { id: 'windows', label: 'windows', home: [0, 1.92, 0], flat: [-3.6, 0.03, 0.6], flatRot: [Math.PI / 2, 0, 0], explode: [0, 1.8, 0], labelAt: [-1.4, 0.4, 0.8], node: <Box s={[5.4, 0.45, 1.48]} m={m.darkGlass} r={0.05} /> },
    { id: 'doors', label: 'doors', home: [0, 1.42, 0], flat: [3.6, 0.03, 0.6], flatRot: [Math.PI / 2, 0, 0], explode: [0, 1.8, 0], labelAt: [1.3, 0.75, 0.8], node: (
      <group>
        {[1.3, -1.3].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <Box s={[0.7, 1.15, 1.5]} m={m.yellow} r={0.04} />
          </group>
        ))}
      </group>
    ) },
    { id: 'stripe', home: [0, 1.15, 0], flat: [0, 0.03, 3.2], flatRot: [Math.PI / 2, 0, 0], explode: [0, 1.8, 0], node: <Box s={[6.22, 0.12, 1.47]} m={m.red} /> },
  )
  return ps
}

function ipadParts(m: Mats, screen: THREE.Material, touch: THREE.Material): PartSpec[] {
  // lying flat (y is the thickness); the whole iPad is tilted towards the camera by the group
  const L = (id: string, y: number, k: number, node: ReactNode, label?: string, labelAt?: V3): PartSpec => ({ id, label, home: [0, y, 0], flat: [0, y, 0], explode: [0, k * 0.55, 0], node, labelAt })
  return [
    L('shell', 0.04, 0, <Box s={[2.6, 0.08, 1.85]} m={m.alu} r={0.035} />, 'aluminium case', [1.3, 0, 0.9]),
    L('battery', 0.1, 1, (
      <group>
        {[-0.55, 0.45].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <Box s={[0.85, 0.04, 1.4]} m={m.battery} r={0.01} />
          </group>
        ))}
      </group>
    ), 'battery', [0, 0.05, 0.75]),
    L('board', 0.1, 2, (
      <group position={[1.08, 0, 0]}>
        <Box s={[0.3, 0.02, 1.5]} m={m.board} />
        <group position={[0, 0.02, -0.2]}>
          <Box s={[0.2, 0.03, 0.2]} m={m.chip} />
        </group>
        <group position={[0, 0.02, 0.25]}>
          <Box s={[0.14, 0.03, 0.14]} m={m.chip} />
        </group>
      </group>
    ), 'chip', [1.08, 0.08, -0.2]),
    L('speakers', 0.1, 2.5, (
      <group>
        {[[1.2, 0.8], [1.2, -0.8], [-1.2, 0.8], [-1.2, -0.8]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <Box s={[0.14, 0.04, 0.1]} m={m.darkSteel} />
          </group>
        ))}
        <mesh position={[1.15, 0.0, -0.75]} material={m.chip}>
          <cylinderGeometry args={[0.06, 0.06, 0.05, 20]} />
        </mesh>
      </group>
    ), 'speakers', [-1.2, 0.05, 0.8]),
    L('display', 0.135, 3.5, <Box s={[2.5, 0.02, 1.75]} m={screen} />, 'screen', [-0.9, 0.05, 0.85]),
    L('touch', 0.15, 4.5, <Box s={[2.5, 0.006, 1.75]} m={touch} />, 'touch layer', [0.9, 0.05, -0.85]),
    L('glass', 0.162, 5.5, <Box s={[2.58, 0.02, 1.83]} m={m.glass} r={0.008} />, 'glass', [0, 0.05, 0.9]),
  ]
}

// ---------- shared machinery ----------
function Part({ spec, i, n, ctrl, showLabel }: { spec: PartSpec; i: number; n: number; ctrl: SceneProps['ctrl']; showLabel: boolean }) {
  const g = useRef<THREE.Group>(null)
  const qa = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(...(spec.flatRot ?? [0, 0, 0]))), [spec.flatRot])
  const qb = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(...(spec.homeRot ?? [0, 0, 0]))), [spec.homeRot])
  useFrame(() => {
    if (!g.current) return
    const v = ctrl.values
    const appear = ease(clamp01(v.cut * 1.5 - (i / n) * 0.5))
    const t = ease(clamp01(v.build * n - i))
    const e = v.explode
    const p = g.current.position
    p.set(
      THREE.MathUtils.lerp(spec.flat[0], spec.home[0], t) + (spec.explode?.[0] ?? 0) * e,
      THREE.MathUtils.lerp(spec.flat[1] + (1 - appear) * 2, spec.home[1], t) + (spec.explode?.[1] ?? 0) * e + Math.sin(Math.PI * t) * 0.6,
      THREE.MathUtils.lerp(spec.flat[2], spec.home[2], t) + (spec.explode?.[2] ?? 0) * e,
    )
    g.current.quaternion.slerpQuaternions(qa, qb, t)
    g.current.scale.setScalar(Math.max(0.0001, appear))
  })
  return (
    <group ref={g}>
      {spec.node}
      {spec.label && (
        <SceneHtml position={spec.labelAt ?? [0, 0.3, 0]} center zIndexRange={[10, 0]}>
          <div className="scene-tag small" style={{ display: showLabel ? undefined : 'none' }}>{spec.label}</div>
        </SceneHtml>
      )}
    </group>
  )
}

/** Two factory robot arms that weld with sparks (car body shop). */
function Robots({ on }: { on: number }) {
  const arms = useRef<(THREE.Group | null)[]>([])
  const sparks = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(60 * 3), 3))
    return g
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    arms.current.forEach((a, k) => {
      if (!a) return
      a.rotation.y = Math.sin(t * 1.3 + k) * 0.4 + (k ? 0 : Math.PI)
      ;(a.children[1] as THREE.Object3D).rotation.z = -0.6 + Math.sin(t * 2 + k) * 0.2
    })
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < 60; i++) {
      const side = i % 2 ? 1 : -1
      const life = (t * 3 + i * 0.37) % 1
      pos.setXYZ(i, side * 2.0 + Math.sin(i * 12.9) * 0.3 * life, 0.9 + life * 0.5 - life * life * 1.2, -0.2 + Math.cos(i * 7.3) * 0.3 * life)
    }
    pos.needsUpdate = true
    if (sparks.current) sparks.current.visible = on > 0.5 && Math.sin(t * 9) > -0.3
  })
  if (on < 0.01) return null
  return (
    <group scale={on}>
      {[1, -1].map((side, k) => (
        <group key={side} position={[side * 3.0, 0, -0.4]} ref={(el) => void (arms.current[k] = el)}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.45, 0.6, 20]} />
            <meshStandardMaterial color="#f2a93b" roughness={0.5} />
          </mesh>
          <group position={[0, 0.6, 0]}>
            <mesh position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[0.25, 1.2, 0.25]} />
              <meshStandardMaterial color="#f2a93b" roughness={0.5} />
            </mesh>
            <group position={[0, 1.2, 0]} rotation={[0, 0, -1.1]}>
              <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[0.2, 1.0, 0.2]} />
                <meshStandardMaterial color="#f2a93b" roughness={0.5} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
      <points ref={sparks} geometry={geo}>
        <pointsMaterial color="#ffd166" size={0.08} />
      </points>
    </group>
  )
}

function Track() {
  return (
    <group>
      {[0.72, -0.72].map((z) => (
        <mesh key={z} position={[0, 0.1, z]} receiveShadow>
          <boxGeometry args={[16, 0.1, 0.08]} />
          <meshStandardMaterial color="#8c8f96" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i} position={[-8 + i * 0.7, 0.03, 0]} receiveShadow>
          <boxGeometry args={[0.2, 0.06, 2.0]} />
          <meshStandardMaterial color="#6b5a48" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function screenTexture() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 360
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, 512, 360)
  grd.addColorStop(0, '#3b6fd1')
  grd.addColorStop(1, '#e8789a')
  g.fillStyle = grd
  g.fillRect(0, 0, 512, 360)
  const cols = ['#ffd166', '#58b368', '#ff6b5c', '#4f8ff0', '#f2f2f2', '#e8892f']
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < 6; k++) {
      g.fillStyle = cols[(r * 6 + k) % cols.length]
      g.beginPath()
      g.roundRect(40 + k * 76, 36 + r * 76, 52, 52, 12)
      g.fill()
    }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function touchTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.strokeStyle = 'rgba(120,200,255,0.9)'
  g.lineWidth = 2
  for (let i = 0; i <= 256; i += 16) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke()
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 2)
  return t
}

// ---------- the scene ----------
const STEVE_HOME: Record<ObjectName, V3> = { chair: [-1.5, 0, -1.0], table: [-1.9, 0, -1.3], stairs: [-1.3, 0, 0], car: [0, 0, -1.8], train: [-1.4, 0, -2.1], ipad: [-2.0, 0, -0.9] }
const SCALE: Record<ObjectName, number> = { chair: 1.2, table: 1.1, stairs: 0.95, car: 0.95, train: 0.72, ipad: 1.25 }

function Made({ ctrl, activePart }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const obj: ObjectName = OBJECTS[Math.round(v.object)] ?? 'chair'
  const m = useMats()
  const n = Math.max(3, Math.round(v.steps))
  const legs = Math.round(v.legs) === 3 ? 3 : 4
  const odd = v.odd > 0.5
  const screenMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0e12', roughness: 0.3, emissive: '#ffffff', emissiveMap: screenTexture(), emissiveIntensity: 0 }), [])
  const touchMat = useMemo(() => new THREE.MeshBasicMaterial({ map: touchTexture(), transparent: true, opacity: 0.55, depthWrite: false }), [])
  const fin = v.finish > 0.5 ? m.varnish : m.wood
  const parts = useMemo(() => {
    switch (obj) {
      case 'chair': return chairParts(fin)
      case 'table': return tableParts(fin, legs)
      case 'stairs': return stairParts(m, fin, n, odd)
      case 'car': return carParts(m)
      case 'train': return trainParts(m)
      default: return ipadParts(m, screenMat, touchMat)
    }
  }, [obj, m, fin, legs, n, odd, screenMat, touchMat])

  const whole = useRef<THREE.Group>(null)
  const rawRef = useRef<THREE.Group>(null)
  const ripple = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // paint: grey steel turns red (car) or a train livery
    const c = obj === 'train' ? '#e9eef4' : '#c8302c'
    m.paint.color.set('#a9b0b8').lerp(new THREE.Color(c), v.finish)
    m.paint.clearcoat = v.finish
    screenMat.emissiveIntensity = v.finish * 1.1
    if (rawRef.current) {
      const s = ease(clamp01(v.raw)) * (1 - ease(clamp01(v.cut * 1.4)))
      rawRef.current.scale.setScalar(Math.max(0.0001, s))
      rawRef.current.visible = s > 0.001
    }
    if (whole.current) {
      const w = whole.current
      w.position.set(0, 0, 0)
      w.rotation.set(0, v.spin, 0)
      if (obj === 'table' && v.test > 0.5) {
        // one leg on a bump: 4 legs rock, 3 legs stand firm (three points always touch)
        if (legs === 4) {
          w.rotation.x = Math.sin(t * 3) * 0.035
          w.rotation.z = Math.sin(t * 3) * 0.035
          w.position.y = 0.05
        } else {
          w.rotation.z = -0.04
          w.position.y = 0.04
        }
      }
      if (obj === 'car') w.position.x = v.test * 3.2
      if (obj === 'train') w.position.x = Math.sin(v.test * Math.PI) * 2.5
      if (obj === 'ipad') w.rotation.x = -1.05 * (1 - v.explode * 0.35)
    }
    if (ripple.current) {
      const k = v.touch
      ripple.current.visible = k > 0.01 && k < 0.99
      ripple.current.scale.setScalar(0.2 + k * 1.2)
      ;(ripple.current.material as THREE.MeshBasicMaterial).opacity = 1 - k
    }
  })

  const showAll = ctrl.labels.tags === 'on'
  const hot = ctrl.labels.hot ?? ''
  // Steve: stands beside it; sits on the chair; climbs the stairs one step at a time
  const steveMood: Mood = (MOODS[Math.round(v.steveMood)] ?? 'idle') as Mood
  let stevePos: V3 = STEVE_HOME[obj]
  let turn = 0.6
  let sitting = false
  if (obj === 'chair' && v.sit > 0.5) {
    stevePos = [0, 0.32, 0.05]
    turn = 0
    sitting = true
  }
  if (obj === 'stairs') {
    const s = Math.max(0, Math.min(n, v.climb))
    const k = Math.floor(s), f = s - k
    const rise = STAIR_H / n
    const GOING = goingFor(n)
    const yAt = (i: number) => (i <= 0 ? 0 : i * rise + (odd && i - 1 === 3 ? 0.22 : 0))
    const xAt = (i: number) => (i <= 0 ? -0.7 : (i - 1) * GOING + GOING / 2)
    const y = THREE.MathUtils.lerp(yAt(k), yAt(Math.min(n, k + 1)), f) + Math.sin(Math.PI * f) * 0.25
    stevePos = [THREE.MathUtils.lerp(xAt(k), xAt(Math.min(n, k + 1)), f), y, -0.1]
    turn = Math.PI / 2
  }
  return (
    <group scale={SCALE[obj]}>
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 5]} scale={[10, 4, 1]} />
        <Lightformer intensity={1} position={[-6, 3, -4]} scale={[6, 3, 1]} />
        <Lightformer intensity={0.8} color="#ffe2b0" position={[6, 2, -3]} scale={[6, 3, 1]} />
      </Environment>
      {obj === 'train' && <Track />}
      {obj === 'stairs' && (
        <group>
          <mesh position={[n * goingFor(n) + 0.7, STAIR_H / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.4, STAIR_H, 1.6]} />
            <meshStandardMaterial color="#efe6d6" roughness={0.9} />
          </mesh>
          <SceneHtml position={[n * goingFor(n) + 0.7, STAIR_H + 0.25, 0.85]} center zIndexRange={[10, 0]}>
            <div className="scene-tag small">upstairs</div>
          </SceneHtml>
        </group>
      )}
      <group ref={rawRef}>
        {(obj === 'chair' || obj === 'table') && <Log m={m} />}
        {obj === 'stairs' && (
          <group position={[0.6, 0, 0]}>
            {Array.from({ length: 8 }, (_, i) => (
              <group key={i} position={[0, 0.06 + i * 0.12, ((i % 2) - 0.5) * 0.15]}>
                <Box s={[3, 0.1, 0.45]} m={m.wood} />
              </group>
            ))}
          </group>
        )}
        {obj === 'car' && (
          <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.steel} castShadow>
            <cylinderGeometry args={[0.9, 0.9, 1.6, 40]} />
          </mesh>
        )}
        {obj === 'train' && (
          <group position={[0, 0.3, 0]}>
            {Array.from({ length: 9 }, (_, i) => (
              <mesh key={i} position={[0, 0.12 + Math.floor(i / 3) * 0.22, ((i % 3) - 1) * 0.3]} rotation={[0, 0, Math.PI / 2]} material={m.alu} castShadow>
                <boxGeometry args={[0.2, 6, 0.2]} />
              </mesh>
            ))}
          </group>
        )}
        {obj === 'ipad' && (
          <group position={[0, 0.3, 0]}>
            <Box s={[2.8, 0.6, 2.0]} m={m.alu} />
          </group>
        )}
      </group>
      <group ref={whole}>
        {parts.map((p, i) => (
          <Part key={`${obj}-${p.id}`} spec={p} i={i} n={parts.length} ctrl={ctrl} showLabel={showAll || [hot, activePart].some((h) => !!h && (h === p.id || h === p.label))} />
        ))}
        {obj === 'ipad' && (
          <mesh ref={ripple} position={[0.4, 0.2 + v.explode * 4.5 * 0.55, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.15, 0.22, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        )}
      </group>
      {obj === 'car' && <Robots on={v.robots} />}
      {v.steve > 0.5 && <SteveAt pos={stevePos} turn={turn} mood={steveMood} sitting={sitting} />}
    </group>
  )
}

function SteveAt({ pos, turn, mood, sitting }: { pos: V3; turn: number; mood: Mood; sitting: boolean }) {
  return <Steve mood={sitting ? 'sit' : mood} pos={pos} turn={turn} />
}

function aimFor(ctrl: SceneProps['ctrl']): V3 {
  const obj = OBJECTS[Math.round(ctrl.values.object)] ?? 'chair'
  if (obj === 'stairs') return [2.0, 1.2, 0]
  if (obj === 'train') return [0, 1.0, 0]
  if (obj === 'car') return [ctrl.values.test * 1.5, 0.8, 0]
  return [0, 1.0, 0]
}

export const made: SceneDef = {
  kind: '3d',
  camera: { position: [3.8, 4.2, 7.6], target: [0, 1, 0], fov: 42 },
  aim: aimFor,
  defaults: { object: 0, raw: 0, cut: 0, build: 0, finish: 0, explode: 0, spin: 0, test: 0, steve: 1, steveMood: 0, sit: 0, climb: 0, steps: 6, odd: 0, legs: 4, robots: 0, touch: 0 },
  Component: Made,
  applyParams(ctrl, p) {
    if (typeof p.object === 'string') ctrl.values.object = Math.max(0, OBJECTS.indexOf(p.object as ObjectName))
    for (const k of ['raw', 'cut', 'build', 'finish', 'explode', 'steps', 'legs', 'climb'] as const) if (typeof p[k] === 'number') ctrl.values[k] = p[k] as number
    for (const k of ['steve', 'odd'] as const) if (typeof p[k] === 'boolean') ctrl.values[k] = p[k] ? 1 : 0
    if (p.tags === true) ctrl.labels.tags = 'on'
  },
  actions: {
    raw: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { raw: Number(cue.to ?? 1), duration: dur(cue, reduced, 1.2), ease: 'back.out(1.4)' }),
    cut: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { cut: Number(cue.to ?? 1), duration: dur(cue, reduced, 2), ease: 'power1.inOut' }),
    build: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { build: Number(cue.to ?? 1), duration: dur(cue, reduced, 4), ease: 'none' }),
    finish: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { finish: Number(cue.to ?? 1), duration: dur(cue, reduced, 1.5), ease: 'power1.inOut' }),
    explode: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { explode: Number(cue.to ?? 1), duration: dur(cue, reduced, 1.6), ease: 'power2.inOut' }),
    spin: (ctrl, cue, { reduced }) => (reduced ? () => {} : gsap.to(ctrl.values, { spin: `+=${Number(cue.turns ?? 1) * Math.PI * 2}`, duration: dur(cue, reduced, 6), ease: 'sine.inOut' })),
    test: (ctrl, cue, { reduced }) => gsap.fromTo(ctrl.values, { test: Number(cue.from ?? 0) }, { test: Number(cue.to ?? 1), duration: dur(cue, reduced, 3), ease: 'power1.inOut' }),
    /** Set object params at once: legs (3/4), steps, odd, robots. */
    set: (ctrl, cue) => () => {
      for (const k of ['legs', 'steps', 'robots', 'object'] as const) if (typeof cue[k] === 'number') ctrl.values[k] = cue[k] as number
      if (typeof cue.object === 'string') ctrl.values.object = Math.max(0, OBJECTS.indexOf(cue.object as ObjectName))
      if (cue.odd !== undefined) ctrl.values.odd = cue.odd ? 1 : 0
      if (cue.robots !== undefined) ctrl.values.robots = cue.robots ? 1 : 0
    },
    tags: (ctrl, cue) => () => void (ctrl.labels.tags = cue.on === false ? '' : 'on'),
    hot: (ctrl, cue) => () => void (ctrl.labels.hot = String(cue.part ?? '')),
    steve: (ctrl, cue) => () => {
      if (cue.on !== undefined) ctrl.values.steve = cue.on === false ? 0 : 1
      if (typeof cue.mood === 'string') ctrl.values.steveMood = Math.max(0, MOODS.indexOf(cue.mood as Mood))
      if (cue.sit !== undefined) ctrl.values.sit = cue.sit ? 1 : 0
    },
    climb: (ctrl, cue, { reduced }) =>
      cue.from !== undefined
        ? gsap.fromTo(ctrl.values, { climb: Number(cue.from) }, { climb: Number(cue.to ?? 1), duration: dur(cue, reduced, 4), ease: 'none' })
        : gsap.to(ctrl.values, { climb: Number(cue.to ?? 1), duration: dur(cue, reduced, 4), ease: 'none' }),
    touch: (ctrl, cue, { reduced }) => gsap.fromTo(ctrl.values, { touch: 0 }, { touch: 1, duration: dur(cue, reduced, 1.2), ease: 'power1.out', repeat: Number(cue.repeat ?? 2) }),
  },
}
