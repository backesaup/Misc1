import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { startMusic, stopMusic, BEATS_PER_SECOND } from '@/lib/sfx'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { SceneHtml as Html } from '../SceneHtml'
import { useTicker } from '../useTicker'

// A disco, made of original geometry: a dark room, a mirror ball of 10 rows × 10 mirrors,
// a spotlight, reflected dots that sweep the walls as the ball turns, speakers that pump
// to the beat, and a 4 × 4 light-up floor.

const ROWS = 10
const COLS = 10
const N = ROWS * COLS
const BALL = new THREE.Vector3(0, 4.3, -0.6)
const R = 0.95
const ROOM = 3.6 // walls at x = -ROOM and z = -ROOM, floor at y = 0
const LIGHT = new THREE.Vector3(2.8, 6.2, 2.2)
const HUES = [new THREE.Color('#fff4d6'), new THREE.Color('#ff4a3d'), new THREE.Color('#3ddc62'), new THREE.Color('#ffe14a')]

/** Mirror i's outward direction on the ball (row 0 at the bottom). */
function mirrorNormal(i: number, out: THREE.Vector3) {
  const row = Math.floor(i / COLS)
  const col = i % COLS
  const lat = ((row + 0.5) / ROWS - 0.5) * Math.PI * 0.82
  const lon = (col / COLS) * Math.PI * 2 + (row % 2) * (Math.PI / COLS)
  return out.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon))
}

/** Where a ray from the ball lands on a wall or the floor (null if it heads out of the room). */
function landing(dir: THREE.Vector3, out: THREE.Vector3, normal: THREE.Vector3) {
  let best = Infinity
  const tryPlane = (axis: 'x' | 'y' | 'z', value: number, n: [number, number, number]) => {
    const d = dir[axis]
    if (Math.abs(d) < 1e-4) return
    const t = (value - BALL[axis]) / d
    if (t <= 0 || t >= best) return
    const p = BALL.clone().addScaledVector(dir, t)
    if (p.x < -ROOM - 0.01 || p.z < -ROOM - 0.01 || p.y < -0.01 || p.y > 7 || p.x > ROOM || p.z > ROOM) return
    best = t
    out.copy(p)
    normal.set(...n)
  }
  tryPlane('x', -ROOM, [1, 0, 0])
  tryPlane('z', -ROOM, [0, 0, 1])
  tryPlane('y', 0.012, [0, 1, 0])
  return best < Infinity
}

