import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'

// Living things. view 0: a plant with tappable parts (roots, stem, leaves, flower).
// view 1: a seed test, three pots (water + light / no water / dark) growing by `grow`.
// view 2: a tree through the seasons (season 0 spring … 3 winter) with a day-length bar.

const PARTS = ['roots', 'stem', 'leaves', 'flower'] as const

function Plant({ hot, onPart }: { hot: string | null; onPart: (id: string) => void }) {
  const glow = (id: string) => (hot === id ? '#ffd166' : undefined)
  return (
    <g>
      <rect x={0} y={330} width={800} height={230} fill="#8a5f3a" />
      <rect x={0} y={318} width={800} height={16} fill="#5c9e4c" />
      <g onClick={() => onPart('roots')} className="tappable">
        <rect x={300} y={330} width={200} height={180} fill="transparent" />
        {[[-60, 120], [-20, 160], [30, 150], [70, 110], [0, 90]].map(([dx, dy], i) => (
          <path key={i} d={`M400 335 q${dx / 2} ${dy / 2} ${dx} ${dy}`} stroke={glow('roots') ?? '#f2e2c4'} strokeWidth={8} fill="none" strokeLinecap="round" />
        ))}
      </g>
      <g onClick={() => onPart('stem')} className="tappable">
        <rect x={390} y={150} width={20} height={185} rx={10} fill={glow('stem') ?? '#3f9b5a'} />
      </g>
      <g onClick={() => onPart('leaves')} className="tappable">
        <path d="M400 260 q-90 -40 -130 10 q60 30 130 -10 z" fill={glow('leaves') ?? '#58b368'} stroke="#2b2a33" strokeWidth={3} />
        <path d="M400 220 q90 -40 130 10 q-60 30 -130 -10 z" fill={glow('leaves') ?? '#58b368'} stroke="#2b2a33" strokeWidth={3} />
      </g>
      <g onClick={() => onPart('flower')} className="tappable">
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2
          return <ellipse key={i} cx={400 + Math.cos(a) * 38} cy={120 + Math.sin(a) * 38} rx={30} ry={20} transform={`rotate(${(a * 180) / Math.PI} ${400 + Math.cos(a) * 38} ${120 + Math.sin(a) * 38})`} fill={glow('flower') ?? '#ff6b5c'} stroke="#2b2a33" strokeWidth={3} />
        })}
        <circle cx={400} cy={120} r={24} fill="#ffd166" stroke="#2b2a33" strokeWidth={3} />
      </g>
      {[['flower', 560, 110], ['leaves', 600, 230], ['stem', 470, 300], ['roots', 560, 450]].map(([id, x, y]) => (
        <text key={id as string} x={x as number} y={y as number} className="diagram-label" opacity={hot === null || hot === id ? 1 : 0.35}>
          {id as string}
        </text>
      ))}
    </g>
  )
}

function Pots({ grow }: { grow: number }) {
  const pots = [
    { x: 160, label: 'water + light', h: 1, dark: false },
    { x: 400, label: 'no water', h: 0.12, dark: false },
    { x: 640, label: 'dark', h: 0.45, pale: true, dark: true },
  ]
  return (
    <g>
      {pots.map((p, i) => {
        const h = 230 * p.h * grow
        return (
          <g key={i}>
            {p.dark && <rect x={p.x - 110} y={60} width={220} height={430} rx={18} fill="#2b2a33" opacity={0.85} />}
            <path d={`M${p.x - 70} 380 h140 l-18 100 h-104 z`} fill="#c4553e" stroke="#2b2a33" strokeWidth={4} />
            <rect x={p.x - 78} y={370} width={156} height={18} rx={6} fill="#8a5f3a" />
            {h > 4 && (
              <g>
                <rect x={p.x - 5} y={370 - h} width={10} height={h} rx={5} fill={p.pale ? '#d7e6a0' : '#3f9b5a'} />
                {h > 60 && <path d={`M${p.x} ${370 - h * 0.6} q-50 -20 -60 10 q30 14 60 -10z`} fill={p.pale ? '#d7e6a0' : '#58b368'} />}
                {h > 120 && <path d={`M${p.x} ${370 - h * 0.85} q50 -20 60 10 q-30 14 -60 -10z`} fill={p.pale ? '#d7e6a0' : '#58b368'} />}
              </g>
            )}
            <text x={p.x} y={530} textAnchor="middle" className="board-label" fill={p.dark ? '#fff' : undefined}>{p.label}</text>
          </g>
        )
      })}
    </g>
  )
}

