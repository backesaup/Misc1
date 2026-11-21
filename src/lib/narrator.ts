import type { SpokenLine } from '@/lesson/lines'

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
  onLine: ((text: string | null) => void) | null = null

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
      this.onLine?.(line.text)
      const a = this.el()
      a.onended = () => {
        log.played.push(line.key)
        finish('ended')
      }
      a.onerror = () => {
        if (finished) return
        log.fallbacks.push(line.key)
        this.speak(line.text, finish)
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

  private speak(text: string, finish: (r: 'ended' | 'cancelled') => void) {
    if (typeof window.speechSynthesis === 'undefined') {
      // No voice at all: give a reading-time pause so the flow still works.
      globalThis.setTimeout(() => finish('ended'), 600 + text.length * 55)
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    u.voice = voices.find((v) => v.lang === 'en-GB' && /male|daniel|arthur/i.test(v.name)) ?? voices.find((v) => v.lang === 'en-GB') ?? null
    u.lang = 'en-GB'
    u.rate = 0.9 * this.rate
    u.onend = () => finish('ended')
    u.onerror = () => finish('ended')
    this.utter = u
    window.speechSynthesis.speak(u)
  }
}

export const narrator = new Narrator()
