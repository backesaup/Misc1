import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'
import { blockTexture } from './textures'

// "Make it": the world arranges things the way he chooses, so many answers can be right.
// Modes: rows (equal rows + leftovers), pairs (odd/even), split (two fields),
// tens (towers of ten + ones), share (equal shares + leftovers).
// Items: chicken, sheep, apple, brick (an original toy brick with studs), block (game block).

export const MODES = ['rows', 'pairs', 'split', 'tens', 'share'] as const
export const ITEMS = ['chicken', 'sheep', 'apple', 'brick', 'block'] as const
export type Mode = (typeof MODES)[number]
export type Item = (typeof ITEMS)[number]
const MAX = 100

interface Part { size: [number, number, number]; at: [number, number, number]; color: string; cyl?: boolean }
const PARTS: Record<Exclude<Item, 'block'>, Part[]> = {
  chicken: [
    { size: [0.5, 0.42, 0.62], at: [0, 0.3, 0], color: '#fbfaf5' },
    { size: [0.28, 0.28, 0.28], at: [0, 0.6, 0.24], color: '#fbfaf5' },
    { size: [0.08, 0.12, 0.14], at: [0, 0.8, 0.24], color: '#e0443a' },
    { size: [0.1, 0.07, 0.12], at: [0, 0.58, 0.42], color: '#f2a93b' },
    { size: [0.3, 0.1, 0.2], at: [0, 0.05, 0.05], color: '#f2a93b' },
  ],
  sheep: [
    { size: [0.62, 0.5, 0.82], at: [0, 0.48, 0], color: '#f4efe4' },
    { size: [0.3, 0.32, 0.32], at: [0, 0.6, 0.5], color: '#3a3330' },
    { size: [0.46, 0.24, 0.6], at: [0, 0.12, 0], color: '#3a3330' },
  ],
  apple: [
    { size: [0.42, 0.4, 0.42], at: [0, 0.21, 0], color: '#d8402f' },
    { size: [0.05, 0.12, 0.05], at: [0, 0.46, 0], color: '#6b4a2b' },
    { size: [0.14, 0.03, 0.08], at: [0.08, 0.46, 0], color: '#58b368' },
  ],
  brick: [
    { size: [0.78, 0.44, 0.78], at: [0, 0.22, 0], color: '#d2483c' },
    ...([[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]] as const).map(
      ([x, z]): Part => ({ size: [0.24, 0.1, 0.24], at: [x, 0.49, z], color: '#d2483c', cyl: true }),
    ),
  ],
}
const BRICK_COLOURS = ['#d2483c', '#3b6fd1', '#f2b84b', '#3f9b5a', '#e8789a', '#f4f1e8']

/** Where each of the `total` items goes for a mode and a chosen number. Leftovers are flagged. */
export function layout(mode: Mode, total: number, choice: number, extra: number) {
  const pos: { x: number; y: number; z: number; left: boolean; group: number }[] = []
  const gap = 1.1
  if (mode === 'rows' || mode === 'pairs') {
    const rows = mode === 'pairs' ? Math.max(1, Math.ceil(total / 2)) : Math.max(1, choice)
    const cols = mode === 'pairs' ? 2 : Math.floor(total / rows)
    const used = mode === 'pairs' ? total - (total % 2) : rows * cols
    for (let i = 0; i < total; i++) {
      if (i < used && cols > 0) {
        const r = Math.floor(i / cols), c = i % cols
        pos.push({ x: (c - (cols - 1) / 2) * gap, y: 0, z: (r - (Math.ceil(used / cols) - 1) / 2) * gap, left: false, group: r })
      } else {
        const k = i - used
        pos.push({ x: ((cols || 1) / 2) * gap + 1.4 + (k % 3) * gap, y: 0, z: Math.floor(k / 3) * gap, left: true, group: -1 })
      }
    }
  } else if (mode === 'split') {
    const left = Math.max(0, Math.min(total, choice))
    for (let i = 0; i < total; i++) {
      const inLeft = i < left
      const k = inLeft ? i : i - left
      pos.push({ x: (inLeft ? -2.6 : 2.6) + ((k % 3) - 1) * gap, y: 0, z: (Math.floor(k / 3) - 1.5) * gap, left: false, group: inLeft ? 0 : 1 })
    }
  } else if (mode === 'tens') {
    const tens = Math.max(0, Math.min(Math.floor(total / 10), choice))
    for (let i = 0; i < total; i++) {
      if (i < tens * 10) {
        // a ten is a rod of 10 bricks snapped together
        const t = Math.floor(i / 10)
        pos.push({ x: ((i % 10) - 4.5) * 0.8, y: 0, z: -2.4 + t * 1.05, left: false, group: t })
      } else {
        const k = i - tens * 10
        pos.push({ x: ((k % 10) - 4.5) * 0.95, y: 0, z: -2.4 + tens * 1.05 + 0.6 + Math.floor(k / 10) * 0.95, left: false, group: -2 })
      }
    }
  } else {
    // share: `extra` friends, each gets `choice`; the rest stay in the middle basket
    const friends = Math.max(1, extra)
    const each = Math.max(0, Math.min(Math.floor(total / friends), choice))
    for (let i = 0; i < total; i++) {
      if (i < each * friends) {
        const f = Math.floor(i / each), k = i % each
        const ang = (f / friends) * Math.PI * 2 - Math.PI / 2
        const cx = Math.cos(ang) * 3.4, cz = Math.sin(ang) * 2.6
        pos.push({ x: cx + ((k % 3) - 1) * 0.75, y: 0, z: cz + Math.floor(k / 3) * 0.75, left: false, group: f })
      } else {
        const k = i - each * friends
        pos.push({ x: ((k % 4) - 1.5) * 0.7, y: 0, z: Math.floor(k / 4) * 0.7 - 0.3, left: true, group: -1 })
      }
    }
  }
  return pos
}

