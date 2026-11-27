// Every sound is made here with Web Audio: no sound files.
// The browser only allows sound after a touch, so unlock() runs on the START ENGINE press.

let ctx: AudioContext | null = null
let master: GainNode | null = null

export function unlockAudio(): void {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(ctx.destination)
  }
  if (ctx.state !== 'running') void ctx.resume()
  // iOS needs a sound to start inside the touch itself.
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  g.gain.value = 0.0001
  o.connect(g).connect(master!)
  o.start()
  o.stop(ctx.currentTime + 0.02)
}

function ready(): AudioContext | null {
  return ctx && master ? ctx : null
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol = 0.3): void {
  const c = ready()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  const t = c.currentTime + start
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + dur + 0.05)
}

/** The car's "bip-bip" (like unlocking a car). */
export function beepBeep(): void {
  tone(1320, 0, 0.12, 'square', 0.18)
  tone(1320, 0.18, 0.14, 'square', 0.18)
}

/** Scanner chirps while the licence is checked. */
export function scanTick(): void {
  tone(2200, 0, 0.04, 'sine', 0.08)
}

/** Happy "verified" chime. */
export function verifiedChime(): void {
  tone(784, 0, 0.18, 'triangle', 0.3)
  tone(1047, 0.12, 0.18, 'triangle', 0.3)
  tone(1568, 0.24, 0.35, 'triangle', 0.25)
}

/** Soft "hmm" for a card that didn't work. Never a harsh buzzer. */
export function hmm(): void {
  tone(392, 0, 0.18, 'sine', 0.25)
  tone(330, 0.2, 0.3, 'sine', 0.25)
}

/** A plastic click for taps. */
export function click(): void {
  const c = ready()
  if (!c) return
  const len = Math.floor(c.sampleRate * 0.03)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4
  const src = c.createBufferSource()
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 3200
  const g = c.createGain()
  g.gain.value = 0.9
  src.buffer = buf
  src.connect(f).connect(g).connect(master!)
  src.start()
}

/** Toy engine: a starter crank, a catch, a big rev, then settling to idle. About 1.6 s. */
export function engineStartAndRev(): void {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  // Starter motor: quick ticks.
  for (let i = 0; i < 4; i++) tone(90 + i * 6, i * 0.08, 0.06, 'square', 0.12)

  const out = c.createGain()
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 6
  out.connect(master!)
  lp.connect(out)

  const a = c.createOscillator()
  const b = c.createOscillator()
  a.type = 'sawtooth'
  b.type = 'square'
  a.connect(lp)
  const bg = c.createGain()
  bg.gain.value = 0.4
  b.connect(bg).connect(lp)

  // A wobble makes it chug like a little engine.
  const lfo = c.createOscillator()
  const lfoGain = c.createGain()
  lfo.frequency.value = 18
  lfoGain.gain.value = 0.35
  lfo.connect(lfoGain).connect(out.gain)

  const start = t + 0.32
  const pitch = (f: number, at: number) => {
    a.frequency.linearRampToValueAtTime(f, start + at)
    b.frequency.linearRampToValueAtTime(f * 0.5, start + at)
    lp.frequency.linearRampToValueAtTime(f * 8, start + at)
  }
  a.frequency.setValueAtTime(45, start)
  b.frequency.setValueAtTime(22, start)
  lp.frequency.setValueAtTime(300, start)
  pitch(70, 0.15)
  pitch(55, 0.3)
  pitch(150, 0.65) // VROOM
  pitch(170, 0.8)
  pitch(60, 1.25)

  out.gain.setValueAtTime(0.0001, start)
  out.gain.exponentialRampToValueAtTime(0.4, start + 0.05)
  out.gain.setValueAtTime(0.4, start + 1.0)
  out.gain.exponentialRampToValueAtTime(0.0001, start + 1.5)

  for (const o of [a, b, lfo]) {
    o.start(start)
    o.stop(start + 1.6)
  }
}
