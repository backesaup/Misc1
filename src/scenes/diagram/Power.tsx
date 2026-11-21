import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'

// Cells → charge controller → battery → booster → USB → phone.
const STATIONS = [
  { x: 90, label: 'Sun' },
  { x: 250, label: 'Battery' },
  { x: 440, label: 'Booster' },
  { x: 640, label: 'Phone' },
]

function Power({ ctrl, reduced }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const t = reduced ? 0 : performance.now() / 1000
  const dash = -(t * 70) % 26
  const active = (i: number) => v.stage >= i
  const y = 220
  return (
    <svg viewBox="0 0 760 400" className="diagram" role="img" aria-label="Solar cells charge a battery, a booster makes 5 volts for the phone">
      <defs>
        <filter id="glow2" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      {STATIONS.slice(0, -1).map((s, i) => {
        const x2 = STATIONS[i + 1].x
        return (
          <g key={i}>
            <line x1={s.x + 50} y1={y} x2={x2 - 56} y2={y} stroke="#2b2a33" strokeWidth={6} strokeLinecap="round" />
            {active(i + 1) && (
              <line x1={s.x + 50} y1={y} x2={x2 - 56} y2={y} stroke="#ffd166" strokeWidth={4} strokeDasharray="8 18" strokeDashoffset={dash} />
            )}
          </g>
        )
      })}
      {/* sun + panel */}
      <g transform={`translate(${STATIONS[0].x} ${y})`}>
        <circle r={40} fill="#ffd36b" />
        <circle r={56} fill="#ffd36b" opacity={0.3} filter="url(#glow2)" />
      </g>
      {/* battery with fill gauge */}
      <g transform={`translate(${STATIONS[1].x} ${y})`} opacity={active(1) ? 1 : 0.35}>
        <rect x={-44} y={-70} width={88} height={140} rx={14} fill="#f6efe1" stroke="#2b2a33" strokeWidth={6} />
        <rect x={-16} y={-84} width={32} height={14} rx={4} fill="#2b2a33" />
        <clipPath id="batt">
          <rect x={-34} y={-60} width={68} height={120} rx={8} />
        </clipPath>
        <g clipPath="url(#batt)">
          <rect x={-34} y={60 - 120 * v.charge} width={68} height={120} fill="#58b368" />
        </g>
        <text y={110} textAnchor="middle" className="diagram-num">{Math.round(v.charge * 100)}%</text>
      </g>
      {/* booster: up arrow + 5 V */}
      <g transform={`translate(${STATIONS[2].x} ${y})`} opacity={active(2) ? 1 : 0.35}>
        {active(2) && <rect x={-62} y={-62} width={124} height={124} rx={26} fill="#ffd166" opacity={0.45} filter="url(#glow2)" />}
        <rect x={-54} y={-54} width={108} height={108} rx={22} fill="#2b2a33" />
        <path d="M0 -30 L22 -4 H8 V28 H-8 V-4 H-22 Z" fill="#ffd166" />
        <text y={92} textAnchor="middle" className="diagram-num">5 V</text>
      </g>
      {/* phone with USB */}
      <g transform={`translate(${STATIONS[3].x} ${y})`} opacity={active(3) ? 1 : 0.35}>
        <rect x={-40} y={-78} width={80} height={156} rx={16} fill="#2b2a33" />
        <rect x={-32} y={-66} width={64} height={124} rx={8} fill={active(3) ? '#bfe3c7' : '#4a4954'} />
        {active(3) && <path d="M4 -30 L-14 4 H0 L-6 32 L16 -6 H2 Z" fill="#2b2a33" />}
        <rect x={-10} y={66} width={20} height={6} rx={3} fill="#c9c2b0" />
      </g>
      {STATIONS.map((st, i) => (
        <text key={st.label} x={st.x} y={y - 104} textAnchor="middle" className="diagram-label" opacity={i === 0 || active(i) ? 1 : 0.4}>
          {st.label}
        </text>
      ))}
    </svg>
  )
}

export const power: SceneDef = {
  kind: '2d',
  defaults: { stage: 0, charge: 0 },
  Component: Power,
  actions: {
    stage: (ctrl, cue) => () => void (ctrl.values.stage = Number(cue.to ?? 0)),
    charge: (ctrl, cue, { reduced }) =>
      gsap.to(ctrl.values, { charge: Number(cue.to ?? 1), duration: dur(cue, reduced, 4), ease: 'power1.inOut' }),
  },
}
