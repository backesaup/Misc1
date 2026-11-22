import type { SceneDef, SceneProps } from '../types'
import { useTicker } from '../useTicker'

// Fractions: a square field or a round pie cut into parts (equal, or deliberately unfair),
// some parts shaded. A second shape can sit beside it to compare (2/4 next to 1/2).
// Square cut styles: 0 vertical strips, 1 horizontal, 2 diagonal (halves) / triangles, 3 grid (quarters).

const SHADE = '#58b368'
const SHADE2 = '#4f8ff0'

function SquareShape({ x, size, parts, shaded, style, unfair, color }: { x: number; size: number; parts: number; shaded: number; style: number; unfair: boolean; color: string }) {
  const y = 280 - size / 2
  const pieces: React.ReactNode[] = []
  const stroke = { stroke: '#2b2a33', strokeWidth: 4, strokeLinejoin: 'round' as const }
  if (style === 2 && parts === 2) {
    pieces.push(<path key="a" d={`M${x} ${y} H${x + size} L${x} ${y + size} Z`} fill={shaded >= 1 ? color : '#cfe3b4'} {...stroke} />)
    pieces.push(<path key="b" d={`M${x + size} ${y} V${y + size} H${x} Z`} fill={shaded >= 2 ? color : '#cfe3b4'} {...stroke} />)
  } else if (style === 2 && parts === 4) {
    const cx = x + size / 2, cy = y + size / 2
    const tri = [[x, y, x + size, y], [x + size, y, x + size, y + size], [x + size, y + size, x, y + size], [x, y + size, x, y]]
    tri.forEach(([ax, ay, bx, by], i) => pieces.push(<path key={i} d={`M${ax} ${ay} L${bx} ${by} L${cx} ${cy} Z`} fill={i < shaded ? color : '#cfe3b4'} {...stroke} />))
  } else if (style === 3 && parts === 4) {
    for (let i = 0; i < 4; i++) pieces.push(<rect key={i} x={x + (i % 2) * (size / 2)} y={y + Math.floor(i / 2) * (size / 2)} width={size / 2} height={size / 2} fill={i < shaded ? color : '#cfe3b4'} {...stroke} />)
  } else {
    // strips; an unfair cut makes the first strip much bigger
    const weights = Array.from({ length: parts }, (_, i) => (unfair && i === 0 ? 2.2 : 1))
    const sum = weights.reduce((a, b) => a + b, 0)
    let at = 0
    weights.forEach((wt, i) => {
      const len = (wt / sum) * size
      pieces.push(
        style === 1 ? (
          <rect key={i} x={x} y={y + at} width={size} height={len} fill={i < shaded ? color : '#cfe3b4'} {...stroke} />
        ) : (
          <rect key={i} x={x + at} y={y} width={len} height={size} fill={i < shaded ? color : '#cfe3b4'} {...stroke} />
        ),
      )
      at += len
    })
  }
  return <g>{pieces}</g>
}

function Pie({ x, r, parts, shaded, unfair, color }: { x: number; r: number; parts: number; shaded: number; unfair: boolean; color: string }) {
  const cy = 280
  if (parts <= 1) return <circle cx={x} cy={cy} r={r} fill={shaded ? color : '#f2c38b'} stroke="#2b2a33" strokeWidth={4} />
  const weights = Array.from({ length: parts }, (_, i) => (unfair && i === 0 ? 2.4 : 1))
  const sum = weights.reduce((a, b) => a + b, 0)
  let ang = -Math.PI / 2
  return (
    <g>
      {weights.map((wt, i) => {
        const a2 = ang + (wt / sum) * Math.PI * 2
        const large = a2 - ang > Math.PI ? 1 : 0
        const d = `M${x} ${cy} L${x + r * Math.cos(ang)} ${cy + r * Math.sin(ang)} A${r} ${r} 0 ${large} 1 ${x + r * Math.cos(a2)} ${cy + r * Math.sin(a2)} Z`
        ang = a2
        return <path key={i} d={d} fill={i < shaded ? color : '#f2c38b'} stroke="#2b2a33" strokeWidth={4} strokeLinejoin="round" />
      })}
    </g>
  )
}

function Fraction({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const two = v.compare > 0.5
  const parts = Math.max(1, Math.round(v.parts)), shaded = Math.round(v.shaded)
  const parts2 = Math.max(1, Math.round(v.parts2)), shaded2 = Math.round(v.shaded2)
  const pie = v.shape > 0.5
  const xs = two ? [230, 570] : [400]
  const size = two ? 280 : 380
  const label = (p: number, s: number) => (s > 0 && v.labels > 0.5 ? `${s}/${p}` : '')
  return (
    <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label={`${pie ? 'Pie' : 'Field'} cut into ${parts} parts`}>
      {xs.map((cx, k) => {
        const p = k === 0 ? parts : parts2
        const s = k === 0 ? shaded : shaded2
        const col = k === 0 ? SHADE : SHADE2
        return (
          <g key={k}>
            {pie ? (
              <Pie x={cx} r={size / 2} parts={p} shaded={s} unfair={k === 0 && v.unfair > 0.5} color={col} />
            ) : (
              <SquareShape x={cx - size / 2} size={size} parts={p} shaded={s} style={k === 0 ? Math.round(v.style) : Math.round(v.style2)} unfair={k === 0 && v.unfair > 0.5} color={col} />
            )}
            {label(p, s) && (
              <text x={cx} y={280 + size / 2 + 56} textAnchor="middle" className="diagram-num big">{label(p, s)}</text>
            )}
          </g>
        )
      })}
      {two && v.labels > 0.5 && <text x={400} y={296} textAnchor="middle" className="diagram-sign">{v.same > 0.5 ? '=' : ''}</text>}
    </svg>
  )
}

export const fraction: SceneDef = {
  kind: '2d',
  defaults: { shape: 0, parts: 2, shaded: 0, style: 0, unfair: 0, compare: 0, parts2: 2, shaded2: 0, style2: 0, labels: 1, same: 0, choice: 2, total: 1 },
  Component: Fraction,
  applyParams(ctrl, p) {
    if (typeof p.shape === 'string') ctrl.values.shape = p.shape === 'pie' ? 1 : 0
    for (const k of ['parts', 'shaded', 'style', 'parts2', 'shaded2', 'style2'] as const) if (typeof p[k] === 'number') ctrl.values[k] = p[k] as number
    for (const k of ['unfair', 'compare', 'labels', 'same'] as const) if (typeof p[k] === 'boolean') ctrl.values[k] = p[k] ? 1 : 0
  },
  actions: {
    cut: (ctrl, cue) => () => {
      for (const k of ['parts', 'shaded', 'style', 'parts2', 'shaded2', 'style2'] as const) if (typeof cue[k] === 'number') ctrl.values[k] = cue[k] as number
      for (const k of ['unfair', 'compare', 'same', 'labels'] as const) if (typeof cue[k] === 'boolean') ctrl.values[k] = cue[k] ? 1 : 0
      if (typeof cue.shape === 'string') ctrl.values.shape = cue.shape === 'pie' ? 1 : 0
    },
  },
}
