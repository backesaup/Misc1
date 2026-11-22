import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Star } from 'lucide-react'
import type { SceneDef, SceneProps } from '../types'
import { useTicker } from '../useTicker'
import { SceneHtml } from '../SceneHtml'
import { ICONS, mcIcon, parseItems, parseZones, ZONE_COLS, type Item } from '../diagram/Board'
import { useMob, type MobName } from './mobs'
import { blockTexture } from './textures'
import { Steve, MOODS } from './Steve'

// The science farm in 3D: fenced pens on the grass, and real Minecraft animals (and things)
// that hop into them. Same lesson data as diagram:board, so a lesson switches by changing its
// scene: items "id:icon:label:zone|…", zones "id:label|…", actions move / set / hot.
// mode "sort" (pens) or "chain" (a row with arrows, for food chains and life cycles).

/** Which real mob draws an icon, and at what size (babies are small). */
const MOB_FOR: Record<string, [MobName, number]> = {
  chicken: ['chicken', 1], bird: ['parrot', 1.3], feather: ['chicken', 1], fish: ['cod', 1.4], dog: ['wolf', 1], fox: ['fox', 1],
  rabbit: ['rabbit', 1.3], sheep: ['sheep', 0.9], paw: ['sheep', 0.9], baby: ['sheep', 0.5], turtle: ['turtle', 0.7], frog: ['frog', 1.3],
  bug: ['bee', 1.5], pig: ['pig', 0.9], cow: ['cow', 0.8], goat: ['goat', 0.8], panda: ['panda', 0.6], golem: ['iron_golem', 0.45],
  villager: ['villager', 0.55], chick: ['chick', 1.4], tadpole: ['tadpole', 2.2], froglet: ['frog', 0.75], llama: ['llama', 0.6],
}

const HOP = 0.9

function MobThing({ name, scale }: { name: MobName; scale: number }) {
  const mob = useMob(name)
  if (!mob) return <Card icon="paw" />
  const s = Math.min(scale, 1.15 / mob.length) * 1.2
  return <mesh geometry={mob.geometry} material={mob.material} scale={s} castShadow />
}

function SpriteThing({ url }: { url: string }) {
  const mat = useMemo(() => {
    const t = new THREE.TextureLoader().load(url)
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter
    t.colorSpace = THREE.SRGBColorSpace
    return new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.1 })
  }, [url])
  return <sprite material={mat} scale={[0.8, 0.8, 0.8]} position={[0, 0.45, 0]} />
}

function StoneThing() {
  const tex = useMemo(() => blockTexture('stone', 5), [])
  return (
    <mesh position={[0, 0.3, 0]} castShadow>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  )
}

function SunThing() {
  return (
    <mesh position={[0, 0.9, 0]}>
      <sphereGeometry args={[0.45, 24, 16]} />
      <meshStandardMaterial color="#ffd166" emissive="#ffb703" emissiveIntensity={0.9} />
    </mesh>
  )
}

/** A drawn icon on a card, for things with no Minecraft model. */
function Card({ icon }: { icon: string }) {
  const I = ICONS[icon] ?? Star
  return (
    <SceneHtml position={[0, 0.5, 0]} center zIndexRange={[8, 0]}>
      <div className="pen-card" aria-hidden>
        <I strokeWidth={2.2} />
      </div>
    </SceneHtml>
  )
}

function Thing({ icon }: { icon: string }) {
  const mob = MOB_FOR[icon]
  if (mob) return <MobThing name={mob[0]} scale={mob[1]} />
  if (icon === 'mountain') return <StoneThing />
  if (icon === 'sun') return <SunThing />
  const mc = mcIcon(icon)
  if (mc && mc.size[0] === 16) return <SpriteThing url={mc.url} />
  return <Card icon={icon} />
}

interface Spot { x: number; z: number }

