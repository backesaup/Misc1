import gsap from 'gsap'
import type { SceneDef, SceneProps } from '../types'
import { dur } from '../types'
import { useTicker } from '../useTicker'

// The workshop. view 0 circuit (battery, bulb, gap with a test material), 1 magnets,
// 2 shadows (lamp distance → shadow size), 3 lever (seesaw), 4 gears, 5 ice → water → steam.

export const MATERIALS = ['nothing', 'metal spoon', 'coin', 'wood', 'plastic', 'wool', 'foil'] as const
const CONDUCTS: Record<string, boolean> = { nothing: false, 'metal spoon': true, coin: true, wood: false, plastic: false, wool: false, foil: true }
const MAGNETIC: Record<string, boolean> = { 'paper clip': true, 'metal spoon': true, wood: false, plastic: false, foil: false, coin: false }
const MAG_ITEMS = ['paper clip', 'metal spoon', 'wood', 'plastic', 'foil'] as const

function Circuit({ closed, material, t }: { closed: boolean; material: string; t: number }) {
  const on = closed && CONDUCTS[material]
  const dash = -(t * 80) % 24
  const wire = 'M200 380 V160 H600 V380'
  return (
    <g>
      <path d={wire} stroke="#2b2a33" strokeWidth={8} fill="none" />
      {on && <path d={wire} stroke="#ffd166" strokeWidth={5} fill="none" strokeDasharray="10 14" strokeDashoffset={dash} />}
      {/* battery */}
      <g transform="translate(200 420)">
        <rect x={-50} y={-40} width={100} height={110} rx={12} fill="#3f9b5a" stroke="#2b2a33" strokeWidth={5} />
        <rect x={-18} y={-56} width={36} height={18} rx={4} fill="#2b2a33" />
        <text y={30} textAnchor="middle" className="diagram-num small" fill="#fff">+  −</text>
      </g>
      {/* bulb */}
      <g transform="translate(400 160)">
        {on && <circle r={90} fill="#ffd166" opacity={0.45} />}
        <circle r={48} fill={on ? '#fff3b0' : '#eef1f5'} stroke="#2b2a33" strokeWidth={5} />
        <path d="M-14 6 q14 -24 28 0" stroke={on ? '#e8892f' : '#8e95a3'} strokeWidth={4} fill="none" />
        <rect x={-22} y={44} width={44} height={26} rx={4} fill="#8e95a3" stroke="#2b2a33" strokeWidth={3} />
      </g>
      {/* the gap and the test material */}
      <g transform="translate(600 420)">
        <rect x={-70} y={-40} width={140} height={90} rx={10} fill="#fbf6ec" stroke="#2b2a33" strokeWidth={4} strokeDasharray={closed ? '0' : '10 8'} />
        {material !== 'nothing' && (
          <>
            <rect x={-56} y={-10} width={112} height={26} rx={12} fill={CONDUCTS[material] ? '#c0c6d0' : material === 'wood' ? '#c9945c' : material === 'wool' ? '#e8789a' : '#7cc6fe'} stroke="#2b2a33" strokeWidth={3} />
            <text y={78} textAnchor="middle" className="board-label">{material}</text>
          </>
        )}
      </g>
      <text x={400} y={330} textAnchor="middle" className="diagram-label">{on ? 'Complete loop: light!' : closed ? 'Electricity can’t get through' : 'A gap in the loop'}</text>
    </g>
  )
}

