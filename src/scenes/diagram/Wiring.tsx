import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'

// Series and parallel, drawn as a diagram: 6 faces (rows), 9 cells per row.
const FRAMES = ['#3f9b5a', '#d2483c', '#3b6fd1', '#e8892f', '#c9c2b0', '#f1c933']
const ROW_Y = (r: number) => 70 + r * 62
const CELL_X = (c: number) => 150 + c * 48
const LEFT = 104
const RIGHT = 610

function Wiring({ ctrl, activePart, reduced }: SceneProps) {
  useTicker(!reduced)
  const v = ctrl.values
  const t = reduced ? 0 : performance.now() / 1000
  const dash = -(t * 60) % 24
  const tap = (id: string, face?: number) => () => {
    if (face !== undefined) {
      gsap.killTweensOf(v, 'litFace,litAmt')
      v.litFace = face
      gsap.fromTo(v, { litAmt: 0 }, { litAmt: 1, duration: reduced ? 0.001 : 0.9, ease: 'power2.out' })
    }
    ctrl.onPart?.(id)
  }
  const railsHot = v.rails > 0.01 || activePart === 'rails'
  const railGlow = Math.max(v.rails, activePart === 'rails' ? 1 : 0)
  return (
    <svg viewBox="0 0 800 470" className="diagram" role="img" aria-label="Six chains of nine solar cells, joined side by side">
      <defs>
        <linearGradient id="cell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a5aa8" />
          <stop offset="1" stopColor="#16244a" />
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {/* rails: parallel */}
      <g onClick={tap('rails')} className="tappable">
        <rect x={LEFT - 20} y={40} width={40} height={ROW_Y(5) - 10} fill="transparent" />
        <rect x={RIGHT - 20} y={40} width={40} height={ROW_Y(5) - 10} fill="transparent" />
        {railsHot && (
          <g opacity={railGlow} filter="url(#soft)">
            <line x1={LEFT} y1={ROW_Y(0)} x2={LEFT} y2={ROW_Y(5)} stroke="#ffd166" strokeWidth={14} />
            <line x1={RIGHT} y1={ROW_Y(0)} x2={RIGHT} y2={ROW_Y(5)} stroke="#ffd166" strokeWidth={14} />
          </g>
        )}
        <line x1={LEFT} y1={ROW_Y(0)} x2={LEFT} y2={ROW_Y(5) + 0} stroke="#2b2a33" strokeWidth={6} strokeLinecap="round" />
        <line x1={RIGHT} y1={ROW_Y(0)} x2={RIGHT} y2={ROW_Y(5)} stroke="#2b2a33" strokeWidth={6} strokeLinecap="round" />
      </g>
      {/* to the battery */}
      <g onClick={tap('out')} className="tappable">
        <path d={`M${RIGHT} ${ROW_Y(2.5)} H700`} stroke="#2b2a33" strokeWidth={6} />
        {v.flow > 0 && (
          <path d={`M${RIGHT} ${ROW_Y(2.5)} H700`} stroke="#ffd166" strokeWidth={4} strokeDasharray="8 16" strokeDashoffset={dash} />
        )}
        <rect x={700} y={ROW_Y(2.5) - 48} width={56} height={96} rx={12} fill={activePart === 'out' ? '#ffe7a3' : '#f6efe1'} stroke="#2b2a33" strokeWidth={5} />
        <rect x={716} y={ROW_Y(2.5) - 58} width={24} height={12} rx={3} fill="#2b2a33" />
        <rect x={710} y={ROW_Y(2.5) + 4} width={36} height={34} rx={5} fill="#58b368" />
      </g>
      {Array.from({ length: 6 }, (_, r) => {
        const y = ROW_Y(r)
        const lit = v.litFace === r ? v.litAmt : 0
        return (
          <g key={r} onClick={tap('chain', r)} className="tappable">
            <rect x={LEFT} y={y - 26} width={RIGHT - LEFT} height={52} fill="transparent" />
            <line x1={LEFT} y1={y} x2={RIGHT} y2={y} stroke="#2b2a33" strokeWidth={4} />
            {v.flow > 0 && (
              <line x1={LEFT} y1={y} x2={RIGHT} y2={y} stroke={lit > 0 ? '#ffd166' : '#8e8a7d'} strokeWidth={3} strokeDasharray="6 18" strokeDashoffset={dash} />
            )}
            <rect x={LEFT + 14} y={y - 9} width={18} height={18} rx={4} fill={FRAMES[r]} />
            {Array.from({ length: 9 }, (_, c) => {
              const on = lit > c / 9
              return (
                <g key={c} transform={`translate(${CELL_X(c)} ${y})`}>
                  {on && <rect x={-22} y={-22} width={44} height={44} rx={8} fill="#ffd166" filter="url(#soft)" opacity={0.85} />}
                  <rect x={-17} y={-17} width={34} height={34} rx={5} fill="url(#cell)" stroke={on ? '#ffd166' : '#0f1830'} strokeWidth={on ? 4 : 2} />
                  <line x1={-17} y1={0} x2={17} y2={0} stroke="#c9d3e6" strokeOpacity={0.5} strokeWidth={1} />
                </g>
              )
            })}
          </g>
        )
      })}
      <text x={CELL_X(4)} y={30} textAnchor="middle" className="diagram-label">9 panels on one face</text>
      <text x={LEFT - 46} y={ROW_Y(2.5)} textAnchor="middle" className="diagram-label" transform={`rotate(-90 ${LEFT - 46} ${ROW_Y(2.5)})`}>6 faces</text>
      <text x={728} y={ROW_Y(2.5) + 84} textAnchor="middle" className="diagram-label">battery</text>
    </svg>
  )
}

function WiringOverlay({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  return (
    <div className="scene-names" aria-hidden>
      <span className="scene-name" data-on={v.litAmt > 0.5 || undefined}>series</span>
      <span className="scene-name" data-on={v.rails > 0.5 || undefined}>parallel</span>
    </div>
  )
}

export const wiring: SceneDef = {
  kind: '2d',
  defaults: { flow: 0, litFace: -1, litAmt: 0, rails: 0 },
  Component: Wiring,
  Overlay: WiringOverlay,
  actions: {
    flow: (ctrl, cue) => () => void (ctrl.values.flow = cue.on === false ? 0 : 1),
    lightFace: (ctrl, cue, { reduced }) =>
      gsap.fromTo(
        ctrl.values,
        { litAmt: 0 },
        { litAmt: 1, duration: dur(cue, reduced, 2), ease: 'power1.inOut', immediateRender: false, onStart: () => void (ctrl.values.litFace = Number(cue.face ?? 0)) },
      ),
    lightRails: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { rails: 1, duration: dur(cue, reduced, 1.5), ease: 'power2.out' }),
  },
}