function layoutSort(items: Item[], zoneIds: string[]) {
  const n = Math.max(1, zoneIds.length)
  const W = Math.min(2.5, 7.4 / n)
  const gap = 0.45
  const centre = (k: number) => (k - (n - 1) / 2) * (W + gap)
  const spots = new Map<string, Spot>()
  const waiting = items.filter((it) => !zoneIds.includes(it.zone))
  for (const it of items) {
    const k = zoneIds.indexOf(it.zone)
    if (k >= 0) {
      const inZone = items.filter((o) => o.zone === it.zone)
      const j = inZone.indexOf(it)
      const cols = 2
      spots.set(it.id, { x: centre(k) + ((j % cols) - (cols - 1) / 2) * (W / 2.1), z: -1.25 + Math.floor(j / cols) * 1.25 })
    } else {
      const j = waiting.indexOf(it)
      spots.set(it.id, { x: (j - (waiting.length - 1) / 2) * Math.min(1.3, 8 / Math.max(1, waiting.length)), z: 2.4 })
    }
  }
  return { spots, W, centre }
}

function Pen({ x, w, color, label }: { x: number; w: number; color: string; label: string }) {
  const d = 3.3
  const posts: [number, number][] = []
  const step = 0.7
  for (let px = -w / 2; px <= w / 2 + 0.01; px += w / Math.max(1, Math.round(w / step))) posts.push([px, -d / 2], [px, d / 2])
  for (let pz = -d / 2 + d / 4; pz < d / 2 - 0.01; pz += d / 4) posts.push([-w / 2, pz], [w / 2, pz])
  return (
    <group position={[x, 0, -0.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={color} transparent opacity={0.45} roughness={1} />
      </mesh>
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.32, pz]} castShadow>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color="#9b6b3e" roughness={0.9} />
        </mesh>
      ))}
      {[0.22, 0.48].map((y) =>
        [
          [0, -d / 2, w, 0],
          [0, d / 2, w, 0],
          [-w / 2, 0, d, 1],
          [w / 2, 0, d, 1],
        ].map(([rx, rz, len, side], i) => (
          <mesh key={`${y}-${i}`} position={[rx, y, rz]} rotation={[0, side ? Math.PI / 2 : 0, 0]} castShadow>
            <boxGeometry args={[len, 0.06, 0.05]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        )),
      )}
      <SceneHtml position={[0, 1.15, -d / 2]} center zIndexRange={[9, 0]}>
        <div className="pen-sign" style={{ background: color }}>{label}</div>
      </SceneHtml>
    </group>
  )
}

function Mover({ item, target, hot, gone }: { item: Item; target: Spot; hot: boolean; gone: boolean }) {
  const g = useRef<THREE.Group>(null)
  const from = useRef(new THREE.Vector3(target.x, 0, target.z))
  const to = useRef(new THREE.Vector3(target.x, 0, target.z))
  const t = useRef(1)
  const ring = useRef<THREE.Mesh>(null)
  if (to.current.x !== target.x || to.current.z !== target.z) {
    from.current.copy(g.current?.position ?? to.current)
    to.current.set(target.x, 0, target.z)
    t.current = 0
  }
  useFrame(({ clock }, dt) => {
    if (!g.current) return
    t.current = Math.min(1, t.current + dt / HOP)
    const k = t.current < 1 ? t.current * t.current * (3 - 2 * t.current) : 1
    g.current.position.lerpVectors(from.current, to.current, k)
    g.current.position.y = Math.sin(Math.PI * k) * 0.8 * (t.current < 1 ? 1 : 0) + (hot ? Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.25 : 0)
    g.current.rotation.y = t.current < 1 ? Math.atan2(to.current.x - from.current.x, to.current.z - from.current.z) * 0.5 : 0
    const s = gone ? 0.45 : 1
    g.current.scale.lerp(new THREE.Vector3(s, s, s), 1 - Math.exp(-dt * 6))
    if (ring.current) ring.current.visible = hot
  })
  return (
    <group ref={g} position={[target.x, 0, target.z]}>
      <Thing icon={item.icon} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} visible={false}>
        <ringGeometry args={[0.45, 0.6, 32]} />
        <meshBasicMaterial color="#ffd166" />
      </mesh>
      {item.label && (
        <SceneHtml position={[0, -0.12, 0.55]} center zIndexRange={[9, 0]}>
          <div className="scene-tag small pen-label">{item.label}</div>
        </SceneHtml>
      )}
      {gone && (
        <SceneHtml position={[0, 0.9, 0]} center zIndexRange={[9, 0]}>
          <div className="pen-gone" aria-hidden>✕</div>
        </SceneHtml>
      )}
    </group>
  )
}

