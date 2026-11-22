// Speech input. Uses the browser's speech recognition (on iPad: Apple's speech service,
// which may send audio to Apple to transcribe; a grown-up can turn it off in settings).
// The microphone changes how the iPad plays audio, so audioSession.ts switches it back after.
import { micStarting, micStopped } from './audioSession'

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type Ctor = new () => Recognition

const Ctor = (): Ctor | undefined =>
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: Ctor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: Ctor }).webkitSpeechRecognition)

export const canListen = () => !!Ctor()

export interface Listening {
  /** Resolves with the final text ('' if nothing was heard or it failed). */
  done: Promise<string>
  stop: () => void
}

/** Listen once (must be started from a tap). onPartial gets the words as he speaks. */
export function listen(onPartial?: (text: string) => void, lang = 'en-GB'): Listening {
  const C = Ctor()
  if (!C) return { done: Promise.resolve(''), stop: () => {} }
  const r = new C()
  r.lang = lang
  r.interimResults = true
  r.continuous = false
  r.maxAlternatives = 1
  let text = ''
  let settle!: (t: string) => void
  const done = new Promise<string>((res) => (settle = res))
  r.onresult = (e) => {
    text = Array.from(e.results)
      .map((res) => res[0]?.transcript ?? '')
      .join(' ')
      .trim()
    onPartial?.(text)
  }
  r.onerror = () => settle(text)
  r.onend = () => settle(text)
  micStarting()
  try {
    r.start()
  } catch {
    settle('')
  }
  // never listen forever
  const t = window.setTimeout(() => r.stop(), 9000)
  void done.then(() => {
    window.clearTimeout(t)
    // make sure the microphone is really released, then give the speakers back
    try {
      r.abort()
    } catch {
      /* already ended */
    }
    micStopped()
  })
  return { done, stop: () => r.stop() }
}
