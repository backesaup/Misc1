// Keeps the iPad's audio working around the microphone.
//
// On iPad/iPhone, turning the microphone on (speech recognition for "Say it", or recording in
// Ask) switches the page's audio into a call-style "play and record" mode. If nothing switches
// it back, narration and sounds stay silent or come out of the tiny earpiece speaker, and the
// sound-effects engine can stay paused ("interrupted"). So:
//  - while the app runs, audio is in "playback" mode (proper speaker, like a video app);
//  - micStarting() switches to "play-and-record" just before the microphone opens;
//  - micStopped() switches back, wakes the sound engine and the narrator, and does it again on
//    the next tap, because iOS sometimes only lets audio restart from a tap.
// navigator.audioSession is Safari's Audio Session API (iPadOS 17+); older systems ignore it.
import { narrator } from './narrator'
import { recoverSounds } from './sfx'

type AudioSessionLike = { type: string }
const session = (): AudioSessionLike | undefined => {
  try {
    return (navigator as unknown as { audioSession?: AudioSessionLike }).audioSession
  } catch {
    return undefined
  }
}
const setType = (t: string) => {
  try {
    const s = session()
    if (s && s.type !== t) s.type = t
  } catch {
    /* not supported */
  }
}

/** Call once at start-up. */
export function initAudioSession() {
  setType('playback')
}

export function micStarting() {
  setType('play-and-record')
}

export function recoverAudio() {
  setType('playback')
  recoverSounds()
  narrator.relock()
}

export function micStopped() {
  // give iOS a moment to release the microphone, then put audio back
  window.setTimeout(recoverAudio, 150)
  window.addEventListener(
    'pointerdown',
    () => {
      recoverAudio()
      narrator.unlock()
    },
    { once: true, capture: true },
  )
}
