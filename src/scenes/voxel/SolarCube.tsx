import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { SceneHtml as Html } from '../SceneHtml'
import { useTicker } from '../useTicker'
import * as THREE from 'three'
import gsap from 'gsap'
import { clamp } from '@/lib/utils'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { solarCellTexture } from './textures'

// A 3×3×3 cube, 54 solar cells (9 per face), drawn as original geometry.
const FACES = [
  { n: [0, 0, 1], frame: '#3f9b5a' },
  { n: [1, 0, 0], frame: '#d2483c' },
  { n: [0, 0, -1], frame: '#3b6fd1' },
  { n: [-1, 0, 0], frame: '#e8892f' },
  { n: [0, 1, 0], frame: '#f4f1e8' },
  { n: [0, -1, 0], frame: '#f1c933' },
] as const

const GAP = 1.04
const FOCUS = [1, 0, 1] // the edge piece we open up

interface Cell { cubie: number; face: number; order: number }

function buildCubies() {
  const cubies: { p: [number, number, number]; cells: Cell[] }[] = []
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) cubies.push({ p: [x, y, z], cells: [] })
  let order = 0
  FACES.forEach((f, fi) => {
    const axis = f.n.findIndex((c) => c !== 0)
    const sign = f.n[axis]
    cubies.forEach((c, ci) => {
      if (c.p[axis] === sign) c.cells.push({ cubie: ci, face: fi, order: 0 })
    })
    // count face by face, in reading order
    const onFace = cubies.flatMap((c) => c.cells.filter((cell) => cell.face === fi))
    onFace.forEach((cell) => (cell.order = order++))
  })
  return cubies
}

function Tag({ show, pos, children }: { show: boolean; pos: [number, number, number]; children: string }) {
  return (
    <Html position={pos} center zIndexRange={[10, 0]}>
      <div className="scene-tag small" style={{ display: show ? undefined : 'none' }}>{children}</div>
    </Html>
  )
}

/** Named labels on the parts we're talking about. */
function SolarTags({ ctrl }: { ctrl: SceneProps['ctrl'] }) {
  useTicker()
  const v = ctrl.values
  const open = v.focusEdge > 0.5
  return (
    <>
      <Tag show={v['tag:panel'] > 0.5 && !open && v.explode < 0.3} pos={[-0.35, 1.0, 1.75]}>solar panel</Tag>
      <Tag show={v.explode > 0.6 && !open} pos={[0, -0.55, 0]}>battery</Tag>
      <Tag show={open} pos={[1.0, 1.25, 1.9]}>springy balls</Tag>
      <Tag show={open} pos={[1.75, 1.15, 0.9]}>magnets</Tag>
      <Tag show={open} pos={[0.55, -0.35, 0.55]}>slip ring</Tag>
    </>
  )
}

const SUN_DIR = new THREE.Vector3(-0.55, 0.75, 0.6).normalize()

function SunTag({ ctrl }: { ctrl: SceneProps['ctrl'] }) {
  useTicker()
  return <Tag show={ctrl.values.sun > 0.6} pos={[-5.2, 4.1, -2]}>sun</Tag>
}

