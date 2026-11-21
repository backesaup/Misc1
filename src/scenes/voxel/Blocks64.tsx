import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { SceneHtml as Html } from '../SceneHtml'
import * as THREE from 'three'
import gsap from 'gsap'
import { clamp } from '@/lib/utils'
import { sfx } from '@/lib/sfx'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'
import { blockTexture } from './textures'

const N = 64
const LAYOUTS = ['wall', 'square', 'cube'] as const

// Cube positions use bit order, so the first 1, 2, 4, 8 … 64 blocks always form
// a doubling shape: 1 → 1×2 → 2×2 → 2×2×2 → 4×2×2 → 4×4×2 → 4×4×4.
function layoutPos(layout: number, i: number, out: THREE.Vector3) {
  if (layout === 0) return out.set((i % 8) - 3.5, Math.floor(i / 8) + 0.5, 0)
  if (layout === 1) return out.set((i % 8) - 3.5, 0.5, Math.floor(i / 8) - 3.5)
  const b = (k: number) => (i >> k) & 1
  return out.set(b(0) + 2 * b(3) - 1.5, b(2) + 2 * b(5) + 0.5, b(1) + 2 * b(4) - 1.5)
}
const cubeLayer = (i: number) => ((i >> 2) & 1) + 2 * ((i >> 5) & 1)

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const LIT = new THREE.Color(1.35, 1.12, 0.55)
const PLAIN = new THREE.Color(1, 1, 1)

function Blocks({ ctrl }: SceneProps) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const tex = useMemo(() => blockTexture('planks', 3), [])
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color() }), [])
  const landed = useRef(0)
  const shell = useRef<THREE.InstancedMesh>(null)

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const v = ctrl.values
    const A = v.layoutA, B = v.layoutB
    for (let i = 0; i < N; i++) {
      layoutPos(A, i, tmp.a)
      layoutPos(B, i, tmp.b)
      // staggered morph with a little hop
      const t = easeInOut(clamp(v.mix * 1.5 - (i / (N - 1)) * 0.5))
      tmp.a.lerp(tmp.b, t)
      tmp.a.y += Math.sin(Math.PI * t) * 1.1
      // appear / disappear
      const p = clamp(v.visible - i)
      tmp.a.y += (1 - p) * (1 - p) * 6
      const s = p <= 0 ? 0.0001 : p < 1 ? 0.75 + 0.25 * p : 1
      // the block itself, a little smaller than its cell…
      tmp.s.setScalar(s * 0.86)
      tmp.m.compose(tmp.a, tmp.q, tmp.s)
      m.setMatrixAt(i, tmp.m)
      // …inside a dark shell, so every block has a thick outline and can be counted
      tmp.s.setScalar(s * 0.985)
      tmp.m.compose(tmp.a, tmp.q, tmp.s)
      shell.current?.setMatrixAt(i, tmp.m)
      // highlighting while we count
      const row = Math.floor(i / 8)
      const lit = (v.rowLit > 0 && row < v.rowLit) || (v.layerLit > 0 && cubeLayer(i) < v.layerLit)
      m.setColorAt(i, lit ? LIT : PLAIN)
    }
    m.instanceMatrix.needsUpdate = true
    if (shell.current) shell.current.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    if (group.current) group.current.rotation.y = v.spinY
    // a soft tick as blocks land (throttled)
    const n = Math.floor(v.visible)
    if (n > landed.current && n % 4 === 0) sfx.block()
    landed.current = n
  })

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, N]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={shell} args={[undefined, undefined, N]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#2b2a33" side={THREE.BackSide} />
      </instancedMesh>
      <SideLabels ctrl={ctrl} />
      <RunningTotals ctrl={ctrl} />
    </group>
  )
}

