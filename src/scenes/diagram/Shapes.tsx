import type { SceneDef, SceneProps } from '../types'
import { useTicker } from '../useTicker'

// 2D shapes. view 0: one polygon with `sides` sides (corners as dots, sides numbered);
// sides = 2 draws two lines that can't close; sides = 0 a circle.
// view 1: an animal built from circles, squares and triangles (preset `animal`).
// view 2: tiling a floor with `tile` (0 squares, 1 triangles, 2 hexagons, 3 circles) to show gaps.

const COL = ['#ff6b5c', '#4f8ff0', '#ffd166', '#58b368', '#e8789a', '#c9945c']

function polygon(n: number, cx: number, cy: number, r: number, rot = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number]
  })
}

function One({ sides, showCorners, showSides }: { sides: number; showCorners: boolean; showSides: boolean }) {
  const cx = 400, cy = 280, r = 200
  if (sides === 0) return <circle cx={cx} cy={cy} r={r} fill={COL[1]} stroke="#2b2a33" strokeWidth={6} />
  if (sides === 2)
    return (
      <g stroke="#2b2a33" strokeWidth={10} strokeLinecap="round">
        <line x1={250} y1={420} x2={400} y2={120} />
        <line x1={400} y1={120} x2={550} y2={420} />
        <text x={400} y={500} textAnchor="middle" className="diagram-label" stroke="none">It can't close!</text>
      </g>
    )
  const pts = sides === 4 ? ([[cx - r * 0.8, cy - r * 0.8], [cx + r * 0.8, cy - r * 0.8], [cx + r * 0.8, cy + r * 0.8], [cx - r * 0.8, cy + r * 0.8]] as [number, number][]) : polygon(sides, cx, cy, r)
  return (
    <g>
      <polygon points={pts.map((p) => p.join(',')).join(' ')} fill={COL[(sides - 3) % COL.length]} stroke="#2b2a33" strokeWidth={6} strokeLinejoin="round" />
      {showSides &&
        pts.map((p, i) => {
          const q = pts[(i + 1) % pts.length]
          const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2
          const ox = mx - cx, oy = my - cy, len = Math.hypot(ox, oy) || 1
          return (
            <text key={i} x={mx + (ox / len) * 34} y={my + (oy / len) * 34 + 10} textAnchor="middle" className="diagram-num">
              {i + 1}
            </text>
          )
        })}
      {showCorners && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={16} fill="#2b2a33" stroke="#fff" strokeWidth={4} />)}
    </g>
  )
}

function Animal() {
  // a cat: circle head, triangle ears, square body, rectangle tail
  return (
    <g stroke="#2b2a33" strokeWidth={5} strokeLinejoin="round">
      <rect x={300} y={270} width={200} height={170} rx={6} fill={COL[2]} />
      <rect x={490} y={290} width={140} height={30} rx={6} fill={COL[2]} transform="rotate(-30 490 300)" />
      <circle cx={400} cy={200} r={90} fill={COL[2]} />
      <polygon points="330,140 350,60 395,120" fill={COL[0]} />
      <polygon points="470,140 450,60 405,120" fill={COL[0]} />
      <circle cx={370} cy={195} r={12} fill="#2b2a33" />
      <circle cx={430} cy={195} r={12} fill="#2b2a33" />
      <polygon points="390,225 410,225 400,240" fill={COL[4]} />
      <rect x={315} y={430} width={50} height={40} fill={COL[5]} />
      <rect x={435} y={430} width={50} height={40} fill={COL[5]} />
    </g>
  )
}

function Tiles({ tile }: { tile: number }) {
  const out: React.ReactNode[] = []
  const x0 = 100, y0 = 60, W = 600, H = 440
  out.push(<rect key="floor" x={x0} y={y0} width={W} height={H} fill="#2b2a33" rx={8} />)
  if (tile === 0) {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) out.push(<rect key={`${x}${y}`} x={x0 + x * (W / 7)} y={y0 + y * (H / 5)} width={W / 7} height={H / 5} fill={COL[(x + y) % 4]} stroke="#2b2a33" strokeWidth={3} />)
  } else if (tile === 1) {
    const s = W / 6, h = H / 5
    for (let y = 0; y < 5; y++)
      for (let x = -1; x < 13; x++) {
        const up = (x + y) % 2 === 0
        const bx = x0 + (x * s) / 2, by = y0 + y * h
        const pts = up ? `${bx},${by + h} ${bx + s / 2},${by} ${bx + s},${by + h}` : `${bx},${by} ${bx + s},${by} ${bx + s / 2},${by + h}`
        out.push(<polygon key={`${x}_${y}`} points={pts} fill={COL[(x + y + 8) % 4]} stroke="#2b2a33" strokeWidth={3} />)
      }
  } else if (tile === 2) {
    const r = 46, w = Math.sqrt(3) * r
    for (let y = -1; y < 7; y++)
      for (let x = -1; x < 9; x++) {
        const cx = x0 + x * w + (y % 2 ? w / 2 : 0), cy = y0 + y * r * 1.5
        out.push(<polygon key={`${x}h${y}`} points={polygon(6, cx, cy, r, Math.PI / 6).map((p) => p.join(',')).join(' ')} fill={COL[(x + y + 8) % 4]} stroke="#2b2a33" strokeWidth={3} />)
      }
  } else {
    const r = 44
    for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) out.push(<circle key={`${x}c${y}`} cx={x0 + r + x * r * 2 + 2} cy={y0 + r + y * r * 2} r={r} fill={COL[(x + y) % 4]} stroke="#2b2a33" strokeWidth={3} />)
  }
  return (
    <g>
      <defs>
        <clipPath id="floor-clip">
          <rect x={x0} y={y0} width={W} height={H} rx={8} />
        </clipPath>
      </defs>
      <g clipPath="url(#floor-clip)">{out}</g>
      <rect x={x0} y={y0} width={W} height={H} rx={8} fill="none" stroke="#2b2a33" strokeWidth={6} />
    </g>
  )
}

function Shapes({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const view = Math.round(v.view)
  return (
    <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label="Shapes">
      {view === 0 && <One sides={Math.round(v.sides)} showCorners={v.corners > 0.5} showSides={v.sideNums > 0.5} />}
      {view === 1 && <Animal />}
      {view === 2 && <Tiles tile={Math.round(v.tile)} />}
    </svg>
  )
}

export const shapes: SceneDef = {
  kind: '2d',
  defaults: { view: 0, sides: 3, corners: 0, sideNums: 0, tile: 0, choice: 3, total: 0 },
  Component: Shapes,
  applyParams(ctrl, p) {
    if (typeof p.view === 'string') ctrl.values.view = ['shape', 'animal', 'tiles'].indexOf(p.view)
    for (const k of ['sides', 'tile'] as const) if (typeof p[k] === 'number') ctrl.values[k] = p[k] as number
    if (typeof p.corners === 'boolean') ctrl.values.corners = p.corners ? 1 : 0
    if (typeof p.sideNums === 'boolean') ctrl.values.sideNums = p.sideNums ? 1 : 0
  },
  actions: {
    set: (ctrl, cue) => () => {
      if (typeof cue.view === 'string') ctrl.values.view = ['shape', 'animal', 'tiles'].indexOf(cue.view)
      for (const k of ['sides', 'tile'] as const) if (typeof cue[k] === 'number') ctrl.values[k] = cue[k] as number
      if (cue.corners !== undefined) ctrl.values.corners = cue.corners ? 1 : 0
      if (cue.sideNums !== undefined) ctrl.values.sideNums = cue.sideNums ? 1 : 0
    },
  },
}
