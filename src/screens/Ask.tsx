import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, Keyboard, Mic, Square, Play, Trash2, Send } from 'lucide-react'
import { go } from '@/lib/router'
import { sfx } from '@/lib/sfx'
import { narrator } from '@/lib/narrator'
import { micStarting, micStopped } from '@/lib/audioSession'
import { commonLine } from '@/lesson/lines'
import { addItem, listItems, newId, removeItem, type InboxItem } from '@/lib/inbox'
import { MicButton } from '@/components/MicButton'

// "What do you want to learn?" He can say it, take a photo (of homework, a
// toy, anything), or type. Everything stays on this iPad until a grown-up exports it.

function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function ItemCard({ item, onDelete }: { item: InboxItem; onDelete: () => void }) {
  const url = useObjectUrl(item.kind === 'text' ? undefined : item.blob)
  const audio = useRef<HTMLAudioElement>(null)
  return (
    <li className="ask-item">
      {item.kind === 'photo' && url && <img src={url} alt="A photo he took" />}
      {item.kind === 'voice' && (
        <button className="ask-play" onClick={() => (sfx.tap(), audio.current?.play())} aria-label="Play this voice note">
          <Play aria-hidden fill="currentColor" />
          <span className="tabular-nums">{Math.max(1, Math.round(item.seconds))}s</span>
          {url && <audio ref={audio} src={url} preload="metadata" />}
        </button>
      )}
      {item.kind === 'text' && <p className="ask-text">{item.text}</p>}
      <button className="ask-del" onClick={onDelete} aria-label="Delete">
        <Trash2 aria-hidden />
      </button>
    </li>
  )
}

export function Ask() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [recording, setRecording] = useState(false)
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const [micError, setMicError] = useState(false)
  const rec = useRef<{ r: MediaRecorder; chunks: Blob[]; started: number; stream: MediaStream } | null>(null)
  const refresh = () => void listItems().then(setItems)
  useEffect(refresh, [])

  const startRec = async () => {
    narrator.stop()
    try {
      micStarting()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported?.(m)) ?? ''
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        micStopped()
        const type = r.mimeType || mime || 'audio/mp4'
        const seconds = (Date.now() - (rec.current?.started ?? Date.now())) / 1000
        if (chunks.length) await addItem({ id: newId(), at: Date.now(), kind: 'voice', blob: new Blob(chunks, { type }), mime: type, seconds })
        rec.current = null
        refresh()
      }
      r.start()
      rec.current = { r, chunks, started: Date.now(), stream }
      setRecording(true)
      setMicError(false)
      sfx.tap()
    } catch {
      micStopped() // no microphone (or not allowed): put the speakers back anyway
      setMicError(true)
    }
  }
  const stopRec = () => {
    rec.current?.r.stop()
    setRecording(false)
    sfx.correct()
  }
  const onPhoto = async (f: File | undefined) => {
    if (!f) return
    await addItem({ id: newId(), at: Date.now(), kind: 'photo', blob: f, mime: f.type || 'image/jpeg' })
    sfx.correct()
    refresh()
  }
  const sendText = async () => {
    if (!text.trim()) return
    await addItem({ id: newId(), at: Date.now(), kind: 'text', text: text.trim() })
    setText('')
    setTyping(false)
    sfx.correct()
    refresh()
  }

  return (
    <main className="ask" data-tone="build">
      <header className="section-top">
        <button className="icon-btn" onClick={() => (rec.current?.r.stop(), go({ name: 'home' }))} aria-label="Home">
          <ArrowLeft aria-hidden />
        </button>
        <h1 className="section-title">What do you want to learn?</h1>
      </header>
      <div className="ask-actions">
        <button className="ask-big mic" data-on={recording || undefined} onClick={recording ? stopRec : startRec} aria-label={recording ? 'Stop recording' : 'Record your voice'}>
          {recording ? <Square aria-hidden fill="currentColor" /> : <Mic aria-hidden />}
          <span>{recording ? 'Stop' : 'Say it'}</span>
        </button>
        <label className="ask-big photo" aria-label="Take a photo">
          <Camera aria-hidden />
          <span>Photo</span>
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
        </label>
        <button className="ask-big type" onClick={() => (sfx.tap(), setTyping((t) => !t))} aria-label="Type it">
          <Keyboard aria-hidden />
          <span>Type</span>
        </button>
      </div>
      {micError && <p className="ask-note">The microphone isn't available. A grown-up can allow it in Settings.</p>}
      {typing && (
        <form className="ask-type" onSubmit={(e) => (e.preventDefault(), void sendText())}>
          <label htmlFor="ask-text" className="sr-only">What do you want to learn?</label>
          <input id="ask-text" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" enterKeyHint="send" placeholder="How do rockets work?" />
          <MicButton label="Speak to type" showWords={false} onHeard={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} />
          <button type="submit" className="dock-btn next" aria-label="Save" disabled={!text.trim()}>
            <Send aria-hidden />
          </button>
        </form>
      )}
      {items.length > 0 ? (
        <ul className="ask-list">
          {items.map((it) => (
            <ItemCard key={it.id} item={it} onDelete={() => void removeItem(it.id).then(refresh)} />
          ))}
        </ul>
      ) : (
        <button className="empty ask-empty" onClick={() => narrator.say(commonLine('ask-empty'))}>
          Your ideas will show up here
        </button>
      )}
    </main>
  )
}
