import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'

// Measuring things: a thermometer (°C) beside places on the farm, containers filling with
// buckets, and a ruler under an object. `kind`: 0 thermometer, 1 containers, 2 ruler.

const PLACES = [
  { name: 'Freezer', temp: -5, color: '#8fc8f0' },
  { name: 'Frozen pond', temp: 0, color: '#bfe0f0' },
  { name: 'Barn', temp: 12, color: '#c9945c' },
  { name: 'Sunny field', temp: 24, color: '#9fcf86' },
  { name: 'Oven', temp: 180, color: '#e07a4f' },
]

function Thermometer({ temp }: { temp: number }) {
  const lo = -10, hi = 40
  const t = Math.max(lo, Math.min(hi, temp))
  const top = 70, bottom = 430
  const y = bottom - ((t - lo) / (hi - lo)) * (bottom - top)
  const hot = temp > 30, cold = temp <= 0
  return (
    <g transform="translate(210 0)">
      <rect x={-26} y={top - 20} width={52} height={bottom - top + 40} rx={26} fill="#fbf6ec" stroke="#2b2a33" strokeWidth={5} />
      <rect x={-12} y={y} width={24} height={bottom - y + 10} fill={hot ? '#e0443a' : cold ? '#4f8ff0' : '#e07a4f'} />
      <circle cx={0} cy={bottom + 34} r={40} fill={hot ? '#e0443a' : cold ? '#4f8ff0' : '#e07a4f'} stroke="#2b2a33" strokeWidth={5} />
      {Array.from({ length: 6 }, (_, i) => {
        const val = lo + i * 10
        const yy = bottom - ((val - lo) / (hi - lo)) * (bottom - top)
        return (
          <g key={i}>
            <line x1={26} y1={yy} x2={44} y2={yy} stroke="#2b2a33" strokeWidth={3} />
            <text x={52} y={yy + 9} className="clock-min">{val}°</text>
          </g>
        )
      })}
      <text x={0} y={36} textAnchor="middle" className="diagram-num">{temp > 40 ? `${temp}°C!` : `${Math.round(temp)}°C`}</text>
    </g>
  )
}

function Containers({ fills, caps, labels }: { fills: number[]; caps: number[]; labels: string[] }) {
  const shapes = [
    { x: 150, w: 110, h: 260 }, // tall
    { x: 400, w: 220, h: 140 }, // wide
    { x: 640, w: 150, h: 200 }, // medium
  ]
  return (
    <g>
      {shapes.map((s, i) => {
        if (!caps[i]) return null
        const frac = Math.min(1, fills[i] / caps[i])
        const over = fills[i] > caps[i]
        const base = 440
        return (
          <g key={i}>
            <rect x={s.x - s.w / 2} y={base - s.h} width={s.w} height={s.h} rx={10} fill="#eef6fb" stroke="#2b2a33" strokeWidth={5} />
            <rect x={s.x - s.w / 2 + 5} y={base - s.h * frac} width={s.w - 10} height={Math.max(0, s.h * frac - 5)} fill="#7cc6fe" />
            {Array.from({ length: caps[i] - 1 }, (_, k) => (
              <line key={k} x1={s.x - s.w / 2} y1={base - (s.h * (k + 1)) / caps[i]} x2={s.x - s.w / 2 + 16} y2={base - (s.h * (k + 1)) / caps[i]} stroke="#2b2a33" strokeWidth={2} />
            ))}
            {over && <path d={`M${s.x - s.w / 2} ${base - s.h} q-30 40 -20 ${s.h}`} stroke="#7cc6fe" strokeWidth={10} fill="none" strokeLinecap="round" />}
            <text x={s.x} y={base + 40} textAnchor="middle" className="diagram-label">{labels[i] || `${Math.round(fills[i])} buckets`}</text>
          </g>
        )
      })}
    </g>
  )
}

