import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// A slow fog behind the section screens (Vanta). Falls back to the CSS ground
// if WebGL is unavailable or motion is reduced.
export default function VantaFog({ hi, mid, lo, still }: { hi: number; mid: number; lo: number; still: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (still || !el.current) return
    let effect: { destroy: () => void; renderer?: { forceContextLoss?: () => void } } | null = null
    let cancelled = false
    import('vanta/dist/vanta.fog.min')
      .then((m) => {
        if (cancelled || !el.current) return
        const FOG = (m as { default: (o: object) => { destroy: () => void; renderer?: { forceContextLoss?: () => void } } }).default
        effect = FOG({
          el: el.current,
          THREE,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          highlightColor: hi,
          midtoneColor: mid,
          lowlightColor: lo,
          baseColor: 0xf3ead8,
          blurFactor: 0.62,
          speed: 0.7,
          zoom: 0.8,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      effect?.destroy()
      try {
        effect?.renderer?.forceContextLoss?.()
      } catch {
        /* ignore */
      }
    }
  }, [hi, mid, lo, still])
  return <div ref={el} className="section-backdrop" aria-hidden />
}
