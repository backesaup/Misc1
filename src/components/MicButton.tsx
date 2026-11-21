import { useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { canListen, listen, type Listening } from '@/lib/listen'
import { narrator } from '@/lib/narrator'
import { sfx } from '@/lib/sfx'
import { useSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'

/**
 * A big microphone: tap, speak, and the words appear. Hidden when the device can't
 * recognise speech or a grown-up has turned speech input off.
 */
export function MicButton({
  onHeard,
  label = 'Say it',
  className,
  showWords = true,
}: {
  onHeard: (text: string) => void
  label?: string
  className?: string
  showWords?: boolean
}) {
  const { settings } = useSettings()
  const [on, setOn] = useState(false)
  const [words, setWords] = useState('')
  const cur = useRef<Listening | null>(null)
  if (!settings.speechInput || !canListen()) return null

  const tap = async () => {
    if (on) {
      cur.current?.stop()
      return
    }
    narrator.stop() // don't let it hear the narrator
    sfx.tap()
    setWords('')
    setOn(true)
    cur.current = listen((t) => setWords(t))
    const text = await cur.current.done
    setOn(false)
    cur.current = null
    if (text) onHeard(text)
  }
  return (
    <div className={cn('mic-wrap', className)}>
      <button className="mic-btn" data-on={on || undefined} onClick={() => void tap()} aria-label={on ? 'Stop listening' : label}>
        <Mic aria-hidden strokeWidth={2.5} />
      </button>
      {showWords && (on || words) && (
        <p className="mic-words" aria-live="polite">
          {words || 'Listening…'}
        </p>
      )}
    </div>
  )
}
