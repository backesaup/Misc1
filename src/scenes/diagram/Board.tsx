import {
  Apple, Baby, Banana, Bean, Beef, Bike, Bird, Bone, Book, Bug, Car, Carrot, Cat, Cherry, Cloud, CloudRain, Coins, Cookie, Croissant,
  Dog, Droplet, Drumstick, Ear, Egg, Eye, Feather, Fish, Flame, Flower, Footprints, Gem, Gift, Glasses, Grape, Ham, Hammer, Hand,
  Heart, House, IceCreamCone, Key, Leaf, Lightbulb, Magnet, Milk, Moon, Mountain, Nut, Package, PawPrint, Pizza, Rabbit, Rat, Rocket,
  Salad, Shell, Ship, Shirt, Snail, Snowflake, Sprout, Squirrel, Star, Sun, Tent, Thermometer, TreeDeciduous, TreePine, Turtle,
  Umbrella, Waves, Wheat, Wind, Worm, Battery, Scissors, Skull,
  type LucideIcon,
} from 'lucide-react'
import type { SceneDef, SceneProps } from '../types'
import { useTicker } from '../useTicker'

// A board for sorting, matching and charts, drawn with a real icon library (lucide).
// Items: "id:icon:label:zone|…". Zones: "id:label|…" (hoops). Modes: 0 sort into zones,
// 1 pictogram (one row of icons per zone), 2 bar chart, 3 chain (items left to right with arrows).

export const ICONS: Record<string, LucideIcon> = {
  apple: Apple, baby: Baby, banana: Banana, bean: Bean, meat: Beef, bike: Bike, bird: Bird, bone: Bone, book: Book, bug: Bug, car: Car,
  carrot: Carrot, cat: Cat, cherry: Cherry, cloud: Cloud, rain: CloudRain, coins: Coins, cookie: Cookie, croissant: Croissant, dog: Dog,
  droplet: Droplet, drumstick: Drumstick, ear: Ear, egg: Egg, eye: Eye, feather: Feather, fish: Fish, flame: Flame, flower: Flower,
  footprints: Footprints, gem: Gem, gift: Gift, glasses: Glasses, grape: Grape, ham: Ham, hammer: Hammer, hand: Hand, heart: Heart,
  house: House, icecream: IceCreamCone, key: Key, leaf: Leaf, bulb: Lightbulb, magnet: Magnet, milk: Milk, moon: Moon, mountain: Mountain,
  nut: Nut, box: Package, paw: PawPrint, pizza: Pizza, rabbit: Rabbit, rat: Rat, rocket: Rocket, salad: Salad, shell: Shell, ship: Ship,
  shirt: Shirt, snail: Snail, snow: Snowflake, sprout: Sprout, squirrel: Squirrel, star: Star, sun: Sun, tent: Tent, thermometer: Thermometer,
  tree: TreeDeciduous, pine: TreePine, turtle: Turtle, umbrella: Umbrella, waves: Waves, wheat: Wheat, wind: Wind, worm: Worm,
  battery: Battery, scissors: Scissors, skull: Skull,
}
const ZONE_COLS = ['#ffd166', '#4f8ff0', '#58b368', '#ff6b5c', '#e8789a']

interface Item { id: string; icon: string; label: string; zone: string }
interface Zone { id: string; label: string }

function parseItems(s?: string): Item[] {
  return (s ?? '').split('|').filter(Boolean).map((p) => {
    const [id, icon, label, zone] = p.split(':')
    return { id, icon, label: label ?? '', zone: zone ?? '' }
  })
}
function parseZones(s?: string): Zone[] {
  return (s ?? '').split('|').filter(Boolean).map((p) => {
    const [id, label] = p.split(':')
    return { id, label: label ?? id }
  })
}

