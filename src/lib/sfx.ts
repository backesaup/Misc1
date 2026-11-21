// Small original sound effects, synthesised so nothing extra is downloaded.
// Calm by design: a soft tap, a warm chime for a right answer, nothing for a wrong one.

let ctx: AudioContext | null = null
let enabled = true

export const setSoundsEnabled = (on: boolean) => {
  enabled = on
}

function ac() {
  if (!enabled) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const c = ac()
  if (!c) return
  const t = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export const sfx = {
  tap: () => tone(520, 0, 0.09, 0.06, 'triangle'),
  block: () => tone(180 + Math.random() * 40, 0, 0.07, 0.035, 'square'),
  correct: () => {
    tone(660, 0, 0.35, 0.08)
    tone(990, 0.09, 0.45, 0.07)
  },
  reveal: () => tone(440, 0, 0.3, 0.05),
}
