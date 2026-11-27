// Spoken lines for big moments. He doesn't need to read anything.
// Uses the device's own voice for now (an open question in the brief is whose voice it should be).

let voice: SpeechSynthesisVoice | null = null

function pickVoice(): void {
  const voices = window.speechSynthesis?.getVoices() ?? []
  voice =
    voices.find((v) => v.lang === 'en-GB' && /Daniel|Arthur|Google UK English Male/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
}

if ('speechSynthesis' in window) {
  pickVoice()
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
}

export function say(text: string, opts: { rate?: number; pitch?: number } = {}): void {
  if (!('speechSynthesis' in window)) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'en-GB'
  u.rate = opts.rate ?? 1.05
  u.pitch = opts.pitch ?? 1.1
  synth.speak(u)
}
