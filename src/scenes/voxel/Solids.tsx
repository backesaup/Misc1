import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'

// 3D shapes: cube, cuboid, cylinder, sphere, cone, pyramid. Light up the faces (each a colour),
// the edges (thick lines) or the corners (dots); roll them to see which roll; unfold a cube
// into a flat net and fold it back.

export const SOLIDS = ['cube', 'cuboid', 'cylinder', 'sphere', 'cone', 'pyramid'] as const
const FACE_COLS = ['#ff6b5c', '#4f8ff0', '#ffd166', '#58b368', '#e8789a', '#c9945c']

function geometryFor(i: number) {
  switch (SOLIDS[i]) {
    case 'cuboid': return new THREE.BoxGeometry(2.6, 1.4, 1.6)
    case 'cylinder': return new THREE.CylinderGeometry(1, 1, 2, 40)
    case 'sphere': return new THREE.SphereGeometry(1.2, 40, 24)
    case 'cone': return new THREE.ConeGeometry(1.2, 2.2, 40)
    case 'pyramid': return new THREE.ConeGeometry(1.4, 2, 4)
    default: return new THREE.BoxGeometry(2, 2, 2)
  }
}

function Edges({ geo, show }: { geo: THREE.BufferGeometry; show: number }) {
  const { segs, verts } = useMemo(() => {
    const e = new THREE.EdgesGeometry(geo, 30)
    const p = e.attributes.position
    const segs: { mid: THREE.Vector3; len: number; q: THREE.Quaternion }[] = []
    const vset = new Map<string, THREE.Vector3>()
    for (let i = 0; i < p.count; i += 2) {
      const a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, i + 1)
      segs.push({ mid: a.clone().add(b).multiplyScalar(0.5), len: a.distanceTo(b), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()) })
      for (const v of [a, b]) vset.set(v.toArray().map((n) => n.toFixed(2)).join(','), v)
    }
    return { segs, verts: [...vset.values()] }
  }, [geo])
  return (
    <>
      {show === 1 &&
        segs.map((s, i) => (
          <mesh key={i} position={s.mid} quaternion={s.q}>
            <cylinderGeometry args={[0.06, 0.06, s.len, 8]} />
            <meshStandardMaterial color="#2b2a33" emissive="#ffd166" emissiveIntensity={0.3} />
          </mesh>
        ))}
      {show === 2 &&
        verts.map((v, i) => (
          <mesh key={i} position={v}>
            <sphereGeometry args={[0.16, 16, 10]} />
            <meshStandardMaterial color="#e0443a" emissive="#e0443a" emissiveIntensity={0.4} />
          </mesh>
        ))}
    </>
  )
}

function Solid({ ctrl }: SceneProps) {
  const v = ctrl.values
  const kind = Math.round(v.shape)
  const geo = useMemo(() => geometryFor(kind), [kind])
  const g = useRef<THREE.Group>(null)
  const mats = useMemo(
    () => (kind <= 1 ? FACE_COLS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })) : [new THREE.MeshStandardMaterial({ color: '#4f8ff0', roughness: 0.5 })]),
    [kind],
  )
  useTicker()
  useFrame(() => {
    if (!g.current) return
    const rolls = kind === 2 || kind === 3 || kind === 4
    g.current.position.x = rolls ? v.roll * 3 : v.roll * 0.3
    g.current.rotation.set(rolls ? 0 : 0, v.spin, rolls && kind !== 4 ? -v.roll * 3 : 0)
    if (kind === 2 && v.roll > 0) g.current.rotation.x = Math.PI / 2
  })
  const faces = v.highlight === 0
  const single = new THREE.MeshStandardMaterial({ color: '#dfe4ee', roughness: 0.6 })
  return (
    <group position={[0, kind === 1 ? 0.7 : kind === 3 ? 1.2 : 1, 0]}>
      <group ref={g}>
        <mesh geometry={geo} material={faces ? (mats.length > 1 ? mats : mats[0]) : single} castShadow />
        <Edges geo={geo} show={Math.round(v.highlight)} />
      </group>
    </group>
  )
}