const SEASONS = [
  { name: 'Spring', sky: '#cfe9f6', leaf: '#8fd17a', blossom: true, day: 12 },
  { name: 'Summer', sky: '#a9d6ec', leaf: '#3f9b5a', blossom: false, day: 16 },
  { name: 'Autumn', sky: '#e6d6b8', leaf: '#e8892f', blossom: false, day: 12 },
  { name: 'Winter', sky: '#dfe4ee', leaf: '', blossom: false, day: 8 },
]

function Seasons({ season }: { season: number }) {
  const s = SEASONS[Math.max(0, Math.min(3, Math.round(season)))]
  return (
    <g>
      <rect x={0} y={0} width={800} height={430} fill={s.sky} />
      <rect x={0} y={430} width={800} height={130} fill={s.name === 'Winter' ? '#f4f6fa' : '#9fcf86'} />
      <rect x={380} y={230} width={40} height={210} fill="#8a5f3a" />
      {s.leaf && <circle cx={400} cy={200} r={130} fill={s.leaf} stroke="#2b2a33" strokeWidth={4} />}
      {!s.leaf && [[-60, -40], [50, -60], [0, -100], [-90, 10], [90, 0]].map(([dx, dy], i) => <line key={i} x1={400} y1={240} x2={400 + dx} y2={240 + dy} stroke="#8a5f3a" strokeWidth={12} strokeLinecap="round" />)}
      {s.blossom && Array.from({ length: 14 }, (_, i) => <circle key={i} cx={400 + Math.cos(i * 2.4) * 95} cy={200 + Math.sin(i * 2.4) * 85} r={9} fill="#f7c6d9" />)}
      {s.name === 'Autumn' && [[300, 460], [480, 470], [540, 450]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={14} ry={8} fill="#e8892f" />)}
      {s.name === 'Winter' && Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 97) % 800} cy={(i * 53) % 420} r={5} fill="#fff" />)}
      <circle cx={680} cy={90} r={46} fill="#ffd36b" />
      <text x={400} y={500} textAnchor="middle" className="diagram-num big">{s.name}</text>
      <g transform="translate(60 50)">
        <rect width={240} height={30} rx={15} fill="#2b2a33" />
        <rect width={(s.day / 24) * 240} height={30} rx={15} fill="#ffd166" />
        <text x={120} y={62} textAnchor="middle" className="board-label">{s.day} hours of daylight</text>
      </g>
    </g>
  )
}

function Nature({ ctrl, activePart }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const view = Math.round(v.view)
  return (
    <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label="Nature">
      {view === 0 && <Plant hot={activePart ?? (ctrl.labels.hot || null)} onPart={(id) => ctrl.onPart?.(id)} />}
      {view === 1 && <Pots grow={v.grow} />}
      {view === 2 && <Seasons season={v.season} />}
    </svg>
  )
}

export const nature: SceneDef = {
  kind: '2d',
  defaults: { view: 0, grow: 0, season: 0 },
  Component: Nature,
  applyParams(ctrl, p) {
    if (typeof p.view === 'string') ctrl.values.view = ['plant', 'pots', 'seasons'].indexOf(p.view)
    if (typeof p.season === 'number') ctrl.values.season = p.season
  },
  actions: {
    view: (ctrl, cue) => () => void (ctrl.values.view = ['plant', 'pots', 'seasons'].indexOf(String(cue.to))),
    hot: (ctrl, cue) => () => void (ctrl.labels.hot = PARTS.includes(String(cue.part) as (typeof PARTS)[number]) ? String(cue.part) : ''),
    grow: (ctrl, cue, { reduced }) => gsap.fromTo(ctrl.values, { grow: 0 }, { grow: 1, duration: dur(cue, reduced, 4), ease: 'power1.out' }),
    season: (ctrl, cue) => () => void (ctrl.values.season = Number(cue.to ?? 0)),
  },
}
