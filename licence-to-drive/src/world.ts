// The 3D world canvas is shared by every game screen and loaded once, in the background.
import type { GarageScene } from './three/scene'
import { reducedMotion } from './lib/device'

let scene: Promise<GarageScene> | null = null

export function world(): Promise<GarageScene> {
  scene ??= import('./three/scene').then(({ createGarageScene }) =>
    createGarageScene(document.getElementById('world') as HTMLCanvasElement, {
      reducedMotion: reducedMotion(),
      showFps: new URLSearchParams(location.search).has('fps') || sessionStorage.getItem('ltd:fps') === '1',
    }),
  )
  return scene
}

export function hideWorld(): void {
  document.getElementById('world')!.style.visibility = 'hidden'
}
export function showWorld(): void {
  document.getElementById('world')!.style.visibility = 'visible'
}