function Room({ ctrl, activePart, reduced }: SceneProps) {
  const ball = useRef<THREE.Group>(null)
  const mirrors = useRef<THREE.InstancedMesh>(null)
  const dots = useRef<THREE.InstancedMesh>(null)
  const floor = useRef<THREE.InstancedMesh>(null)
  const beam = useRef<THREE.Mesh>(null)
  const one = useRef<THREE.Group>(null)
  const cones = useRef<(THREE.Mesh | null)[]>([])
  const spot = useRef<THREE.SpotLight>(null)
  const tmp = useMemo(
    () => ({ n: new THREE.Vector3(), p: new THREE.Vector3(), w: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color(), z: new THREE.Vector3(0, 0, 1), e: new THREE.Euler() }),
    [],
  )
  const spinAngle = useRef(0)

  useEffect(() => () => stopMusic(), [])
  useEffect(() => {
    const sp = spot.current
    if (!sp) return
    sp.target.position.copy(BALL)
    sp.target.updateMatrixWorld()
  }, [])

  useFrame(({ clock }, dt) => {
    const v = ctrl.values
    const t = clock.elapsedTime
    if (!reduced) spinAngle.current += dt * 0.5 * v.spinning
    const spin = spinAngle.current
    const beatPhase = (t * BEATS_PER_SECOND) % 1
    const thump = v.music * Math.exp(-beatPhase * 6)
    const hue = HUES[Math.round(v.hue)] ?? HUES[0]

    if (ball.current) ball.current.rotation.y = spin
    // mirrors: light up row by row while counting
    const mm = mirrors.current
    if (mm) {
      for (let i = 0; i < N; i++) {
        const row = Math.floor(i / COLS)
        const lit = v.mirrorsLit > row
        mm.setColorAt(i, tmp.c.set(lit ? '#ffd166' : '#dfe4ee'))
      }
      if (mm.instanceColor) mm.instanceColor.needsUpdate = true
    }
    // reflected dots
    const dm = dots.current
    if (dm) {
      const shown = Math.round(v.dots * N * Math.max(1, Math.round(v.lights)))
      let k = 0
      for (let light = 0; light < 2; light++) {
        for (let i = 0; i < N; i++) {
          const idx = light * N + i
          mirrorNormal(i, tmp.n)
          tmp.n.applyAxisAngle(THREE.Object3D.DEFAULT_UP, spin + light * 0.33)
          if (light === 1) tmp.n.y = -tmp.n.y * 0.7 - 0.2
          tmp.n.normalize()
          const ok = idx < shown && landing(tmp.n, tmp.p, tmp.w)
          if (ok) {
            tmp.q.setFromUnitVectors(tmp.z, tmp.w)
            const sz = 0.16 + 0.04 * Math.sin(t * 3 + i)
            tmp.s.set(sz, sz, sz)
            tmp.m.compose(tmp.p.addScaledVector(tmp.w, 0.01), tmp.q, tmp.s)
          } else {
            tmp.m.makeScale(0, 0, 0)
          }
          dm.setMatrixAt(idx, tmp.m)
          if (ok) k++
        }
      }
      dm.instanceMatrix.needsUpdate = true
      ;(dm.material as THREE.MeshBasicMaterial).color.copy(hue)
      void k
    }
    // light-up floor: counts tiles, then dances to the beat
    const fm = floor.current
    if (fm) {
      for (let i = 0; i < 16; i++) {
        const counted = v.floorLit > i
        const beatOn = v.floorDance > 0.5 && ((i + Math.floor(t * BEATS_PER_SECOND)) % 2 === 0)
        const palette = ['#ff6b5c', '#ffd166', '#58b368', '#4f8ff0']
        tmp.c.set(counted || beatOn ? palette[(i + Math.floor(t * BEATS_PER_SECOND)) % 4] : '#2b2f45')
        if (beatOn) tmp.c.multiplyScalar(0.7 + thump * 0.6)
        fm.setColorAt(i, tmp.c)
      }
      if (fm.instanceColor) fm.instanceColor.needsUpdate = true
    }
    if (beam.current) {
      const mat = beam.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.16 * v.spot
      mat.color.copy(hue)
      beam.current.visible = v.spot > 0.01
    }
    if (spot.current) {
      spot.current.intensity = 60 * v.spot
      spot.current.color.copy(hue)
    }
    if (one.current) one.current.visible = v.oneMirror > 0.01
    cones.current.forEach((c) => c && c.scale.setScalar(1 + thump * 0.18 + (activePart === 'speaker' ? 0.06 : 0)))
  })

  const tap = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    ctrl.onPart?.(id)
  }
  const hot = (id: string) => activePart === id

  // the beam from the spotlight to the ball
  const beamGeo = useMemo(() => {
    const len = LIGHT.distanceTo(BALL)
    const g = new THREE.ConeGeometry(R * 1.1, len, 32, 1, true)
    g.translate(0, -len / 2, 0)
    return g
  }, [])
  const beamQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), BALL.clone().sub(LIGHT).normalize()), [])

  // one mirror's bounce (for "reflect")
  const oneMirrorDir = useMemo(() => new THREE.Vector3(-1, -0.15, -0.55).normalize(), [])
  const oneLanding = useMemo(() => {
    const p = new THREE.Vector3(), n = new THREE.Vector3()
    landing(oneMirrorDir, p, n)
    return p
  }, [oneMirrorDir])
  const seg = (a: THREE.Vector3, b: THREE.Vector3) => {
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const len = a.distanceTo(b)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    return { mid, len, q }
  }
  const s1 = seg(LIGHT, BALL.clone().addScaledVector(oneMirrorDir, R))
  const s2 = seg(BALL.clone().addScaledVector(oneMirrorDir, R), oneLanding)

  return (
    <group>
      {/* room: dark walls and ceiling glow */}
      <mesh position={[-ROOM - 0.05, 3.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM * 2, 7]} />
        <meshStandardMaterial color="#1f2742" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.5, -ROOM - 0.05]} receiveShadow>
        <planeGeometry args={[ROOM * 2, 7]} />
        <meshStandardMaterial color="#232c4b" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[ROOM * 2, ROOM * 2]} />
        <meshStandardMaterial color="#171b2c" />
      </mesh>
      {/* 4 × 4 light-up floor */}
      <instancedMesh ref={floor} args={[undefined, undefined, 16]} onClick={tap('floor')} receiveShadow>
        <boxGeometry args={[0.92, 0.06, 0.92]} />
        <meshStandardMaterial roughness={0.4} emissive="#ffffff" emissiveIntensity={0.12} />
      </instancedMesh>
      <FloorLayout mesh={floor} />
      {/* the ball, its string and its motor */}
      <mesh position={[BALL.x, (BALL.y + 7) / 2 + 0.6, BALL.z]}>
        <cylinderGeometry args={[0.02, 0.02, 7 - BALL.y - 1.2]} />
        <meshStandardMaterial color="#9aa3ad" />
      </mesh>
      <mesh position={[BALL.x, 6.6, BALL.z]} onClick={tap('motor')}>
        <boxGeometry args={[0.5, 0.35, 0.5]} />
        <meshStandardMaterial color={hot('motor') ? '#ffd166' : '#4b5266'} emissive={hot('motor') ? '#ffd166' : '#000'} emissiveIntensity={0.4} />
      </mesh>
      <group ref={ball} position={BALL} onClick={tap('ball')}>
        <mesh>
          <sphereGeometry args={[R * 0.97, 32, 16]} />
          <meshStandardMaterial color="#3a3f4f" />
        </mesh>
        <instancedMesh ref={mirrors} args={[undefined, undefined, N]}>
          <planeGeometry args={[0.24, 0.24]} />
          <meshStandardMaterial metalness={0.55} roughness={0.18} emissive={hot('ball') ? '#ffd166' : '#8090b0'} emissiveIntensity={hot('ball') ? 0.5 : 0.18} />
        </instancedMesh>
        <MirrorLayout mesh={mirrors} />
      </group>
      {/* spotlight */}
      <group position={LIGHT} onClick={tap('light')}>
        <mesh quaternion={beamQuat}>
          <cylinderGeometry args={[0.28, 0.36, 0.6, 20]} />
          <meshStandardMaterial color={hot('light') ? '#ffd166' : '#2b2a33'} />
        </mesh>
      </group>
      <spotLight ref={spot} position={LIGHT} angle={0.22} penumbra={0.5} intensity={0} distance={14} decay={1.2} />
      <mesh ref={beam} position={LIGHT} quaternion={beamQuat} geometry={beamGeo}>
        <meshBasicMaterial transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      {/* one mirror's bounce */}
      <group ref={one} visible={false}>
        {[s1, s2].map((s, i) => (
          <mesh key={i} position={s.mid} quaternion={s.q}>
            <cylinderGeometry args={[0.05, 0.05, s.len, 8]} />
            <meshBasicMaterial color="#ffe9a8" />
          </mesh>
        ))}
        <mesh position={oneLanding.clone().add(new THREE.Vector3(0.02, 0, 0))} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.22, 24]} />
          <meshBasicMaterial color="#fff4d6" />
        </mesh>
      </group>
      {/* reflected dots */}
      <instancedMesh ref={dots} args={[undefined, undefined, N * 2]}>
        <circleGeometry args={[1, 16]} />
        <meshBasicMaterial color="#fff4d6" toneMapped={false} />
      </instancedMesh>
      {/* speakers */}
      {[
        [-2.9, -2.9],
        [2.4, -2.9],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.9, z]} onClick={tap('speaker')}>
          <mesh castShadow>
            <boxGeometry args={[1, 1.8, 0.8]} />
            <meshStandardMaterial color={hot('speaker') ? '#4a3f2a' : '#111318'} />
          </mesh>
          <mesh ref={(el) => void (cones.current[i] = el)} position={[0, -0.25, 0.41]}>
            <circleGeometry args={[0.36, 32]} />
            <meshStandardMaterial color="#3a3f4f" />
          </mesh>
          <mesh position={[0, 0.5, 0.41]}>
            <circleGeometry args={[0.16, 24]} />
            <meshStandardMaterial color="#3a3f4f" />
          </mesh>
        </group>
      ))}
      <DiscoTags ctrl={ctrl} />
      <ambientLight intensity={0.15} />
    </group>
  )
}

