import { useEffect, useRef } from 'react'
import { SkinViewer, WaveAnimation, IdleAnimation } from 'skinview3d'
import { skinCanvas } from '@/scenes/voxel/skins'

// The lesson guide: a third-person Minecraft character rendered with skinview3d, wearing the
// Kai skin (fetched at build; an original builder look drawn in code until then). See skins.ts.
export function Guide({ wave = false, still = false, className }: { wave?: boolean; still?: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let viewer: SkinViewer | null = null
    try {
      viewer = new SkinViewer({ canvas: el, width: el.clientWidth || 180, height: el.clientHeight || 240, skin: skinCanvas('kai').canvas, pixelRatio: 'match-device' })
      if (!viewer.renderer.getContext()) throw new Error('no WebGL')
    } catch {
      el.style.display = 'none' // no WebGL right now: the guide simply isn't shown
      return
    }
    void skinCanvas('kai').ready.then(() => {
      try {
        viewer?.loadSkin(skinCanvas('kai').canvas)
      } catch {
        /* viewer already gone */
      }
    })
    viewer.zoom = 0.82
    viewer.fov = 40
    viewer.controls.enableRotate = false
    viewer.controls.enableZoom = false
    viewer.controls.enablePan = false
    viewer.playerObject.rotation.y = -0.45
    viewer.animation = wave ? new WaveAnimation() : new IdleAnimation()
    if (viewer.animation) viewer.animation.paused = still
    const ro = new ResizeObserver(() => viewer?.setSize(el.clientWidth, el.clientHeight))
    ro.observe(el)
    return () => {
      ro.disconnect()
      // skinview3d's dispose() trips over a renamed three.js API; free the GPU parts directly.
      try {
        viewer?.dispose()
      } catch {
        /* see below */
      }
      try {
        viewer?.renderer.dispose()
        viewer?.renderer.forceContextLoss() // free the WebGL context now, not at garbage collection
      } catch {
        /* already gone */
      }
    }
  }, [wave, still])
  return <canvas ref={canvas} className={className ?? 'guide'} aria-hidden />
}