function Items({ ctrl }: SceneProps) {
  const v = ctrl.values
  const item = ITEMS[Math.round(v.item)] ?? 'block'
  const mode = MODES[Math.round(v.mode)] ?? 'rows'
  const parts = item === 'block' ? null : PARTS[item]
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([])
  const shell = useRef<THREE.InstancedMesh>(null)
  const blockMesh = useRef<THREE.InstancedMesh>(null)
  const rings = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const cur = useRef<THREE.Vector3[]>(Array.from({ length: MAX }, () => new THREE.Vector3(0, 6, 0)))
  const tex = useMemo(() => blockTexture('planks', 4), [])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color() }), [])

  useFrame((_, dt) => {
    const total = Math.min(MAX, Math.round(v.total))
    const target = layout(mode, total, Math.round(v.choice), Math.round(v.extra))
    const k = 1 - Math.exp(-dt * 9)
    // fit everything in view
    let ext = 1
    for (const t of target) ext = Math.max(ext, Math.abs(t.x) + 0.6, Math.abs(t.z) + 0.6)
    if (mode === 'split') ext = Math.max(ext, 4.9) // keep both fenced fields in view
    if (mode === 'share') ext = Math.max(ext, 4.8)
    if (group.current) group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, Math.min(1.3, 4.8 / ext), k))
    for (let i = 0; i < MAX; i++) {
      const t = target[i]
      const on = i < total && v.shown > i
      const c = cur.current[i]
      if (t) c.lerp(tmp.p.set(t.x, t.y + (on ? 0 : 6), t.z), k)
      tmp.s.setScalar(on ? 1 : 0.0001)
      const bob = t?.left ? Math.abs(Math.sin(performance.now() / 300 + i)) * 0.15 : 0
      tmp.p.copy(c).y += bob
      if (parts) {
        parts.forEach((part, pi) => {
          const m = meshes.current[pi]
          if (!m) return
          tmp.m.compose(tmp.p.clone().add(new THREE.Vector3(...part.at)), tmp.q, tmp.s.clone().multiply(new THREE.Vector3(...part.size)))
          m.setMatrixAt(i, tmp.m)
          if (item === 'brick') m.setColorAt(i, tmp.c.set(BRICK_COLOURS[t && t.group >= 0 ? t.group % 2 === 0 ? 0 : 1 : 2]))
        })
      } else {
        tmp.m.compose(tmp.p.clone().add(new THREE.Vector3(0, 0.45, 0)), tmp.q, tmp.s.clone().multiplyScalar(0.8))
        blockMesh.current?.setMatrixAt(i, tmp.m)
        tmp.m.compose(tmp.p.clone().add(new THREE.Vector3(0, 0.45, 0)), tmp.q, tmp.s.clone().multiplyScalar(0.92))
        shell.current?.setMatrixAt(i, tmp.m)
      }
      // a glowing ring under each leftover, so they stand out
      tmp.m.compose(new THREE.Vector3(c.x, 0.02, c.z), tmp.q, tmp.s.clone().multiplyScalar(on && t?.left ? 1 : 0.0001))
      rings.current?.setMatrixAt(i, tmp.m)
    }
    for (const m of [...meshes.current, blockMesh.current, shell.current, rings.current]) {
      if (!m) continue
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  })

  return (
    <group ref={group}>
      {parts?.map((part, pi) => (
        <instancedMesh frustumCulled={false} key={`${item}-${pi}`} ref={(el) => void (meshes.current[pi] = el)} args={[undefined, undefined, MAX]} castShadow>
          {part.cyl ? <cylinderGeometry args={[0.5, 0.5, 1, 16]} /> : <boxGeometry />}
          <meshStandardMaterial color={item === 'brick' ? '#ffffff' : part.color} roughness={item === 'brick' ? 0.35 : 0.8} />
        </instancedMesh>
      ))}
      {!parts && (
        <>
          <instancedMesh frustumCulled={false} ref={blockMesh} args={[undefined, undefined, MAX]} castShadow>
            <boxGeometry />
            <meshStandardMaterial map={tex} roughness={0.85} />
          </instancedMesh>
          <instancedMesh frustumCulled={false} ref={shell} args={[undefined, undefined, MAX]}>
            <boxGeometry />
            <meshBasicMaterial color="#2b2a33" side={THREE.BackSide} />
          </instancedMesh>
        </>
      )}
      <instancedMesh frustumCulled={false} ref={rings} args={[undefined, undefined, MAX]}>
        <ringGeometry args={[0.36, 0.48, 24]} />
        <meshBasicMaterial color="#ffb703" side={THREE.DoubleSide} />
      </instancedMesh>
      <Fields ctrl={ctrl} mode={mode} />
    </group>
  )
}