function MirrorLayout({ mesh }: { mesh: React.RefObject<THREE.InstancedMesh | null> }) {
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    const n = new THREE.Vector3(), q = new THREE.Quaternion(), mat = new THREE.Matrix4(), z = new THREE.Vector3(0, 0, 1)
    for (let i = 0; i < N; i++) {
      mirrorNormal(i, n)
      q.setFromUnitVectors(z, n)
      mat.compose(n.clone().multiplyScalar(R), q, new THREE.Vector3(1, 1, 1))
      m.setMatrixAt(i, mat)
    }
    m.instanceMatrix.needsUpdate = true
  }, [mesh])
  return null
}

function FloorLayout({ mesh }: { mesh: React.RefObject<THREE.InstancedMesh | null> }) {
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    const mat = new THREE.Matrix4()
    for (let i = 0; i < 16; i++) {
      mat.makeTranslation((i % 4) - 1.5, 0.03, Math.floor(i / 4) - 0.6)
      m.setMatrixAt(i, mat)
    }
    m.instanceMatrix.needsUpdate = true
  }, [mesh])
  return null
}

function Tag({ show, pos, children }: { show: boolean; pos: [number, number, number]; children: string }) {
  return (
    <Html position={pos} center zIndexRange={[10, 0]}>
      <div className="scene-tag small" style={{ display: show ? undefined : 'none' }}>{children}</div>
    </Html>
  )
}

