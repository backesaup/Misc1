import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'

// A balance scale. The heavier side goes down; the sign between the pans shows <, = or >.
// Left pan: `left` ones (or a pumpkin of weight `left` when pumpkin=1). Right pan: `fives` 5-blocks + `ones` 1-blocks.
// Units are "blocks" (or grams / kilograms when unit = 1 / 2).

const UNITS = ['', 'g', 'kg']

function Blocks({ n, five, x, baseY, color }: { n: number; five?: boolean; x: number; baseY: number; color: string }) {
  const out = []
  const w = five ? 36 : 28
  const h = five ? 50 : 28
  const perRow = five ? 3 : 5
  for (let i = 0; i < n; i++) {
    const col = i % perRow, row = Math.floor(i / perRow)
    out.push(
      <g key={i} transform={`translate(${x + (col - (perRow - 1) / 2) * (w + 3)} ${baseY - (row + 1) * (h + 3)})`}>
        <rect x={-w / 2} y={0} width={w} height={h} rx={4} fill={color} stroke="#2b2a33" strokeWidth={2.5} />
        {five && <text x={0} y={h / 2 + 7} textAnchor="middle" className="diagram-num small">5</text>}
      </g>,
    )
  }
  return <>{out}</>
}

function Balance({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const L = Math.round(v.left)
  const R = Math.round(v.fives) * 5 + Math.round(v.ones)
  const target = R === L ? 0 : Math.max(-14, Math.min(14, (R - L) * 1.6))
  v.tilt += (target - v.tilt) * 0.12 // settle smoothly toward the heavier side
  const a = (v.tilt * Math.PI) / 180
  const cx = 400, cy = 150, arm = 240
  const lx = cx - arm * Math.cos(a), ly = cy - arm * Math.sin(a)
  const rx = cx + arm * Math.cos(a), ry = cy + arm * Math.sin(a)
  const pan = 300 - 150 // hang length
  const sign = R === L ? '=' : L > R ? '>' : '<'
  const unit = UNITS[Math.round(v.unit)] ?? ''
  return (
    <svg viewBox="0 0 800 520" className="diagram" role="img" aria-label={`Balance: left ${L}, right ${R}`}>
      <rect x={370} y={150} width={60} height={300} rx={8} fill="#a9784d" />
      <rect x={300} y={440} width={200} height={26} rx={10} fill="#8a5f3a" />
      <line x1={lx} y1={ly} x2={rx} y2={ry} stroke="#5b4636" strokeWidth={14} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={14} fill="#ffd166" stroke="#2b2a33" strokeWidth={3} />
      {[
        [lx, ly],
        [rx, ry],
      ].map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x - 70} y2={y + pan} stroke="#5b4636" strokeWidth={3} />
          <line x1={x} y1={y} x2={x + 70} y2={y + pan} stroke="#5b4636" strokeWidth={3} />
          <path d={`M${x - 95} ${y + pan} h190 q-10 26 -95 26 q-85 0 -95 -26 z`} fill="#d9c9a8" stroke="#2b2a33" strokeWidth={3} />
        </g>
      ))}
      {v.pumpkin > 0.5 ? (
        <g transform={`translate(${lx} ${ly + pan - 44})`}>
          <ellipse rx={58} ry={44} fill="#e8892f" stroke="#2b2a33" strokeWidth={3} />
          <rect x={-6} y={-58} width={12} height={20} rx={4} fill="#5c7a2e" />
        </g>
      ) : (
        <Blocks n={L} x={lx} baseY={ly + pan} color="#c9945c" />
      )}
      <Blocks n={Math.round(v.fives)} five x={rx - (Math.round(v.ones) ? 40 : 0)} baseY={ry + pan} color="#3b6fd1" />
      <Blocks n={Math.round(v.ones)} x={rx + (Math.round(v.fives) ? 55 : 0)} baseY={ry + pan} color="#f2b84b" />
      {v.signs > 0.5 && (
        <g transform={`translate(${cx} 80)`}>
          <rect x={-70} y={-46} width={140} height={78} rx={18} fill="white" stroke="#2b2a33" strokeWidth={3} />
          <text x={-40} y={10} textAnchor="middle" className="diagram-num">{L}</text>
          <text x={0} y={12} textAnchor="middle" className="diagram-sign">{sign}</text>
          <text x={40} y={10} textAnchor="middle" className="diagram-num">{R}</text>
        </g>
      )}
      {v.labels > 0.5 && (
        <>
          <text x={lx} y={ly + pan + 60} textAnchor="middle" className="diagram-label">{L}{unit && ` ${unit}`}</text>
          <text x={rx} y={ry + pan + 60} textAnchor="middle" className="diagram-label">{R}{unit && ` ${unit}`}</text>
        </>
      )}
    </svg>
  )
}

export const balance: SceneDef = {
  kind: '2d',
  defaults: { left: 10, fives: 0, ones: 0, tilt: 0, signs: 0, labels: 1, pumpkin: 0, unit: 0, choice: 0, total: 10 },
  Component: Balance,
  applyParams(ctrl, p) {
    for (const k of ['left', 'fives', 'ones', 'unit'] as const) if (typeof p[k] === 'number') ctrl.values[k] = p[k] as number
    if (typeof p.signs === 'boolean') ctrl.values.signs = p.signs ? 1 : 0
    if (typeof p.pumpkin === 'boolean') ctrl.values.pumpkin = p.pumpkin ? 1 : 0
    if (typeof p.total === 'number') ctrl.values.left = p.total
  },
  actions: {
    set: (ctrl, cue) => () => {
      for (const k of ['left', 'fives', 'ones', 'unit'] as const) if (typeof cue[k] === 'number') ctrl.values[k] = cue[k] as number
      if (typeof cue.pumpkin === 'boolean') ctrl.values.pumpkin = cue.pumpkin ? 1 : 0
    },
    signs: (ctrl, cue) => () => void (ctrl.values.signs = cue.on === false ? 0 : 1),
    addOnes: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { ones: Number(cue.to ?? 0), duration: dur(cue, reduced, 1.5), ease: `steps(${Math.max(1, Math.abs(Number(cue.to ?? 0) - ctrl.values.ones))})` }),
  },
}
