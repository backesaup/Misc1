import { useEffect, useRef } from 'react'
import { SkinViewer, WaveAnimation, IdleAnimation } from 'skinview3d'

// The lesson guide: a blocky third-person character rendered with skinview3d.
// The skin is original, drawn here in code: a builder in a yellow hard hat.
// To use another 64×64 skin, replace drawSkin() with an image (viewer.loadSkin(url)).

function drawSkin(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const box = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col
    g.fillRect(x, y, w, h)
  }
  const SKIN = '#c98d5c', SKIN_D = '#b57a4b', HAIR = '#2a1d16', SHIRT = '#e07a4f', SHIRT_D = '#c4643c'
  const TROUSER = '#3a4f7a', SHOE = '#2b2a33', HAT = '#ffd166', HAT_D = '#e3b23c'
  // head (all faces) + hair
  box(0, 0, 32, 16, SKIN)
  box(8, 0, 8, 8, HAIR)
  box(0, 8, 32, 2, HAIR)
  box(24, 8, 8, 6, HAIR)
  // face (front is x 8–16, y 8–16)
  box(9, 11, 2, 2, '#ffffff'); box(10, 11, 1, 2, '#2b2a33')
  box(13, 11, 2, 2, '#ffffff'); box(13, 11, 1, 2, '#2b2a33')
  box(11, 13, 2, 1, SKIN_D)
  box(10, 14, 4, 1, '#8a4a32')
  // body
  box(16, 16, 24, 16, SHIRT)
  box(20, 20, 8, 1, SHIRT_D)
  box(16, 30, 24, 2, TROUSER)
  // right arm (40–56, 16–32) and left arm (32–48, 48–64)
  box(40, 16, 16, 16, SKIN)
  box(40, 16, 16, 10, SHIRT)
  box(32, 48, 16, 16, SKIN)
  box(32, 48, 16, 10, SHIRT)
  // legs
  box(0, 16, 16, 16, TROUSER); box(0, 29, 16, 3, SHOE); box(4, 16, 4, 4, TROUSER)
  box(16, 48, 16, 16, TROUSER); box(16, 61, 16, 3, SHOE)
  // hard hat on the overlay layer (40–64, 0–16)
  box(40, 0, 8, 8, HAT)
  box(32, 8, 32, 3, HAT)
  box(32, 10, 32, 1, HAT_D)
  box(43, 1, 2, 6, '#fff3c4')
  return c
}

export function Guide({ wave = false, still = false, className }: { wave?: boolean; still?: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let viewer: SkinViewer | null = null
    try {
      viewer = new SkinViewer({ canvas: el, width: el.clientWidth || 180, height: el.clientHeight || 240, skin: drawSkin(), pixelRatio: 'match-device' })
      if (!viewer.renderer.getContext()) throw new Error('no WebGL')
    } catch {
      el.style.display = 'none' // no WebGL right now: the guide simply isn't shown
      return
    }
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