function Ruler({ length, unit }: { length: number; unit: number }) {
  // the object (a fence plank) above a ruler marked in cm
  const px = 600 / 20
  return (
    <g transform="translate(100 0)">
      <rect x={0} y={190} width={length * px} height={60} rx={6} fill="#c9945c" stroke="#8a5f3a" strokeWidth={4} />
      <rect x={0} y={290} width={600} height={70} rx={6} fill="#ffd166" stroke="#2b2a33" strokeWidth={4} />
      {Array.from({ length: 21 }, (_, i) => (
        <g key={i}>
          <line x1={i * px} y1={290} x2={i * px} y2={i % 5 === 0 ? 330 : 312} stroke="#2b2a33" strokeWidth={3} />
          {i % 5 === 0 && <text x={i * px} y={352} textAnchor="middle" className="clock-min">{i}</text>}
        </g>
      ))}
      <text x={300} y={410} textAnchor="middle" className="diagram-label">{unit ? `${length} cm` : ''}</text>
    </g>
  )
}

function Gauge({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const kind = Math.round(v.kind)
  const place = PLACES[Math.max(0, Math.min(PLACES.length - 1, Math.round(v.place)))]
  return (
    <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label="Measuring">
      {kind === 0 && (
        <>
          <Thermometer temp={v.temp} />
          {v.place >= 0 && (
            <g transform="translate(520 260)">
              <rect x={-170} y={-120} width={340} height={240} rx={24} fill={place.color} stroke="#2b2a33" strokeWidth={4} />
              <text y={10} textAnchor="middle" className="diagram-label">{place.name}</text>
            </g>
          )}
        </>
      )}
      {kind === 1 && (
        <Containers
          fills={[v.fill0, v.fill1, v.fill2]}
          caps={[Math.round(v.cap0), Math.round(v.cap1), Math.round(v.cap2)]}
          labels={(ctrl.labels.names ?? '').split('|').map((s) => s || '')}
        />
      )}
      {kind === 2 && <Ruler length={Math.round(v.length)} unit={v.unitShown} />}
    </svg>
  )
}

export const gauge: SceneDef = {
  kind: '2d',
  defaults: { kind: 0, temp: 12, place: -1, fill0: 0, fill1: 0, fill2: 0, cap0: 6, cap1: 6, cap2: 0, length: 12, unitShown: 0, choice: 0, total: 0 },
  Component: Gauge,
  applyParams(ctrl, p) {
    if (typeof p.kind === 'string') ctrl.values.kind = ['thermometer', 'containers', 'ruler'].indexOf(p.kind)
    for (const k of ['temp', 'place', 'cap0', 'cap1', 'cap2', 'length'] as const) if (typeof p[k] === 'number') ctrl.values[k] = p[k] as number
    if (typeof p.names === 'string') ctrl.labels.names = p.names
  },
  actions: {
    place: (ctrl, cue, { reduced }) => {
      const i = Number(cue.place ?? 0)
      const temp = [-5, 0, 12, 24, 180][i] ?? 12
      return gsap.to(ctrl.values, { temp, duration: dur(cue, reduced, 1.4), ease: 'power2.inOut', onStart: () => void (ctrl.values.place = i) })
    },
    fill: (ctrl, cue, { reduced }) => {
      const k = `fill${Number(cue.which ?? 0)}`
      return gsap.to(ctrl.values, { [k]: Number(cue.to ?? 0), duration: dur(cue, reduced, 2), ease: `steps(${Math.max(1, Number(cue.to ?? 1))})` })
    },
    set: (ctrl, cue) => () => {
      for (const k of ['fill0', 'fill1', 'fill2', 'cap0', 'cap1', 'cap2', 'length', 'unitShown', 'temp'] as const) if (typeof cue[k] === 'number') ctrl.values[k] = cue[k] as number
      if (typeof cue.names === 'string') ctrl.labels.names = cue.names
    },
  },
}