function DiscoTags({ ctrl }: { ctrl: SceneProps['ctrl'] }) {
  useTicker()
  const v = ctrl.values
  return (
    <>
      <Tag show={v['tag:ball'] > 0.5} pos={[BALL.x + 1.5, BALL.y + 0.3, BALL.z]}>disco ball</Tag>
      <Tag show={v['tag:light'] > 0.5} pos={[LIGHT.x, LIGHT.y - 0.8, LIGHT.z]}>spotlight</Tag>
      <Tag show={v['tag:mirror'] > 0.5} pos={[BALL.x - 1.6, BALL.y - 0.6, BALL.z + 0.4]}>mirror</Tag>
      <Tag show={v['tag:motor'] > 0.5} pos={[BALL.x + 1.1, 6.6, BALL.z]}>motor</Tag>
      <Tag show={v['tag:speaker'] > 0.5} pos={[-2.9, 2.3, -2.9]}>speaker</Tag>
      <Tag show={v['tag:floor'] > 0.5} pos={[2.4, 0.4, 1.6]}>light-up floor</Tag>
    </>
  )
}

function Counter({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  let n: number | null = null
  let unit = ''
  if (v.counter === 1) (n = Math.floor(v.mirrorsLit + 0.001) * COLS), (unit = 'mirrors')
  if (v.counter === 2) (n = Math.round(v.dots * N * Math.max(1, Math.round(v.lights)))), (unit = 'dots')
  if (v.counter === 3) (n = Math.floor(v.floorLit + 0.001)), (unit = 'tiles')
  if (n === null) return null
  return (
    <div className="scene-counter" aria-hidden>
      <span className="tabular-nums">{n}</span>
      <span className="scene-unit">{unit}</span>
    </div>
  )
}

export const disco: SceneDef = {
  kind: '3d',
  camera: { position: [5.4, 4.6, 8.4], target: [-0.4, 2.8, -0.8], fov: 46 },
  defaults: {
    spot: 0, spinning: 0, dots: 0, lights: 1, oneMirror: 0, mirrorsLit: 0, music: 0, hue: 0,
    floorLit: 0, floorDance: 0, counter: 0,
    'tag:ball': 0, 'tag:light': 0, 'tag:mirror': 0, 'tag:motor': 0, 'tag:speaker': 0, 'tag:floor': 0,
  },
  Component: Room,
  Overlay: Counter,
  applyParams(ctrl, p) {
    for (const [k, v] of Object.entries(p)) if (typeof v === 'number') ctrl.values[k] = v
  },
  actions: {
    lights: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { spot: cue.on === false ? 0 : 1, duration: dur(cue, reduced, 0.8), ease: 'power2.out' }),
    spin: (ctrl, cue) => () => void (ctrl.values.spinning = cue.on === false ? 0 : 1),
    dots: (ctrl, cue, { reduced }) =>
      gsap.to(ctrl.values, {
        dots: cue.on === false ? 0 : 1,
        duration: dur(cue, reduced, 1.2),
        ease: 'power1.inOut',
        onStart: () => void (cue.count ? (ctrl.values.counter = 2) : 0),
      }),
    secondLight: (ctrl, cue) => () => void (ctrl.values.lights = cue.on === false ? 1 : 2),
    oneMirror: (ctrl, cue) => () => void (ctrl.values.oneMirror = cue.on === false ? 0 : 1),
    countMirrors: (ctrl, cue, { reduced }) =>
      gsap.fromTo(ctrl.values, { mirrorsLit: 0 }, { mirrorsLit: ROWS, duration: dur(cue, reduced, 4), ease: `steps(${ROWS})`, onStart: () => void (ctrl.values.counter = 1) }),
    clearCount: (ctrl) => () => Object.assign(ctrl.values, { counter: 0, mirrorsLit: 0 }),
    music: (ctrl, cue) => () => {
      const on = cue.on !== false
      ctrl.values.music = on ? 1 : 0
      if (on) startMusic(Number(cue.volume ?? 0.2))
      else stopMusic()
    },
    colour: (ctrl, cue) => () => void (ctrl.values.hue = Math.max(0, ['white', 'red', 'green', 'yellow'].indexOf(String(cue.to)))),
    floorDance: (ctrl, cue) => () => void (ctrl.values.floorDance = cue.on === false ? 0 : 1),
    countFloor: (ctrl, cue, { reduced }) =>
      gsap.fromTo(ctrl.values, { floorLit: 0 }, { floorLit: 16, duration: dur(cue, reduced, 3), ease: 'steps(16)', onStart: () => void Object.assign(ctrl.values, { counter: 3, floorDance: 0 }) }),
    tag: (ctrl, cue) => () => void (ctrl.values[`tag:${String(cue.name)}`] = cue.on === false ? 0 : 1),
    untag: (ctrl) => () => {
      for (const k of Object.keys(ctrl.values)) if (k.startsWith('tag:')) ctrl.values[k] = 0
    },
  },
}