function SideLabels({ ctrl }: { ctrl: SceneProps['ctrl'] }) {
  useTicker()
  const v = ctrl.values
  const o = v.sides
  const cube = v.layoutB === 2
  const half = cube ? 2 : 4
  const spots: [string | undefined, [number, number, number]][] = cube
    ? [
        [ctrl.labels.a, [0, 0.1, half + 0.7]],
        [ctrl.labels.b, [half + 0.7, 0.1, 0]],
        [ctrl.labels.c, [-half - 0.9, 2, half + 0.2]],
      ]
    : [
        [ctrl.labels.a, [0, 0.1, half + 0.8]],
        [ctrl.labels.b, [half + 0.8, 0.1, 0]],
      ]
  return (
    <>
      {[0, 1, 2].map((k) => {
        const [text, pos] = spots[k] ?? [undefined, [0, -50, 0] as [number, number, number]]
        return (
          <Html key={k} position={pos} center zIndexRange={[10, 0]}>
            <div className="scene-tag" style={{ opacity: o, transform: `scale(${0.9 + 0.1 * o})`, display: text && o > 0.01 ? undefined : 'none' }}>
              {text}
            </div>
          </Html>
        )
      })}
    </>
  )
}

/** Running totals beside each row (8, 16, 24 …) or layer (16, 32 …) as we count. */
const ROW_TAGS = Array.from({ length: 8 }, (_, r) => ({ text: String((r + 1) * 8), pos: [4.7, 0.5, r - 3.5] as [number, number, number] }))
const LAYER_TAGS = Array.from({ length: 4 }, (_, l) => ({ text: String((l + 1) * 16), pos: [-2.9, l + 0.5, 2.2] as [number, number, number] }))

function RunningTotals({ ctrl }: { ctrl: SceneProps['ctrl'] }) {
  useTicker()
  const v = ctrl.values
  const rows = v.counterMode === 2 && v.layoutB === 1 ? Math.floor(v.rowLit + 0.001) : 0
  const layers = v.counterMode === 3 && v.layoutB === 2 ? Math.floor(v.layerLit + 0.001) : 0
  return (
    <>
      {ROW_TAGS.map((t, i) => (
        <Html key={`r${i}`} position={t.pos} center zIndexRange={[10, 0]}>
          <div className="scene-tag small" style={{ display: i < rows ? undefined : 'none' }}>{t.text}</div>
        </Html>
      ))}
      {LAYER_TAGS.map((t, i) => (
        <Html key={`l${i}`} position={t.pos} center zIndexRange={[10, 0]}>
          <div className="scene-tag small" style={{ display: i < layers ? undefined : 'none' }}>{t.text}</div>
        </Html>
      ))}
    </>
  )
}

