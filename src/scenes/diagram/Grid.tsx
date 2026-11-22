import type { SceneDef, SceneProps } from '../types'
import { useTicker } from '../useTicker'
import { useSkinSprites } from '../voxel/skins'

// A grid of squares: the hundred square (count-by patterns), symmetry (a mirror line),
// tiling, and Steve following turn cards. Driven by values + cell lists in labels.

const COLS = ['#ffd166', '#4f8ff0', '#58b368', '#ff6b5c', '#e8789a', '#2b2a33']
const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]] // up, right, down, left

function parseCells(s: string | undefined) {
  const m = new Map<number, number>()
  if (!s) return m
  for (const part of s.split(',')) {
    const [i, c] = part.split(':').map(Number)
    if (Number.isFinite(i)) m.set(i, Number.isFinite(c) ? c : 0)
  }
  return m
}

function Grid({ ctrl }: SceneProps) {
  useTicker()
  const steve = useSkinSprites('steve')
  const v = ctrl.values
  const cols = Math.round(v.cols), rows = Math.round(v.rows)
  const size = Math.min(780 / cols, 548 / rows)
  const ox = (800 - size * cols) / 2, oy = (560 - size * rows) / 2
  const every = Math.round(v.every), every2 = Math.round(v.every2)
  const filled = parseCells(ctrl.labels.cells)
  const mirrored = new Map(filled)
  if (v.mirror > 0.5 && v.mirrorFill > 0.5)
    for (const [i, c] of filled) {
      const r = Math.floor(i / cols), col = i % cols
      mirrored.set(r * cols + (cols - 1 - col), c)
    }
  const cells = []
  for (let i = 0; i < cols * rows; i++) {
    const n = i + 1
    const r = Math.floor(i / cols), c = i % cols
    const lit = every > 0 && n % every === 0 && n <= v.reach
    const lit2 = every2 > 0 && n % every2 === 0 && n <= v.reach
    const fillIdx = mirrored.get(i)
    let fill = '#fbf6ec'
    if (lit && lit2) fill = '#58b368'
    else if (lit) fill = COLS[0]
    else if (lit2) fill = COLS[1]
    if (fillIdx !== undefined) fill = COLS[fillIdx % COLS.length]
    cells.push(
      <g key={i}>
        <rect x={ox + c * size + 1.5} y={oy + r * size + 1.5} width={size - 3} height={size - 3} rx={size * 0.12} fill={fill} stroke="#2b2a33" strokeOpacity={0.25} strokeWidth={1.5} />
        {v.numbers > 0.5 && (
          <text x={ox + c * size + size / 2} y={oy + r * size + size / 2 + size * 0.15} textAnchor="middle" fontSize={size * 0.38} className="grid-num" opacity={lit || lit2 ? 1 : 0.7}>
            {n}
          </text>
        )}
      </g>,
    )
  }
  const rx = ox + (v.robotX + 0.5) * size, ry = oy + (v.robotY + 0.5) * size
  const dir = ((Math.round(v.robotDir) % 4) + 4) % 4
  const goal = v.goalX >= 0 ? [ox + (v.goalX + 0.5) * size, oy + (v.goalY + 0.5) * size] : null
  return (
    <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label="A grid of squares">
      {cells}
      {v.mirror > 0.5 && <line x1={400} y1={oy - 14} x2={400} y2={oy + rows * size + 14} stroke="#e07a4f" strokeWidth={6} strokeDasharray="14 10" strokeLinecap="round" />}
      {goal && (
        <g transform={`translate(${goal[0]} ${goal[1]})`}>
          <rect x={-size * 0.32} y={-size * 0.22} width={size * 0.64} height={size * 0.44} rx={6} fill="#c9945c" stroke="#2b2a33" strokeWidth={2.5} />
          <rect x={-size * 0.32} y={-size * 0.22} width={size * 0.64} height={size * 0.14} rx={4} fill="#f2b84b" />
        </g>
      )}
      {v.robot > 0.5 && (
        <g transform={`translate(${rx} ${ry})`}>
          <path transform={`rotate(${dir * 90})`} d={`M0 ${-size * 0.62} L${size * 0.2} ${-size * 0.4} L${-size * 0.2} ${-size * 0.4} Z`} fill="#e07a4f" stroke="#2b2a33" strokeWidth={2} />
          <rect x={-size * 0.36} y={-size * 0.36} width={size * 0.72} height={size * 0.72} rx={4} fill="#2b2a33" />
          <image href={steve.face} x={-size * 0.33} y={-size * 0.33} width={size * 0.66} height={size * 0.66} style={{ imageRendering: 'pixelated' }} />
        </g>
      )}
    </svg>
  )
}

export const grid: SceneDef = {
  kind: '2d',
  defaults: { cols: 10, rows: 10, numbers: 1, every: 0, every2: 0, reach: 100, mirror: 0, mirrorFill: 0, robot: 0, robotX: 0, robotY: 0, robotDir: 1, goalX: -1, goalY: -1, choice: 0, total: 100 },
  Component: Grid,
  applyParams(ctrl, p) {
    for (const k of ['cols', 'rows', 'every', 'every2', 'robotX', 'robotY', 'robotDir', 'goalX', 'goalY'] as const) if (typeof p[k] === 'number') ctrl.values[k] = p[k] as number
    for (const k of ['numbers', 'mirror', 'robot'] as const) if (typeof p[k] === 'boolean') ctrl.values[k] = p[k] ? 1 : 0
    if (typeof p.cells === 'string') ctrl.labels.cells = p.cells
    ctrl.values.reach = ctrl.values.cols * ctrl.values.rows
  },
  actions: {
    every: (ctrl, cue) => () => {
      ctrl.values.every = Number(cue.n ?? 0)
      if (cue.n2 !== undefined) ctrl.values.every2 = Number(cue.n2)
    },
    cells: (ctrl, cue) => () => void (ctrl.labels.cells = String(cue.cells ?? '')),
    mirror: (ctrl, cue) => () => {
      ctrl.values.mirror = cue.on === false ? 0 : 1
      ctrl.values.mirrorFill = cue.fill ? 1 : 0
    },
    robot: (ctrl, cue) => () => {
      for (const [k, key] of [['x', 'robotX'], ['y', 'robotY'], ['dir', 'robotDir']] as const) if (typeof cue[k] === 'number') ctrl.values[key] = cue[k] as number
      if (cue.on !== undefined) ctrl.values.robot = cue.on === false ? 0 : 1
      if (typeof cue.goalX === 'number') ctrl.values.goalX = cue.goalX
      if (typeof cue.goalY === 'number') ctrl.values.goalY = cue.goalY
    },
    /** Run a list of turn cards: "F" forward, "L" quarter turn left, "R" quarter turn right. */
    cards: (ctrl, cue) => () => {
      const cards = String(cue.cards ?? '').split('')
      let k = 0
      const step = () => {
        const c = cards[k++]
        if (!c) return
        const v = ctrl.values
        if (c === 'F') {
          const [dx, dy] = DIRS[((Math.round(v.robotDir) % 4) + 4) % 4]
          v.robotX = Math.max(0, Math.min(v.cols - 1, v.robotX + dx))
          v.robotY = Math.max(0, Math.min(v.rows - 1, v.robotY + dy))
        } else if (c === 'R') v.robotDir += 1
        else if (c === 'L') v.robotDir -= 1
        window.setTimeout(step, 550)
      }
      step()
    },
  },
}