function Arrow({ x }: { x: number }) {
  return (
    <group position={[x, 0.6, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.55, 12]} />
        <meshStandardMaterial color="#2b2a33" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.16, 0.28, 16]} />
        <meshStandardMaterial color="#2b2a33" />
      </mesh>
    </group>
  )
}

function Pens({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const items = parseItems(ctrl.labels.items)
  const zones = parseZones(ctrl.labels.zones)
  const chain = Math.round(v.mode) === 3
  const hot = ctrl.labels.hot ?? ''
  const { spots, W, centre } = layoutSort(items, zones.map((z) => z.id))
  const gap = Math.min(2.2, 9 / Math.max(1, items.length))
  return (
    <group>
      {!chain && zones.map((z, k) => <Pen key={z.id} x={centre(k)} w={W} color={ZONE_COLS[k % ZONE_COLS.length]} label={z.label} />)}
      {items.map((it, i) => {
        const target = chain ? { x: (i - (items.length - 1) / 2) * gap, z: 0 } : spots.get(it.id)!
        return <Mover key={it.id} item={it} target={target} hot={!!hot && (hot === it.id || hot === it.zone)} gone={it.zone === 'gone'} />
      })}
      {chain && items.slice(1).map((it, i) => <Arrow key={it.id} x={(i + 0.5 - (items.length - 1) / 2) * gap} />)}
      {v.robot > 0.5 && <Steve mood={MOODS[Math.round(v.robotMood)] ?? 'idle'} pos={[chain ? 0 : centre(zones.length - 1) * 0.6, 0, chain ? -1.8 : -2.9]} turn={-0.2} />}
    </group>
  )
}

const MODES = ['sort', 'pictogram', 'chart', 'chain']

export const pens: SceneDef = {
  kind: '3d',
  camera: { position: [0, 6.2, 9.4], target: [0, 0.3, 0.4], fov: 44 },
  defaults: { mode: 0, robot: 1, robotMood: 0 },
  Component: Pens,
  applyParams(ctrl, p) {
    if (typeof p.mode === 'string') ctrl.values.mode = Math.max(0, MODES.indexOf(p.mode))
    if (typeof p.items === 'string') ctrl.labels.items = p.items
    if (typeof p.zones === 'string') ctrl.labels.zones = p.zones
    if (typeof p.robot === 'boolean') ctrl.values.robot = p.robot ? 1 : 0
  },
  actions: {
    move: (ctrl, cue) => () => {
      const items = parseItems(ctrl.labels.items).map((i) => (i.id === cue.id ? { ...i, zone: String(cue.zone ?? '') } : i))
      ctrl.labels.items = items.map((i) => [i.id, i.icon, i.label, i.zone].join(':')).join('|')
    },
    set: (ctrl, cue) => () => {
      if (typeof cue.mode === 'string') ctrl.values.mode = Math.max(0, MODES.indexOf(cue.mode))
      if (typeof cue.items === 'string') ctrl.labels.items = cue.items
      if (typeof cue.zones === 'string') ctrl.labels.zones = cue.zones
    },
    hot: (ctrl, cue) => () => void (ctrl.labels.hot = String(cue.id ?? '')),
    robot: (ctrl, cue) => () => {
      if (cue.on !== undefined) ctrl.values.robot = cue.on === false ? 0 : 1
      if (typeof cue.mood === 'string') ctrl.values.robotMood = Math.max(0, MOODS.indexOf(cue.mood as (typeof MOODS)[number]))
    },
  },
}
