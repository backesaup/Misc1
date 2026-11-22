import type { SceneDef, SceneProps } from '../types'
import { useTicker } from '../useTicker'

// Coins (original drawings, sized and coloured roughly like real ones) and a market stall.
// `coins` label: a list like "20,20,5,5" laid out on the counter. `price` shows a price tag.

const STYLE: Record<number, { r: number; fill: string; edge: string; label: string; heptagon?: boolean }> = {
  1: { r: 30, fill: '#c57b4a', edge: '#8a4f2a', label: '1p' },
  2: { r: 36, fill: '#c57b4a', edge: '#8a4f2a', label: '2p' },
  5: { r: 27, fill: '#d9dde6', edge: '#8e95a3', label: '5p' },
  10: { r: 36, fill: '#d9dde6', edge: '#8e95a3', label: '10p' },
  20: { r: 32, fill: '#d9dde6', edge: '#8e95a3', label: '20p', heptagon: true },
  50: { r: 40, fill: '#d9dde6', edge: '#8e95a3', label: '50p', heptagon: true },
  100: { r: 36, fill: '#e7c25a', edge: '#a8862a', label: '£1' },
  200: { r: 42, fill: '#e7c25a', edge: '#8e95a3', label: '£2' },
}

function Coin({ value, x, y }: { value: number; x: number; y: number }) {
  const s = STYLE[value] ?? STYLE[1]
  const shape = s.heptagon
    ? Array.from({ length: 7 }, (_, i) => {
        const a = -Math.PI / 2 + (i / 7) * Math.PI * 2
        return `${x + s.r * Math.cos(a)},${y + s.r * Math.sin(a)}`
      }).join(' ')
    : null
  return (
    <g>
      {shape ? <polygon points={shape} fill={s.fill} stroke={s.edge} strokeWidth={4} /> : <circle cx={x} cy={y} r={s.r} fill={s.fill} stroke={s.edge} strokeWidth={4} />}
      <text x={x} y={y + 8} textAnchor="middle" className="coin-label" fontSize={s.r * 0.62}>
        {s.label}
      </text>
    </g>
  )
}

function Coins({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const list = (ctrl.labels.coins ?? '').split(',').map(Number).filter((n) => n > 0)
  const total = list.reduce((a, b) => a + b, 0)
  const perRow = 7
  const fmt = (p: number) => (p >= 100 ? `£${(p / 100).toFixed(p % 100 ? 2 : 0)}` : `${p}p`)
  return (
    <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label={`Coins making ${fmt(total)}`}>
      {/* stall awning and counter */}
      <path d="M80 40 H720 L700 110 H100 Z" fill="#e07a4f" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${100 + i * 75} 110 q37 30 75 0`} fill={i % 2 ? '#f4f1e8' : '#e07a4f'} />
      ))}
      <rect x={90} y={300} width={620} height={200} rx={16} fill="#c9945c" stroke="#8a5f3a" strokeWidth={5} />
      {ctrl.labels.item && (
        <g transform="translate(400 210)">
          <text textAnchor="middle" className="diagram-label">{ctrl.labels.item}</text>
          {v.price > 0 && (
            <g transform="translate(150 -12)">
              <rect x={-52} y={-30} width={104} height={56} rx={10} fill="#fff" stroke="#2b2a33" strokeWidth={3} />
              <text y={10} textAnchor="middle" className="diagram-num">{fmt(Math.round(v.price))}</text>
            </g>
          )}
        </g>
      )}
      {list.map((c, i) => (
        <Coin key={i} value={c} x={160 + (i % perRow) * 80} y={360 + Math.floor(i / perRow) * 82} />
      ))}
      {v.showTotal > 0.5 && list.length > 0 && (
        <g transform="translate(400 540)">
          <text textAnchor="middle" className="diagram-num">{fmt(total)}</text>
        </g>
      )}
    </svg>
  )
}

/** A way to make `total` pence using `n` coins of `big` value, then the fewest smaller coins. */
export function coinsFor(total: number, big: number, n: number) {
  const out: number[] = Array(n).fill(big)
  let left = total - n * big
  for (const c of [50, 20, 10, 5, 2, 1]) {
    if (c >= big) continue
    while (left >= c) out.push(c), (left -= c)
  }
  return out
}

export const coins: SceneDef = {
  kind: '2d',
  defaults: { price: 0, showTotal: 1, choice: 0, total: 50 },
  Component: Coins,
  applyParams(ctrl, p) {
    if (typeof p.coins === 'string') ctrl.labels.coins = p.coins
    if (typeof p.item === 'string') ctrl.labels.item = p.item
    if (typeof p.price === 'number') ctrl.values.price = p.price
  },
  actions: {
    coins: (ctrl, cue) => () => {
      if (typeof cue.coins === 'string') ctrl.labels.coins = cue.coins
      if (typeof cue.item === 'string') ctrl.labels.item = cue.item
      if (typeof cue.price === 'number') ctrl.values.price = cue.price
      if (cue.total !== undefined) ctrl.values.showTotal = cue.total ? 1 : 0
    },
  },
}