function Icon({ name, x, y, size, highlight }: { name: string; x: number; y: number; size: number; highlight?: boolean }) {
  const I = ICONS[name] ?? Star
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2})`}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.62} fill={highlight ? '#ffd166' : 'white'} stroke="#2b2a33" strokeWidth={3} />
      <I x={size * 0.12} y={size * 0.12} width={size * 0.76} height={size * 0.76} strokeWidth={2.2} color="#2b2a33" />
    </g>
  )
}

function Board({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const items = parseItems(ctrl.labels.items)
  const zones = parseZones(ctrl.labels.zones)
  const mode = Math.round(v.mode)
  const hot = ctrl.labels.hot ?? ''
  if (mode === 3) {
    const gap = 700 / Math.max(1, items.length)
    return (
      <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label="A chain">
        {items.map((it, i) => {
          const x = 50 + gap / 2 + i * gap
          const gone = it.zone === 'gone'
          return (
            <g key={it.id} opacity={gone ? 0.2 : 1}>
              {i > 0 && <path d={`M${x - gap + 58} 260 L${x - 58} 260`} stroke="#2b2a33" strokeWidth={6} markerEnd="url(#arrow)" />}
              <Icon name={it.icon} x={x} y={260} size={86} highlight={hot === it.id} />
              <text x={x} y={350} textAnchor="middle" className="diagram-label">{it.label}</text>
              {gone && <path d={`M${x - 50} 210 L${x + 50} 310 M${x + 50} 210 L${x - 50} 310`} stroke="#e0443a" strokeWidth={8} />}
            </g>
          )
        })}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0 L10 5 L0 10 Z" fill="#2b2a33" />
          </marker>
        </defs>
      </svg>
    )
  }
  if (mode === 1 || mode === 2) {
    const rows = zones.length || 1
    const rowH = 440 / rows
    const max = Math.max(1, ...zones.map((z) => items.filter((i) => i.zone === z.id).length))
    return (
      <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label={mode === 1 ? 'A pictogram' : 'A bar chart'}>
        {zones.map((z, r) => {
          const list = items.filter((i) => i.zone === z.id)
          const y = 70 + r * rowH + rowH / 2
          return (
            <g key={z.id}>
              <text x={150} y={y + 10} textAnchor="end" className="diagram-label">{z.label}</text>
              {mode === 1
                ? list.map((it, k) => <Icon key={it.id} name={it.icon} x={200 + k * 62} y={y} size={50} highlight={hot === z.id} />)
                : (
                  <>
                    <rect x={170} y={y - rowH * 0.32} width={(list.length / max) * 520} height={rowH * 0.64} rx={10} fill={ZONE_COLS[r % ZONE_COLS.length]} stroke="#2b2a33" strokeWidth={3} />
                    <text x={180 + (list.length / max) * 520 + 14} y={y + 12} className="diagram-num">{list.length}</text>
                  </>
                )}
            </g>
          )
        })}
        {mode === 2 && <line x1={170} y1={50} x2={170} y2={520} stroke="#2b2a33" strokeWidth={4} />}
      </svg>
    )
  }
  // sorting into hoops
  const n = Math.max(1, zones.length)
  const zw = 760 / n
  return (
    <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label="Sorting into groups">
      {zones.map((z, k) => (
        <g key={z.id}>
          <ellipse cx={20 + zw * k + zw / 2} cy={300} rx={zw / 2 - 12} ry={200} fill={ZONE_COLS[k % ZONE_COLS.length]} fillOpacity={0.25} stroke={ZONE_COLS[k % ZONE_COLS.length]} strokeWidth={6} />
          <text x={20 + zw * k + zw / 2} y={78} textAnchor="middle" className="diagram-label">{z.label}</text>
        </g>
      ))}
      {items.map((it) => {
        const zi = zones.findIndex((z) => z.id === it.zone)
        const inZone = items.filter((o) => o.zone === it.zone)
        const k = inZone.indexOf(it)
        const cols = 2
        const x = zi >= 0 ? 20 + zw * zi + zw / 2 + ((k % cols) - (cols - 1) / 2) * 92 : 70 + items.filter((o) => !zones.some((z) => z.id === o.zone)).indexOf(it) * 92
        const y = zi >= 0 ? 170 + Math.floor(k / cols) * 100 : 520
        return (
          <g key={it.id}>
            <Icon name={it.icon} x={x} y={y} size={58} highlight={hot === it.id} />
            {it.label && <text x={x} y={y + 54} textAnchor="middle" className="board-label">{it.label}</text>}
          </g>
        )
      })}
    </svg>
  )
}

export const board: SceneDef = {
  kind: '2d',
  defaults: { mode: 0, choice: 0, total: 0 },
  Component: Board,
  applyParams(ctrl, p) {
    if (typeof p.mode === 'string') ctrl.values.mode = ['sort', 'pictogram', 'chart', 'chain'].indexOf(p.mode)
    if (typeof p.items === 'string') ctrl.labels.items = p.items
    if (typeof p.zones === 'string') ctrl.labels.zones = p.zones
  },
  actions: {
    /** Move one item to a zone ("gone" crosses it out in chain mode). */
    move: (ctrl, cue) => () => {
      const items = parseItems(ctrl.labels.items).map((i) => (i.id === cue.id ? { ...i, zone: String(cue.zone ?? '') } : i))
      ctrl.labels.items = items.map((i) => [i.id, i.icon, i.label, i.zone].join(':')).join('|')
    },
    set: (ctrl, cue) => () => {
      if (typeof cue.mode === 'string') ctrl.values.mode = ['sort', 'pictogram', 'chart', 'chain'].indexOf(cue.mode)
      if (typeof cue.items === 'string') ctrl.labels.items = cue.items
      if (typeof cue.zones === 'string') ctrl.labels.zones = cue.zones
    },
    hot: (ctrl, cue) => () => void (ctrl.labels.hot = String(cue.id ?? '')),
  },
}
