import { readJSON } from '@/lib/storage'

/** The robot's face, shown on lesson scenes while the robot is talking. Same look as the 3D robot. */
export function RobotAvatar({ talking }: { talking: boolean }) {
  const g = readJSON<{ robotName?: string; robotColor?: string }>('game', {})
  const body = g.robotColor ?? '#5fa3d9'
  return (
    <div className="robot-avatar" data-talking={talking || undefined} aria-hidden>
      <svg viewBox="0 0 120 140">
        <line x1="60" y1="8" x2="60" y2="26" stroke="#9aa3ad" strokeWidth="4" />
        <circle cx="60" cy="8" r="7" fill="#e07a4f" className="robot-antenna" />
        <rect x="18" y="24" width="84" height="66" rx="12" fill="#e9eef4" stroke="#2b2a33" strokeWidth="3" />
        <rect x="38" y="44" width="12" height="16" rx="2" fill="#2b2a33" className="robot-eye" />
        <rect x="70" y="44" width="12" height="16" rx="2" fill="#2b2a33" className="robot-eye" />
        <rect x="46" y="70" width="28" height="8" rx="4" fill="#2b2a33" className="robot-mouth" />
        <rect x="26" y="94" width="68" height="44" rx="10" fill={body} stroke="#2b2a33" strokeWidth="3" />
        <rect x="48" y="106" width="24" height="16" rx="3" fill="#ffd166" />
      </svg>
      {g.robotName && <span className="robot-name">{g.robotName}</span>}
    </div>
  )
}