function Magnets({ pull, poles, t }: { pull: number; poles: number; t: number }) {
  if (poles > 0.5) {
    // two magnets: same poles push apart, opposite poles pull together
    const same = poles > 1.5
    const gap = same ? 160 + Math.sin(t * 3) * 6 : 40
    return (
      <g>
        <g transform={`translate(${400 - gap / 2 - 160} 260)`}>
          <rect width={80} height={70} fill="#e0443a" /><rect x={80} width={80} height={70} fill="#4f8ff0" />
          <text x={40} y={46} textAnchor="middle" className="diagram-num small" fill="#fff">N</text><text x={120} y={46} textAnchor="middle" className="diagram-num small" fill="#fff">S</text>
        </g>
        <g transform={`translate(${400 + gap / 2} 260)`}>
          <rect width={80} height={70} fill={same ? '#4f8ff0' : '#e0443a'} /><rect x={80} width={80} height={70} fill={same ? '#e0443a' : '#4f8ff0'} />
          <text x={40} y={46} textAnchor="middle" className="diagram-num small" fill="#fff">{same ? 'S' : 'N'}</text><text x={120} y={46} textAnchor="middle" className="diagram-num small" fill="#fff">{same ? 'N' : 'S'}</text>
        </g>
        <text x={400} y={420} textAnchor="middle" className="diagram-label">{same ? 'Same poles push apart' : 'Opposite poles pull together'}</text>
      </g>
    )
  }
  return (
    <g>
      <path d="M330 120 v120 a70 70 0 0 0 140 0 v-120 h-40 v120 a30 30 0 0 1 -60 0 v-120 z" fill="#e0443a" stroke="#2b2a33" strokeWidth={5} />
      <rect x={330} y={110} width={40} height={30} fill="#c0c6d0" /><rect x={430} y={110} width={40} height={30} fill="#c0c6d0" />
      {MAG_ITEMS.map((m, i) => {
        const sticks = MAGNETIC[m]
        const x0 = 110 + i * 145
        const x = sticks ? x0 + (400 - x0) * pull * 0.85 : x0
        const y = sticks ? 470 - (470 - 330) * pull : 470
        return (
          <g key={m} transform={`translate(${x} ${y})`}>
            <rect x={-44} y={-16} width={88} height={32} rx={14} fill={m === 'wood' ? '#c9945c' : m === 'plastic' ? '#7cc6fe' : '#c0c6d0'} stroke="#2b2a33" strokeWidth={3} />
            <text y={44} textAnchor="middle" className="board-label">{m}</text>
          </g>
        )
      })}
    </g>
  )
}

function Shadow({ dist }: { dist: number }) {
  // lamp at x, robot at 420, wall at 720. Closer lamp → bigger shadow.
  const lampX = 380 - dist * 260
  const scale = (720 - lampX) / (420 - lampX)
  const h = 110 * scale
  return (
    <g>
      <rect x={720} y={60} width={40} height={440} fill="#e9dcc3" stroke="#2b2a33" strokeWidth={3} />
      <rect x={720 - 14} y={340 - h * 0.6} width={14} height={h} rx={6} fill="#2b2a33" opacity={0.75} />
      <polygon points={`${lampX},300 720,${340 - h * 0.6} 720,${340 + h * 0.4}`} fill="#ffd166" opacity={0.18} />
      <g transform={`translate(${lampX} 300)`}>
        <circle r={22} fill="#ffd166" stroke="#2b2a33" strokeWidth={3} />
        <rect x={-6} y={22} width={12} height={180} fill="#5b5866" />
      </g>
      <g transform="translate(420 285)">
        <rect x={-24} y={-40} width={48} height={40} rx={8} fill="#e9eef4" stroke="#2b2a33" strokeWidth={3} />
        <rect x={-22} y={0} width={44} height={50} rx={8} fill="#5fa3d9" stroke="#2b2a33" strokeWidth={3} />
      </g>
      <text x={400} y={530} textAnchor="middle" className="diagram-label">{dist > 0.6 ? 'Lamp far away: small shadow' : dist < 0.3 ? 'Lamp close: big shadow' : 'Move the lamp'}</text>
    </g>
  )
}

