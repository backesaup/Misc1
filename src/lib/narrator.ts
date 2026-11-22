import { deviceVoice, type SpokenLine } from '@/lesson/lines'

/**
 * Plays pre-generated narration files. If a file is missing (only expected
 * during development, before scripts/generate-audio.py has run), it falls back
 * to the browser's speech voice and records the miss so the smoke test fails.
 */

declare global {
  interface Window {
    __narration?: { fallbacks: string[]; played: string[] }
  }
}

const SILENT =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'

type Handle = { done: Promise<'ended' | 'cancelled'>; cancel: () => void }

class Narrator {
  private audio: HTMLAudioElement | null = null
  private utter: SpeechSynthesisUtterance | null = null
  private settle: ((r: 'ended' | 'cancelled') => void) | null = null
  private unlocked = false
  rate = 1
  onLine: ((text: string | null, speaker?: string) => void) | null = null

  private el() {
    if (!this.audio) {
      this.audio = new Audio()
      this.audio.preload = 'auto'
    }
    return this.audio
  }

  /** Call from inside a tap handler: iOS only allows audio to start after a tap. */
  unlock() {
    if (this.unlocked) return
    this.unlocked = true
    const a = this.el()
    a.src = SILENT
    a.play().catch(() => {})
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
    } catch {
      /* no speech voice: fine */
    }
  }

  /**
   * Forget the earlier unlock, so the next tap unlocks audio again (needed after the microphone
   * was on: iOS may have cut the audio element off). Never interrupts a line that's playing.
   */
  relock() {
    if (this.settle) return
    this.unlocked = false
  }

  stop() {
    const s = this.settle
    this.settle = null
    if (this.audio) {
      this.audio.onended = this.audio.onerror = null
      this.audio.pause()
    }
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    this.utter = null
    this.onLine?.(null)
    s?.('cancelled')
  }

  pause() {
    this.audio?.pause()
    try {
      window.speechSynthesis?.pause()
    } catch {
      /* ignore */
    }
  }

  resume() {
    if (this.audio && this.settle && !this.utter) this.audio.play().catch(() => {})
    try {
      window.speechSynthesis?.resume()
    } catch {
      /* ignore */
    }
  }

  say(line: SpokenLine, opts: { delay?: number } = {}): Handle {
    this.stop()
    let resolve!: (r: 'ended' | 'cancelled') => void
    const done = new Promise<'ended' | 'cancelled'>((r) => (resolve = r))
    let finished = false
    const finish = (r: 'ended' | 'cancelled') => {
      if (finished) return
      finished = true
      if (this.settle === finish) this.settle = null
      if (r === 'ended') this.onLine?.(null)
      resolve(r)
    }
    this.settle = finish
    const log = (window.__narration ??= { fallbacks: [], played: [] })

    const start = () => {
      if (finished) return
      this.onLine?.(line.text, line.speaker ?? 'narrator')
      const a = this.el()
      a.onended = () => {
        log.played.push(line.key)
        finish('ended')
      }
      a.onerror = () => {
        if (finished) return
        log.fallbacks.push(line.key)
        this.speak(line, finish)
      }
      a.src = (import.meta.env.BASE_URL ?? '/') + line.audio
      a.playbackRate = this.rate
      a.play().catch((e: unknown) => {
        // NotAllowedError means no tap yet; NotSupported means the file is missing.
        if (finished) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        if (e instanceof DOMException && e.name === 'NotAllowedError') return finish('ended')
      })
    }
    if (opts.delay) window.setTimeout(start, opts.delay)
    else start()
    return { done, cancel: () => finish('cancelled') }
  }

  /** The best installed English voice: premium/enhanced first, British preferred. */
  private pickVoice() {
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
    const score = (v: SpeechSynthesisVoice) =>
      (/premium|enhanced|neural|natural|siri/i.test(v.name) ? 10 : 0) +
      (v.lang === 'en-GB' ? 4 : 0) +
      (/daniel|arthur|oliver|serena|kate|jamie/i.test(v.name) ? 2 : 0) +
      (v.localService ? 1 : 0) -
      (/compact|novelty|albert|bad news|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox/i.test(v.name) ? 20 : 0)
    return voices.sort((a, b) => score(b) - score(a))[0] ?? null
  }

  /** Device voice, used only when a recorded file is missing: sentence by sentence, with pauses. */
  private speak(line: SpokenLine, finish: (r: 'ended' | 'cancelled') => void) {
    const text = line.text
    if (typeof window.speechSynthesis === 'undefined') {
      // No voice at all: give a reading-time pause so the flow still works.
      globalThis.setTimeout(() => finish('ended'), 600 + text.length * 55)
      return
    }
    const d = deviceVoice(line.speaker)
    const voice = this.pickVoice()
    const sentences = text.match(/[^.!?…]+[.!?…]*/g)?.map((t) => t.trim()).filter(Boolean) ?? [text]
    let i = 0
    const nextSentence = () => {
      if (i >= sentences.length) return finish('ended')
      const u = new SpeechSynthesisUtterance(sentences[i++])
      u.voice = voice
      u.lang = voice?.lang ?? 'en-GB'
      u.rate = d.rate * this.rate
      u.pitch = d.pitch
      u.onend = () => window.setTimeout(nextSentence, 320) // a breath between sentences
      u.onerror = () => finish('ended')
      this.utter = u
      window.speechSynthesis.speak(u)
    }
    nextSentence()
  }
}

export const narrator = new Narrator()