/** A cube net: 6 squares in a cross that fold up (fold 1) or lie flat (fold 0). */
function Net({ ctrl }: SceneProps) {
  const v = ctrl.values
  const s = 1.6
  const flaps = useRef<(THREE.Group | null)[]>([])
  useFrame(() => {
    const a = (v.fold * Math.PI) / 2
    const f = flaps.current
    if (f[0]) f[0].rotation.x = -a // front
    if (f[1]) f[1].rotation.x = a // back
    if (f[2]) f[2].rotation.z = a // left
    if (f[3]) f[3].rotation.z = -a // right
    if (f[4]) f[4].rotation.x = a // top (on the back flap)
  })
  const sq = (c: string) => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <planeGeometry args={[s * 0.98, s * 0.98]} />
      <meshStandardMaterial color={c} side={THREE.DoubleSide} />
    </mesh>
  )
  return (
    <group position={[0, 0.02, 0.6]}>
      {sq(FACE_COLS[0])}
      <group position={[0, 0, s / 2]} ref={(el) => void (flaps.current[0] = el)}>
        <group position={[0, 0, s / 2]}>{sq(FACE_COLS[1])}</group>
      </group>
      <group position={[0, 0, -s / 2]} ref={(el) => void (flaps.current[1] = el)}>
        <group position={[0, 0, -s / 2]}>
          {sq(FACE_COLS[2])}
          <group position={[0, 0, -s / 2]} ref={(el) => void (flaps.current[4] = el)}>
            <group position={[0, 0, -s / 2]}>{sq(FACE_COLS[5])}</group>
          </group>
        </group>
      </group>
      <group position={[-s / 2, 0, 0]} ref={(el) => void (flaps.current[2] = el)}>
        <group position={[-s / 2, 0, 0]}>{sq(FACE_COLS[3])}</group>
      </group>
      <group position={[s / 2, 0, 0]} ref={(el) => void (flaps.current[3] = el)}>
        <group position={[s / 2, 0, 0]}>{sq(FACE_COLS[4])}</group>
      </group>
    </group>
  )
}

function Scene(props: SceneProps) {
  return props.ctrl.values.net > 0.5 ? <Net {...props} /> : <Solid {...props} />
}

function Count({ ctrl }: SceneProps) {
  useTicker()
  const text = ctrl.labels.count
  if (!text) return null
  return (
    <div className="scene-counter make-label" aria-hidden>
      <span>{text}</span>
    </div>
  )
}

export const solids: SceneDef = {
  kind: '3d',
  camera: { position: [4.2, 4.4, 6.2], target: [0, 0.9, 0], fov: 42 },
  defaults: { shape: 0, highlight: 0, roll: 0, spin: 0.5, net: 0, fold: 1 },
  Component: Scene,
  Overlay: Count,
  applyParams(ctrl, p) {
    if (typeof p.shape === 'string') ctrl.values.shape = Math.max(0, SOLIDS.indexOf(p.shape as (typeof SOLIDS)[number]))
    if (typeof p.highlight === 'string') ctrl.values.highlight = ['faces', 'edges', 'corners', 'plain'].indexOf(p.highlight)
    if (typeof p.net === 'boolean') ctrl.values.net = p.net ? 1 : 0
    if (typeof p.fold === 'number') ctrl.values.fold = p.fold
    if (typeof p.count === 'string') ctrl.labels.count = p.count
  },
  actions: {
    show: (ctrl, cue) => () => {
      if (typeof cue.shape === 'string') ctrl.values.shape = Math.max(0, SOLIDS.indexOf(cue.shape as (typeof SOLIDS)[number]))
      if (typeof cue.highlight === 'string') ctrl.values.highlight = ['faces', 'edges', 'corners', 'plain'].indexOf(cue.highlight)
      if (typeof cue.count === 'string') ctrl.labels.count = cue.count
      if (cue.net !== undefined) ctrl.values.net = cue.net ? 1 : 0
      ctrl.values.roll = 0
    },
    roll: (ctrl, cue, { reduced }) => gsap.fromTo(ctrl.values, { roll: 0 }, { roll: 1, duration: dur(cue, reduced, 2), ease: 'power1.inOut' }),
    spin: (ctrl, cue, { reduced }) => (reduced ? () => {} : gsap.to(ctrl.values, { spin: `+=${Number(cue.turns ?? 1) * Math.PI * 2}`, duration: dur(cue, reduced, 3), ease: 'sine.inOut' })),
    fold: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { fold: Number(cue.to ?? 1), duration: dur(cue, reduced, 2.4), ease: 'power2.inOut', onStart: () => void (ctrl.values.net = 1) }),
  },
}