function Lever({ pivot, lift }: { pivot: number; lift: number }) {
  // plank from 100 to 700; pivot position 0..1; pumpkin on left end, robot pushes the right end down
  const px = 100 + pivot * 600
  const ang = lift * -14
  return (
    <g>
      <rect x={0} y={420} width={800} height={140} fill="#9fcf86" />
      <polygon points={`${px},340 ${px - 40},420 ${px + 40},420`} fill="#8a5f3a" stroke="#2b2a33" strokeWidth={4} />
      <g transform={`rotate(${ang} ${px} 340)`}>
        <rect x={100} y={326} width={600} height={24} rx={8} fill="#c9945c" stroke="#2b2a33" strokeWidth={4} />
        <ellipse cx={150} cy={290} rx={52} ry={40} fill="#e8892f" stroke="#2b2a33" strokeWidth={4} />
        <g transform="translate(660 284)">
          <rect x={-22} y={-34} width={44} height={36} rx={8} fill="#e9eef4" stroke="#2b2a33" strokeWidth={3} />
          <rect x={-20} y={2} width={40} height={40} rx={8} fill="#5fa3d9" stroke="#2b2a33" strokeWidth={3} />
        </g>
      </g>
      <text x={400} y={500} textAnchor="middle" className="diagram-label">{pivot < 0.35 ? 'Pivot close to the pumpkin: easy to lift' : pivot > 0.65 ? 'Pivot far from the pumpkin: hard to lift' : 'Pivot in the middle'}</text>
    </g>
  )
}

function Gears({ t, big }: { t: number; big: number }) {
  const gear = (cx: number, cy: number, r: number, teeth: number, ang: number, color: string) => (
    <g transform={`translate(${cx} ${cy}) rotate(${ang})`}>
      {Array.from({ length: teeth }, (_, i) => (
        <rect key={i} x={-9} y={-r - 16} width={18} height={24} rx={3} fill={color} stroke="#2b2a33" strokeWidth={2} transform={`rotate(${(i / teeth) * 360})`} />
      ))}
      <circle r={r} fill={color} stroke="#2b2a33" strokeWidth={4} />
      <circle r={10} fill="#2b2a33" />
      <line x1={0} y1={0} x2={0} y2={-r + 14} stroke="#2b2a33" strokeWidth={6} />
    </g>
  )
  const smallTeeth = 8, bigTeeth = Math.round(big)
  const a1 = t * 60
  const a2 = -a1 * (smallTeeth / bigTeeth)
  return (
    <g>
      {gear(250, 280, 70, smallTeeth, a1, '#ffd166')}
      {gear(250 + 70 + 16 + bigTeeth * 8.5, 280, bigTeeth * 8.5, bigTeeth, a2, '#4f8ff0')}
      <text x={250} y={420} textAnchor="middle" className="board-label">{smallTeeth} teeth: fast</text>
      <text x={250 + 86 + bigTeeth * 8.5} y={420 + bigTeeth * 3} textAnchor="middle" className="board-label">{bigTeeth} teeth: {bigTeeth > smallTeeth ? 'slower' : 'same speed'}</text>
    </g>
  )
}

function States({ heat }: { heat: number }) {
  // heat 0 ice, 1 water, 2 steam
  const ice = Math.max(0, 1 - heat)
  const water = heat <= 1 ? heat : Math.max(0, 2 - heat)
  const steam = Math.max(0, heat - 1)
  return (
    <g>
      <rect x={250} y={380} width={300} height={30} rx={8} fill="#5b5866" />
      {heat > 0.05 && <path d="M330 420 q20 40 0 70 M400 420 q20 40 0 70 M470 420 q20 40 0 70" stroke="#e07a4f" strokeWidth={10} fill="none" strokeLinecap="round" opacity={Math.min(1, heat)} />}
      <path d="M270 380 v-150 h260 v150 z" fill="#eef6fb" stroke="#2b2a33" strokeWidth={5} />
      {water > 0 && <rect x={275} y={380 - 100 * water} width={250} height={100 * water} fill="#7cc6fe" />}
      {ice > 0 && <rect x={340 + (1 - ice) * 30} y={380 - 110 * ice} width={120 * ice} height={110 * ice} rx={8} fill="#d6f0ff" stroke="#7cc6fe" strokeWidth={4} />}
      {steam > 0 && Array.from({ length: 6 }, (_, i) => <circle key={i} cx={300 + i * 40} cy={200 - steam * 80 - (i % 2) * 30} r={20 + steam * 10} fill="#fff" stroke="#dfe4ee" strokeWidth={3} opacity={steam} />)}
      <text x={400} y={110} textAnchor="middle" className="diagram-num big">{heat < 0.5 ? 'Solid: ice' : heat < 1.5 ? 'Liquid: water' : 'Gas: steam'}</text>
    </g>
  )
}

