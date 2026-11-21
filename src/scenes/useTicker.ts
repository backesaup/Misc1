import { useEffect, useReducer } from 'react'

/** Re-render every animation frame while mounted (for SVG/HTML that reads tweened values). */
export function useTicker(active = true) {
  const [, tick] = useReducer((n: number) => (n + 1) % 1e9, 0)
  useEffect(() => {
    if (!active) return
    let id = 0
    const loop = () => {
      tick()
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active])
}
