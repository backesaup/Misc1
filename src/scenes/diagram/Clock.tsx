import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'

// An analogue clock. `minutes` is minutes since midnight (tweenable, so time can fly by).
// Optional: a sun/moon for day and night, a shaded half for "half past", an activity label.

function Clock({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const total = v.minutes
  const h = (total / 60) % 12
  const m = total % 60
  const cx = 400, cy = 270, r = 210
  const hand = (deg: number, len: number, w: number, color: string) => {
    const a = ((deg - 90) * Math.PI) / 180
    return <line x1={cx} y1={cy} x2={cx + len * Math.cos(a)} y2={cy + len * Math.sin(a)} stroke={color} strokeWidth={w} strokeLinecap="round" />
  }
  const day = (total / 60) % 24 >= 6 && (total / 60) % 24 < 19
  const sector = (frac: number) => {
    if (frac <= 0) return null
    const a2 = -Math.PI / 2 + frac * Math.PI * 2
    const large = frac > 0.5 ? 1 : 0
    return <path d={`M${cx} ${cy} L${cx} ${cy - r + 10} A${r - 10} ${r - 10} 0 ${large} 1 ${cx + (r - 10) * Math.cos(a2)} ${cy + (r - 10) * Math.sin(a2)} Z`} fill="#ffd166" opacity={0.55} />
  }
  return (
    <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label="A clock">
      {v.daynight > 0.5 && (
        <g transform="translate(700 70)">
          {day ? <circle r={34} fill="#ffd36b" /> : <path d="M10 -32 A34 34 0 1 0 10 32 A26 26 0 1 1 10 -32 Z" fill="#c9d0de" />}
        </g>
      )}
      <circle cx={cx} cy={cy} r={r} fill="#fbf6ec" stroke="#2b2a33" strokeWidth={8} />
      {v.shade > 0 && sector(v.shade)}
      {Array.from({ length: 60 }, (_, i) => {
        const a = ((i * 6 - 90) * Math.PI) / 180
        const long = i % 5 === 0
        return <line key={i} x1={cx + (r - 12) * Math.cos(a)} y1={cy + (r - 12) * Math.sin(a)} x2={cx + (r - (long ? 30 : 20)) * Math.cos(a)} y2={cy + (r - (long ? 30 : 20)) * Math.sin(a)} stroke="#2b2a33" strokeWidth={long ? 5 : 2} />
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1
        const a = ((n * 30 - 90) * Math.PI) / 180
        return (
          <text key={n} x={cx + (r - 62) * Math.cos(a)} y={cy + (r - 62) * Math.sin(a) + 14} textAnchor="middle" className="clock-num">
            {n}
          </text>
        )
      })}
      {v.minuteLabels > 0.5 &&
        Array.from({ length: 12 }, (_, i) => {
          const a = ((i * 30 - 90) * Math.PI) / 180
          return (
            <text key={i} x={cx + (r + 26) * Math.cos(a)} y={cy + (r + 26) * Math.sin(a) + 8} textAnchor="middle" className="clock-min">
              {i * 5}
            </text>
          )
        })}
      {hand(h * 30, r * 0.5, 14, '#2b2a33')}
      {hand(m * 6, r * 0.78, 8, '#e07a4f')}
      <circle cx={cx} cy={cy} r={14} fill="#2b2a33" />
      {ctrl.labels.activity && (
        <g transform="translate(400 520)">
          <rect x={-170} y={-30} width={340} height={52} rx={18} fill="#ffd166" />
          <text y={6} textAnchor="middle" className="diagram-label">{ctrl.labels.activity}</text>
        </g>
      )}
    </svg>
  )
}

export const clock: SceneDef = {
  kind: '2d',
  defaults: { minutes: 9 * 60, shade: 0, daynight: 0, minuteLabels: 0, choice: 0, total: 0 },
  Component: Clock,
  applyParams(ctrl, p) {
    if (typeof p.hour === 'number') ctrl.values.minutes = p.hour * 60 + (typeof p.minute === 'number' ? p.minute : 0)
    for (const k of ['daynight', 'minuteLabels'] as const) if (typeof p[k] === 'boolean') ctrl.values[k] = p[k] ? 1 : 0
    if (typeof p.activity === 'string') ctrl.labels.activity = p.activity
  },
  actions: {
    /** Move the hands to a time (hour 0–23, minute), turning forwards. */
    time: (ctrl, cue, { reduced }) => {
      const target = Number(cue.hour ?? 0) * 60 + Number(cue.minute ?? 0)
      let to = target
      while (to < ctrl.values.minutes) to += 24 * 60
      return gsap.to(ctrl.values, {
        minutes: to,
        duration: dur(cue, reduced, 1.6),
        ease: 'power2.inOut',
        onStart: () => {
          if (typeof cue.activity === 'string') ctrl.labels.activity = cue.activity
        },
      })
    },
    shade: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { shade: Number(cue.to ?? 0), duration: dur(cue, reduced, 1.2), ease: 'power2.inOut' }),
    labels: (ctrl, cue) => () => {
      if (cue.minutes !== undefined) ctrl.values.minuteLabels = cue.minutes ? 1 : 0
      if (cue.daynight !== undefined) ctrl.values.daynight = cue.daynight ? 1 : 0
      if (typeof cue.activity === 'string') ctrl.labels.activity = cue.activity
    },
  },
}
