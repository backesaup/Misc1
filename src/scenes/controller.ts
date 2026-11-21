/**
 * The shared state of one mounted scene. GSAP tweens the numbers in `values`;
 * scenes read them every frame, so the lesson timeline drives everything.
 */
export class SceneController {
  values: Record<string, number>
  labels: Record<string, string> = {}
  private snap: { values: Record<string, number>; labels: Record<string, string> } | null = null
  /** Called when a learner taps a part of the scene (explore steps). */
  onPart: ((id: string) => void) | null = null

  constructor(defaults: Record<string, number>) {
    this.values = { ...defaults }
  }

  snapshot() {
    this.snap = { values: { ...this.values }, labels: { ...this.labels } }
  }

  restore() {
    if (!this.snap) return
    Object.assign(this.values, this.snap.values)
    this.labels = { ...this.snap.labels }
  }
}