function Lab({ ctrl }: SceneProps) {
  useTicker()
  const v = ctrl.values
  const t = performance.now() / 1000
  const view = Math.round(v.view)
  return (
    <svg viewBox="0 0 800 560" className="diagram" role="img" aria-label="The workshop">
      {view === 0 && <Circuit closed={v.closed > 0.5} material={MATERIALS[Math.round(v.material)] ?? 'nothing'} t={t} />}
      {view === 1 && <Magnets pull={v.pull} poles={v.poles} t={t} />}
      {view === 2 && <Shadow dist={v.dist} />}
      {view === 3 && <Lever pivot={v.pivot} lift={v.lift} />}
      {view === 4 && <Gears t={v.turning > 0.5 ? t : 0} big={v.bigTeeth} />}
      {view === 5 && <States heat={v.heat} />}
    </svg>
  )
}

const VIEWS = ['circuit', 'magnets', 'shadow', 'lever', 'gears', 'states']

export const lab: SceneDef = {
  kind: '2d',
  defaults: { view: 0, closed: 0, material: 0, pull: 0, poles: 0, dist: 0.5, pivot: 0.5, lift: 0, turning: 0, bigTeeth: 16, heat: 0, choice: 0, total: 0 },
  Component: Lab,
  applyParams(ctrl, p) {
    if (typeof p.view === 'string') ctrl.values.view = VIEWS.indexOf(p.view)
    for (const k of ['dist', 'pivot', 'bigTeeth', 'heat'] as const) if (typeof p[k] === 'number') ctrl.values[k] = p[k] as number
    if (typeof p.material === 'string') ctrl.values.material = Math.max(0, MATERIALS.indexOf(p.material as (typeof MATERIALS)[number]))
    if (typeof p.closed === 'boolean') ctrl.values.closed = p.closed ? 1 : 0
  },
  actions: {
    view: (ctrl, cue) => () => void (ctrl.values.view = VIEWS.indexOf(String(cue.to))),
    circuit: (ctrl, cue) => () => {
      if (cue.closed !== undefined) ctrl.values.closed = cue.closed ? 1 : 0
      if (typeof cue.material === 'string') ctrl.values.material = Math.max(0, MATERIALS.indexOf(cue.material as (typeof MATERIALS)[number]))
    },
    attract: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { pull: cue.on === false ? 0 : 1, duration: dur(cue, reduced, 1.4), ease: 'power2.in' }),
    poles: (ctrl, cue) => () => void (ctrl.values.poles = cue.same ? 2 : cue.on === false ? 0 : 1),
    lamp: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { dist: Number(cue.to ?? 0.5), duration: dur(cue, reduced, 1.6), ease: 'power2.inOut' }),
    pivot: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { pivot: Number(cue.to ?? 0.5), duration: dur(cue, reduced, 1.2), ease: 'power2.inOut' }),
    lift: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { lift: Number(cue.to ?? 1), duration: dur(cue, reduced, 1.2), ease: 'power2.inOut' }),
    gears: (ctrl, cue) => () => {
      if (cue.on !== undefined) ctrl.values.turning = cue.on ? 1 : 0
      if (typeof cue.big === 'number') ctrl.values.bigTeeth = cue.big
    },
    heat: (ctrl, cue, { reduced }) => gsap.to(ctrl.values, { heat: Number(cue.to ?? 1), duration: dur(cue, reduced, 3), ease: 'power1.inOut' }),
  },
}
