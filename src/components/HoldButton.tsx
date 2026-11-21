import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Press and hold to confirm. The fill sweeps across while held and snaps back
 * quickly on release (Emil Kowalski's hold-to-confirm pattern).
 */
export function HoldButton({
  ms,
  onDone,
  label,
  className,
  children,
}: {
  ms: number
  onDone: () => void
  label: string
  className?: string
  children: ReactNode
}) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<number>(0)
  const start = () => {
    setHolding(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setHolding(false)
      onDone()
    }, ms)
  }
  const stop = () => {
    setHolding(false)
    window.clearTimeout(timer.current)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      className={cn('hold-btn', className)}
      data-holding={holding || undefined}
      style={{ ['--hold-ms' as string]: `${ms}ms` }}
      aria-label={label}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault()
          start()
        }
      }}
      onKeyUp={stop}
    >
      <span className="hold-fill" aria-hidden />
      <span className="hold-content">{children}</span>
    </button>
  )
}
