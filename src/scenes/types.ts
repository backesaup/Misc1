import type { ComponentType } from 'react'
import type { Cue } from '@/lesson/types'
import type { SceneController } from './controller'

export type ActionResult = gsap.core.Animation | (() => void)
export type Action = (ctrl: SceneController, cue: Cue, opts: { reduced: boolean }) => ActionResult

export interface SceneProps {
  ctrl: SceneController
  reduced: boolean
  /** Which explore part is currently being talked about (if any). */
  activePart: string | null
}

export interface SceneDef {
  defaults: Record<string, number>
  /** '3d' scenes share one WebGL canvas; '2d' scenes are SVG. */
  kind: '3d' | '2d'
  /** Camera for 3D scenes. */
  camera?: { position: [number, number, number]; target: [number, number, number]; fov?: number }
  /** Optional live camera aim (e.g. follows the current layout). */
  aim?: (ctrl: SceneController) => [number, number, number]
  Component: ComponentType<SceneProps>
  /** HTML drawn on top of the scene (counters, labels). */
  Overlay?: ComponentType<SceneProps>
  actions: Record<string, Action>
  applyParams?: (ctrl: SceneController, params: Record<string, number | string | boolean>) => void
}

/** Duration helper: the reduced-motion path jumps straight to the end state. */
export const dur = (cue: Cue, reduced: boolean, fallback = 1) => (reduced ? 0.001 : (cue.duration ?? fallback))
