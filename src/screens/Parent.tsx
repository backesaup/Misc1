import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { HoldButton } from '@/components/HoldButton'
import { lessons } from '@/lesson/content'
import { useSettings } from '@/lib/settings'
import { go } from '@/lib/router'
import { audioStatus, type AudioStatus } from '@/lib/audioStatus'
import { learner, appName } from '@/config'
import { readActivity, summarise, clearActivity } from '@/lib/activity'
import { exportZip, listItems, clearItems } from '@/lib/inbox'

function Row({ id, title, hint, checked, onChange }: { id: string; title: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="p-row">
      <label htmlFor={id} className="p-row-text">
        <span className="p-row-title">{title}</span>
        <span className="p-row-hint">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="p-switch" />
    </div>
  )
}

export function Parent() {
  const { settings, update, progress, resetProgress } = useSettings()
  const [audio, setAudio] = useState<AudioStatus | null>(null)
  const [cleared, setCleared] = useState(false)
  useEffect(() => {
    void audioStatus().then(setAudio)
  }, [])
  const [requests, setRequests] = useState<number | null>(null)
  const [exported, setExported] = useState<string | null>(null)
  useEffect(() => {
    void listItems().then((l) => setRequests(l.length))
  }, [])
  const activity = summarise(readActivity())
  const doExport = async () => {
    const file = await exportZip(readActivity(), learner.name)
    // iPad: the share sheet (save to Files, AirDrop to the laptop). Elsewhere: a download.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name })
        setExported(file.name)
        return
      } catch {
        /* cancelled: fall back to a download */
      }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    setExported(file.name)
  }
  const drafts = lessons.filter((l) => l.status === 'draft')
  const done = Object.keys(progress).length

  return (
    <main className="parent">
      <header className="parent-top">
        <button className="icon-btn" onClick={() => go({ name: 'home' })} aria-label="Back to home">
          <ArrowLeft aria-hidden />
        </button>
        <h1>Grown-ups</h1>
      </header>

      <section className="p-card" aria-labelledby="p-play">
        <h2 id="p-play">Playing</h2>
        <Row id="captions" title="Captions" hint="Show the narration as text under the picture." checked={settings.captions} onChange={(v) => update({ captions: v })} />
        <Row id="sounds" title="Sound effects" hint="Soft taps and a chime for a right answer." checked={settings.sounds} onChange={(v) => update({ sounds: v })} />
        <Row
          id="motion"
          title="Simpler motion"
          hint="Always use the reduced-motion path, even if the device setting is off."
          checked={settings.reduceMotion === 'on'}
          onChange={(v) => update({ reduceMotion: v ? 'on' : 'system' })}
        />
        <div className="p-row">
          <div className="p-row-text">
            <span className="p-row-title">Narration speed</span>
            <span className="p-row-hint">Files are recorded at 0.9×. This changes playback on top.</span>
          </div>
          <div className="seg" role="radiogroup" aria-label="Narration speed">
            {[0.85, 1, 1.15].map((s) => (
              <button key={s} role="radio" aria-checked={settings.speed === s} onClick={() => update({ speed: s })}>
                {s === 1 ? 'Normal' : s < 1 ? 'Slower' : 'Faster'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="p-card" aria-labelledby="p-drafts">
        <h2 id="p-drafts">Drafts</h2>
        <Row
          id="drafts"
          title="Show draft lessons"
          hint={`Drafts have facts or builds nobody has checked yet. Keep this off for ${learner.name}.`}
          checked={settings.showDrafts}
          onChange={(v) => update({ showDrafts: v })}
        />
        {drafts.map((l) => (
          <details key={l.id} className="p-verify">
            <summary>
              {l.title} <span className="p-count">{l.verify?.length ?? 0} to check</span>
            </summary>
            <ul>
              {l.verify?.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      <section className="p-card" aria-labelledby="p-voice">
        <h2 id="p-voice">Narration files</h2>
        {!audio ? (
          <p className="p-row-hint">Checking…</p>
        ) : (
          <>
            <p className="p-stat">
              <span className="tabular-nums">{audio.total - audio.missing.length - audio.stale.length}</span> of{' '}
              <span className="tabular-nums">{audio.total}</span> lines recorded
            </p>
            {(audio.missing.length > 0 || audio.stale.length > 0) && (
              <p className="p-row-hint">
                {audio.missing.length} missing, {audio.stale.length} out of date. These use the device voice for now. Run{' '}
                <code>python scripts/generate-audio.py</code> on the laptop, then redeploy.
              </p>
            )}
          </>
        )}
      </section>

      <section className="p-card" aria-labelledby="p-ask">
        <h2 id="p-ask">{learner.name}'s requests</h2>
        <p className="p-stat">
          <span className="tabular-nums">{requests ?? '…'}</span> saved (voice notes, photos, typed ideas)
        </p>
        <p className="p-row-hint">
          Export them, then put the zip in the repo's <code>requests/</code> folder. Claude reads that folder to make new lessons for him. The export also
          includes the activity summary below.
        </p>
        <div className="p-actions">
          <button className="p-btn" onClick={() => void doExport()}>Export requests</button>
          <HoldButton ms={1500} onDone={() => void clearItems().then(() => setRequests(0))} label="Hold to delete all requests" className="p-danger">
            Hold to delete all
          </HoldButton>
        </div>
        {exported && <p className="p-row-hint">Saved {exported}.</p>}
      </section>

      <section className="p-card" aria-labelledby="p-watch">
        <h2 id="p-watch">What he's doing</h2>
        <p className="p-row-hint">Kept on this iPad only. Use it to see what works for him and adjust.</p>
        <p className="p-stat">
          <span className="tabular-nums">{activity.finished}</span> lessons finished
        </p>
        {activity.replays.length > 0 && (
          <div>
            <p className="p-row-title">Steps he replays most</p>
            <ul className="p-list">{activity.replays.map(([k, n]) => <li key={k}>{k} <span className="p-count">×{n}</span></li>)}</ul>
          </div>
        )}
        {activity.wrongs.length > 0 && (
          <div>
            <p className="p-row-title">Wrong answers he picked</p>
            <ul className="p-list">
              {activity.wrongs.map((w) => (
                <li key={w.step}>
                  {w.step}: {w.choices.map(([c, n]) => `${c} (×${n})`).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}
        {activity.quits.length > 0 && (
          <div>
            <p className="p-row-title">Where he stopped</p>
            <ul className="p-list">{activity.quits.map(([k, n]) => <li key={k}>{k} <span className="p-count">×{n}</span></li>)}</ul>
          </div>
        )}
        <HoldButton ms={1500} onDone={() => clearActivity()} label="Hold to clear the activity log" className="p-danger">
          Hold to clear log
        </HoldButton>
      </section>

      <section className="p-card" aria-labelledby="p-progress">
        <h2 id="p-progress">Progress</h2>
        <p className="p-stat">
          <span className="tabular-nums">{done}</span> {done === 1 ? 'lesson' : 'lessons'} finished on this device
        </p>
        <HoldButton ms={1500} onDone={() => (resetProgress(), setCleared(true))} label="Hold to clear progress" className="p-danger">
          {cleared ? 'Cleared' : 'Hold to clear progress'}
        </HoldButton>
      </section>
      <p className="p-foot">
        {appName} keeps everything on this device. No accounts, no tracking.
      </p>
    </main>
  )
}