function DoublingStrip({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  if (v.dblStrip < 0.5) return null
  const seq = [1, 2, 4, 8, 16, 32, 64]
  const n = Math.round(v.visible)
  return (
    <ol className="dbl-strip" aria-hidden>
      {seq.map((k, i) => (
        <li key={k} data-on={n >= k || undefined}>
          {i > 0 && <span className="dbl-arrow">×2</span>}
          <span className="dbl-num tabular-nums">{n >= k || k < 64 ? (n >= k ? k : '') : '?'}</span>
        </li>
      ))}
    </ol>
  )
}

function Counter({ ctrl, ...rest }: SceneProps) {
  useTicker()
  const v = ctrl.values
  let n: number | null = null
  if (v.counterMode === 1) n = Math.floor(v.visible + 0.001)
  if (v.counterMode === 2) n = Math.floor(v.rowLit + 0.001) * 8
  if (v.counterMode === 3) n = Math.floor(v.layerLit + 0.001) * 16
  return (
    <>
      {n !== null && (
        <div className="scene-counter" aria-hidden>
          <span className="tabular-nums">{n}</span>
          <span className="scene-unit">{n === 1 ? 'block' : 'blocks'}</span>
        </div>
      )}
      <DoublingStrip ctrl={ctrl} {...rest} />
    </>
  )
}

export const blocks64: SceneDef = {
  kind: '3d',
  camera: { position: [10, 10.5, 15], target: [0, 3, 0], fov: 38 },
  aim: (ctrl) => {
    const ys = [3.6, 0.6, 1.6]
    const v = ctrl.values
    const t = clamp(v.mix)
    return [0, ys[v.layoutA] + (ys[v.layoutB] - ys[v.layoutA]) * t, 0]
  },
  defaults: { visible: 64, layoutA: 0, layoutB: 0, mix: 1, rowLit: 0, layerLit: 0, spinY: 0, sides: 0, counterMode: 0, dblStrip: 0 },
  Component: Blocks,
  Overlay: Counter,
  applyParams(ctrl, p) {
    if (typeof p.layout === 'string') {
      const k = LAYOUTS.indexOf(p.layout as (typeof LAYOUTS)[number])
      ctrl.values.layoutA = ctrl.values.layoutB = Math.max(0, k)
      ctrl.values.mix = 1
    }
    if (typeof p.visible === 'number') ctrl.values.visible = p.visible
  },
  actions: {
    fillStack: (ctrl, cue, { reduced }) => {
      const v = ctrl.values
      return gsap.fromTo(
        v,
        { visible: 0 },
        { visible: Number(cue.to ?? 64), duration: dur(cue, reduced, 3), ease: 'power1.inOut', onStart: () => void (v.counterMode = 1) },
      )
    },
    morph: (ctrl, cue, { reduced }) => {
      const v = ctrl.values
      const to = Math.max(0, LAYOUTS.indexOf(String(cue.to) as (typeof LAYOUTS)[number]))
      return gsap.to(v, {
        mix: 1,
        duration: dur(cue, reduced, 1.6),
        ease: 'none',
        onStart: () => {
          v.layoutA = v.mix >= 0.999 ? v.layoutB : v.layoutA
          v.layoutB = to
          v.mix = 0
          v.counterMode = 0
          v.dblStrip = 0
          v.rowLit = v.layerLit = 0
        },
        immediateRender: false,
      })
    },
    showSides: (ctrl, cue, { reduced }) => {
      ctrl.labels = { a: String(cue.a ?? ''), b: String(cue.b ?? ''), c: cue.c ? String(cue.c) : '' }
      return gsap.to(ctrl.values, { sides: 1, duration: reduced ? 0.001 : 0.25, ease: 'power3.out' })
    },
    hideSides: (ctrl) => gsap.to(ctrl.values, { sides: 0, duration: 0.15, ease: 'power2.out' }),
    countRows: (ctrl, cue, { reduced }) =>
      gsap.fromTo(
        ctrl.values,
        { rowLit: 0 },
        { rowLit: 8, duration: dur(cue, reduced, 4), ease: 'steps(8)', onStart: () => void Object.assign(ctrl.values, { counterMode: 2, sides: 0 }) },
      ),
    lightRows: (ctrl, cue, { reduced }) =>
      gsap.to(ctrl.values, {
        rowLit: Number(cue.to ?? 1),
        duration: dur(cue, reduced, 0.4),
        ease: 'none',
        onStart: () => void Object.assign(ctrl.values, { counterMode: 0, sides: 0 }),
      }),
    countLayers: (ctrl, cue, { reduced }) =>
      gsap.fromTo(
        ctrl.values,
        { layerLit: 0 },
        { layerLit: 4, duration: dur(cue, reduced, 3), ease: 'steps(4)', onStart: () => void Object.assign(ctrl.values, { counterMode: 3, sides: 0 }) },
      ),
    doubleTo: (ctrl, cue, { reduced }) => {
      const v = ctrl.values
      return gsap.to(v, {
        visible: Number(cue.to ?? 64),
        duration: dur(cue, reduced, 0.6),
        ease: 'power2.out',
        immediateRender: false,
        onStart: () => {
          if (v.layoutB !== 2 || v.mix < 1) {
            v.layoutA = v.layoutB = 2
            v.mix = 1
          }
          v.counterMode = 1
          v.dblStrip = 1
          v.rowLit = v.layerLit = 0
        },
      })
    },
    spin: (ctrl, cue, { reduced }) =>
      reduced
        ? () => {}
        : gsap.to(ctrl.values, { spinY: `+=${Number(cue.turns ?? 1) * Math.PI * 2}`, duration: dur(cue, reduced, 2), ease: 'power2.inOut' }),
  },
}