/** Fences for split mode, plates for share mode, a basket for leftovers. */
function Fields({ ctrl, mode }: { ctrl: SceneProps['ctrl']; mode: Mode }) {
  const friends = Math.max(1, Math.round(ctrl.values.extra))
  if (mode === 'split')
    return (
      <>
        {[-2.6, 2.6].map((x) => (
          <mesh key={x} position={[x, 0.01, 0.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[3.9, 5.2]} />
            <meshStandardMaterial color="#9fcf86" />
          </mesh>
        ))}
        {[-2.6, 2.6].map((x) =>
          [-1, 1].map((sx) => (
            <mesh key={`${x}${sx}`} position={[x + sx * 1.95, 0.3, 0.05]}>
              <boxGeometry args={[0.1, 0.6, 5.2]} />
              <meshStandardMaterial color="#a9784d" />
            </mesh>
          )),
        )}
      </>
    )
  if (mode === 'share')
    return (
      <>
        {Array.from({ length: friends }, (_, f) => {
          const ang = (f / friends) * Math.PI * 2 - Math.PI / 2
          return (
            <mesh key={f} position={[Math.cos(ang) * 3.4, 0.02, Math.sin(ang) * 2.6 + 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[1.25, 32]} />
              <meshStandardMaterial color="#f6efe1" />
            </mesh>
          )
        })}
      </>
    )
  return null
}

function Labels({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const mode = MODES[Math.round(v.mode)] ?? 'rows'
  const total = Math.round(v.total)
  const choice = Math.round(v.choice)
  let text = ''
  if (v.shown < total || v.tried < 0.5) text = `${total}`
  else if (mode === 'rows') {
    const cols = Math.floor(total / Math.max(1, choice)), left = total - choice * cols
    text = `${choice} ${choice === 1 ? 'row' : 'rows'} of ${cols}` + (left ? `, ${left} left over` : '')
  } else if (mode === 'pairs') text = `${Math.floor(total / 2)} pairs` + (total % 2 ? ', 1 left over' : '')
  else if (mode === 'split') text = `${choice} and ${total - choice}`
  else if (mode === 'tens') text = `${choice} ${choice === 1 ? 'ten' : 'tens'} and ${total - choice * 10} ${total - choice * 10 === 1 ? 'one' : 'ones'}`
  else {
    const friends = Math.max(1, Math.round(v.extra)), left = total - choice * friends
    text = `${choice} each` + (left ? `, ${left} left over` : '')
  }
  return (
    <div className="scene-counter make-label" aria-hidden>
      <span className="tabular-nums">{text}</span>
    </div>
  )
}

export const arrange: SceneDef = {
  kind: '3d',
  camera: { position: [0, 6.8, 8.6], target: [0, 0.6, 0.2], fov: 42 },
  defaults: { total: 12, choice: 1, extra: 3, mode: 0, item: 0, shown: 0, tried: 0 },
  Component: Items,
  Overlay: Labels,
  applyParams(ctrl, p) {
    if (typeof p.item === 'string') ctrl.values.item = Math.max(0, ITEMS.indexOf(p.item as Item))
    if (typeof p.mode === 'string') ctrl.values.mode = Math.max(0, MODES.indexOf(p.mode as Mode))
    for (const k of ['total', 'choice', 'extra'] as const) if (typeof p[k] === 'number') ctrl.values[k] = p[k] as number
    ctrl.values.tried = 0
  },
  actions: {
    arrive: (ctrl, cue, { reduced }) => gsap.fromTo(ctrl.values, { shown: 0 }, { shown: ctrl.values.total, duration: dur(cue, reduced, 2), ease: 'power1.inOut' }),
    set: (ctrl, cue) => () => {
      for (const k of ['total', 'choice', 'extra'] as const) if (typeof cue[k] === 'number') ctrl.values[k] = cue[k] as number
      if (typeof cue.mode === 'string') ctrl.values.mode = Math.max(0, MODES.indexOf(cue.mode as Mode))
      if (typeof cue.item === 'string') ctrl.values.item = Math.max(0, ITEMS.indexOf(cue.item as Item))
      ctrl.values.shown = ctrl.values.total
      ctrl.values.tried = 1
    },
  },
}

