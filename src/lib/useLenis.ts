import { useEffect } from 'react'
import Lenis from 'lenis'

/** Smooth, weighted scrolling on section grids. Off when motion is reduced. */
export function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const lenis = new Lenis({ autoRaf: true, lerp: 0.12, smoothWheel: true })
    return () => lenis.destroy()
  }, [enabled])
}
