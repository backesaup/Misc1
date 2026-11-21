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

// ── Disco music: an original beat synthesised live (2 beats a second, 120 bpm), quiet under the narration.
let musicTimer = 0
let musicGain: GainNode | null = null
export const BEATS_PER_SECOND = 2

function kick(c: AudioContext, out: AudioNode, t: number) {
  const o = c.createOscillator(), g = c.createGain()
  o.frequency.setValueAtTime(130, t)
  o.frequency.exponentialRampToValueAtTime(45, t + 0.18)
  g.gain.setValueAtTime(0.9, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.3)
}
function hat(c: AudioContext, out: AudioNode, t: number) {
  const len = Math.floor(c.sampleRate * 0.05)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  src.buffer = buf
  f.type = 'highpass'
  f.frequency.value = 7000
  g.gain.value = 0.25
  src.connect(f).connect(g).connect(out)
  src.start(t)
}
function bass(c: AudioContext, out: AudioNode, t: number, freq: number) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = 'triangle'
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.25)
}

export function startMusic(volume = 0.22) {
  const c = ac()
  if (!c || musicTimer) return
  musicGain = c.createGain()
  musicGain.gain.value = volume
  musicGain.connect(c.destination)
  const beat = 1 / BEATS_PER_SECOND
  const notes = [55, 55, 82.4, 73.4, 55, 55, 98, 82.4]
  let next = c.currentTime + 0.05
  let n = 0
  const schedule = () => {
    while (next < c.currentTime + 0.3) {
      kick(c, musicGain!, next)
      hat(c, musicGain!, next + beat / 2)
      bass(c, musicGain!, next + beat / 2, notes[n % notes.length])
      next += beat
      n++
    }
  }
  schedule()
  musicTimer = window.setInterval(schedule, 100)
}

export function stopMusic() {
  window.clearInterval(musicTimer)
  musicTimer = 0
  const g = musicGain
  musicGain = null
  if (g && ctx) {
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
    window.setTimeout(() => g.disconnect(), 600)
  }
}