function Cube({ ctrl, activePart }: SceneProps) {
  const cubies = useMemo(buildCubies, [])
  const tex = useMemo(solarCellTexture, [])
  const root = useRef<THREE.Group>(null)
  const pieceRefs = useRef<(THREE.Group | null)[]>([])
  const cellMats = useRef<Map<string, THREE.MeshStandardMaterial>>(new Map())
  const bodyMats = useRef<THREE.MeshStandardMaterial[]>([])
  const core = useRef<THREE.Group>(null)
  const details = useRef<THREE.Group>(null)
  const sun = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.DirectionalLight>(null)
  const tmp = useMemo(() => ({ n: new THREE.Vector3(), q: new THREE.Quaternion() }), [])

  useFrame((state) => {
    const v = ctrl.values
    const t = state.clock.elapsedTime
    if (root.current) {
      root.current.rotation.y = v.spinY + 0.6
      root.current.rotation.x = 0.42
    }
    cubies.forEach((c, i) => {
      const g = pieceRefs.current[i]
      if (!g) return
      const isFocus = c.p[0] === FOCUS[0] && c.p[1] === FOCUS[1] && c.p[2] === FOCUS[2]
      const [x, y, z] = c.p
      const ex = 1 + v.explode * 0.55
      g.position.set(x * GAP * ex, y * GAP * ex, z * GAP * ex)
      g.rotation.set(0, 0, 0)
      // twist the top layer: the cube still turns
      if (y === 1) {
        const a = v.twist * Math.PI * 2
        g.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), a)
        g.rotation.y = a
      }
      if (isFocus) {
        const f = v.focusEdge
        g.position.lerp(new THREE.Vector3(1.9, 0.2, 1.9), f)
        g.scale.setScalar(1 + f * 0.9)
      } else {
        g.scale.setScalar(1 - v.focusEdge * 0.15)
      }
      const mat = bodyMats.current[i]
      if (mat) {
        mat.opacity = isFocus ? 1 - v.focusEdge * 0.62 : 1 - v.focusEdge * 0.78
        mat.transparent = mat.opacity < 0.999
        mat.depthWrite = !mat.transparent
      }
    })
    // cells: lit when counted, when pulsing, and (in the sun test) only if facing the sun
    cellMats.current.forEach((mat, key) => {
      const [ci, fi, order] = key.split(':').map(Number)
      const counted = v.cellsLit > order ? 1 : 0
      let facing = 1
      if (v.sunAngle > 0) {
        tmp.n.set(...(FACES[fi].n as unknown as [number, number, number]))
        const g = pieceRefs.current[ci]
        if (g) g.getWorldQuaternion(tmp.q)
        tmp.n.applyQuaternion(tmp.q)
        const d = tmp.n.dot(SUN_DIR)
        facing = THREE.MathUtils.lerp(1, d > 0.25 ? 1 : 0.08, v.sunAngle)
      }
      const pulse = v.glow * (0.55 + 0.45 * Math.sin(t * 5 - order * 0.25))
      const e = Math.max(counted * 0.55, pulse * 0.45) * facing * v.power + (v.sunAngle > 0 ? facing * 0.35 * v.sunAngle : 0)
      mat.emissiveIntensity = e
      mat.color.setScalar(THREE.MathUtils.lerp(0.35, 1, facing))
      mat.opacity = 1 - v.focusEdge * 0.75
      mat.transparent = mat.opacity < 0.999
    })
    if (core.current) core.current.scale.setScalar(Math.max(0.0001, v.explode))
    if (details.current) {
      details.current.visible = v.focusEdge > 0.02
      details.current.scale.setScalar(Math.max(0.0001, v.focusEdge))
    }
    if (sun.current) {
      sun.current.scale.setScalar(0.0001 + v.sun)
      ;(sun.current.material as THREE.MeshBasicMaterial).opacity = v.sun
    }
    if (light.current) light.current.intensity = 0.6 + 1.9 * v.sun
  })

  const tap = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    ctrl.onPart?.(id)
  }
  const hot = (id: string) => (activePart === id ? '#ffd166' : undefined)

  return (
    <>
      <directionalLight ref={light} position={[-5.5, 7.5, 6]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <mesh ref={sun} position={[-5.2, 5.2, -2]}>
        <sphereGeometry args={[0.7, 32, 16]} />
        <meshBasicMaterial color="#ffd36b" transparent />
      </mesh>
      <SunTag ctrl={ctrl} />
      <group position={[0, 2.4, 0]}>
        <group ref={root}>
          {cubies.map((c, i) => (
            <group key={i} ref={(el) => void (pieceRefs.current[i] = el)}>
              <RoundedBox args={[0.98, 0.98, 0.98]} radius={0.08} smoothness={3} castShadow>
                <meshStandardMaterial
                  ref={(m) => void (m && (bodyMats.current[i] = m))}
                  color="#17171c"
                  roughness={0.5}
                />
              </RoundedBox>
              {c.cells.map((cell) => {
                const n = FACES[cell.face].n
                const pos: [number, number, number] = [n[0] * 0.495, n[1] * 0.495, n[2] * 0.495]
                const rot: [number, number, number] =
                  n[0] !== 0 ? [0, (n[0] * Math.PI) / 2, 0] : n[1] !== 0 ? [(-n[1] * Math.PI) / 2, 0, 0] : [0, n[2] < 0 ? Math.PI : 0, 0]
                return (
                  <group key={cell.face} position={pos} rotation={rot}>
                    <mesh position={[0, 0, 0.002]}>
                      <planeGeometry args={[0.86, 0.86]} />
                      <meshStandardMaterial color={FACES[cell.face].frame} roughness={0.6} />
                    </mesh>
                    <mesh position={[0, 0, 0.006]}>
                      <planeGeometry args={[0.72, 0.72]} />
                      <meshStandardMaterial
                        ref={(m) => void (m && cellMats.current.set(`${cell.cubie}:${cell.face}:${cell.order}`, m))}
                        map={tex}
                        emissive="#3d8bff"
                        emissiveIntensity={0}
                        roughness={0.25}
                        metalness={0.3}
                      />
                    </mesh>
                  </group>
                )
              })}
            </group>
          ))}
          {/* hollow core: small batteries, revealed when the cube opens */}
          <group ref={core}>
            {[-0.28, 0, 0.28].map((x) => (
              <mesh key={x} position={[x, 0, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.12, 0.62, 20]} />
                <meshStandardMaterial color="#58b368" roughness={0.4} metalness={0.2} />
              </mesh>
            ))}
          </group>
          {/* inside one edge piece: springy brass balls, magnets, slip ring */}
          <SolarTags ctrl={ctrl} />
          <group ref={details} position={[1.9, 0.2, 1.9]}>
            <group onClick={tap('springs')}>
              {[-0.25, 0.25].map((y) =>
                [-0.25, 0.25].map((zz) => (
                  <group key={`${y}${zz}`} position={[-0.62, y * 1.6, zz * 1.6]}>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.07, 0.07, 0.3, 10]} />
                      <meshStandardMaterial color={hot('springs') ?? '#b08a3e'} metalness={0.8} roughness={0.3} wireframe />
                    </mesh>
                    <mesh position={[-0.2, 0, 0]}>
                      <sphereGeometry args={[0.1, 20, 12]} />
                      <meshStandardMaterial color={hot('springs') ?? '#d4a64a'} metalness={0.9} roughness={0.2} emissive={hot('springs') ?? '#000'} emissiveIntensity={activePart === 'springs' ? 0.6 : 0} />
                    </mesh>
                  </group>
                )),
              )}
            </group>
            <group onClick={tap('magnets')}>
              {[-0.45, 0.45].map((y) => (
                <mesh key={y} position={[-0.3, y * 1.6, -0.62]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.14, 0.14, 0.08, 24]} />
                  <meshStandardMaterial color={hot('magnets') ?? '#9aa3ad'} metalness={0.7} roughness={0.35} emissive={hot('magnets') ?? '#000'} emissiveIntensity={activePart === 'magnets' ? 0.6 : 0} />
                </mesh>
              ))}
            </group>
            <mesh onClick={tap('slipring')} position={[-1.0, 0, -1.0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.32, 0.06, 12, 40]} />
              <meshStandardMaterial color={hot('slipring') ?? '#c99a3f'} metalness={0.9} roughness={0.25} emissive={hot('slipring') ?? '#000'} emissiveIntensity={activePart === 'slipring' ? 0.7 : 0} />
            </mesh>
          </group>
        </group>
      </group>
    </>
  )
}

export const solarCube: SceneDef = {
  kind: '3d',
  camera: { position: [0.4, 4.2, 9.5], target: [0.3, 2.2, 0], fov: 40 },
  defaults: { spinY: 0, cellsLit: 0, glow: 0, sun: 1, power: 1, sunAngle: 0, twist: 0, explode: 0, focusEdge: 0, 'tag:panel': 0 },
  Component: Cube,
  applyParams(ctrl, p) {
    if (typeof p.sun === 'number') ctrl.values.sun = p.sun
  },
  actions: {
    spin: (ctrl, cue, { reduced }) =>
      reduced
        ? () => {}
        : gsap.to(ctrl.values, { spinY: `+=${Number(cue.turns ?? 1) * Math.PI * 2}`, duration: dur(cue, reduced, 4), ease: 'sine.inOut' }),
    tag: (ctrl, cue) => () => void (ctrl.values[`tag:${String(cue.name)}`] = cue.on === false ? 0 : 1),
    countPanels: (ctrl, cue, { reduced }) =>
      gsap.fromTo(ctrl.values, { cellsLit: 0 }, { cellsLit: 54, duration: dur(cue, reduced, 5), ease: 'steps(6)' }),
    panelsOff: (ctrl) => () => Object.assign(ctrl.values, { cellsLit: 0, glow: 0, sun: 0 }),
    sunrise: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { sun: 1, duration: dur(cue, reduced, 2), ease: 'power2.out' }),
    pulsePanels: (ctrl, cue, { reduced }) =>
      gsap.to(ctrl.values, { glow: 1, duration: dur(cue, reduced, 1.2), ease: 'power2.out' }),
    twist: (ctrl, cue, { reduced }) =>
      gsap.to(ctrl.values, { twist: `+=${Number(cue.turns ?? 0.25)}`, duration: dur(cue, reduced, 1), ease: 'power3.inOut' }),
    explode: (ctrl, cue, { reduced }) =>
      gsap.to(ctrl.values, { explode: clamp(Number(cue.to ?? 1)), duration: dur(cue, reduced, 1.4), ease: 'power3.inOut' }),
    focusEdge: (ctrl, cue, { reduced }) =>
      gsap.to(ctrl.values, { focusEdge: clamp(Number(cue.to ?? 1)), duration: dur(cue, reduced, 1.2), ease: 'power3.inOut' }),
    sunAngle: (ctrl, cue, { reduced }) =>
      gsap.to(ctrl.values, { sunAngle: cue.on === false ? 0 : 1, glow: 0, cellsLit: 0, duration: dur(cue, reduced, 1.2), ease: 'power2.inOut' }),
  },
}
