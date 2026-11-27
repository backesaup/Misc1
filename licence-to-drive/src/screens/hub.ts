// Home: his licence and the four places. Step 1 has the places locked with a "coming soon" tease.
import { click, beepBeep } from '../lib/audio'
import { syncPending, verifyLicence, type SyncState } from '../lib/save'
import { say } from '../lib/voice'
import { totalStarts, type Save } from '../../shared/save'
import { icons } from '../icons'
import { esc, figureSvg, h, show } from '../ui'
import { world } from '../world'

const PLACES = [
  { id: 'garage', name: 'Garage', icon: icons.garage, line: 'The Garage! Your car builder is coming soon.' },
  { id: 'trip', name: 'Road Trip', icon: icons.road, line: 'Road Trip! The roads are being built.' },
  { id: 'points', name: 'Driving Points', icon: icons.stamp, line: 'Driving Points! Coming soon.' },
  { id: 'works', name: 'How a Car Works', icon: icons.gear, line: 'How a car works! Coming soon.' },
]

function ago(at: number): string {
  const s = Math.round((Date.now() - at) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return new Date(at).toLocaleDateString()
}

export function hubScreen(
  code: string,
  initial: Save,
  initialSync: SyncState,
  saving?: Promise<{ save: Save; sync: SyncState }>,
): void {
  void world().then((w) => w.setMode('hub'))
  let save = initial
  let sync = initialSync

  const el = h(
    'section',
    { class: 'screen hub' },
    `<div class="hub-top">
       <div class="mini-licence"><div class="portrait">${figureSvg}</div><div><b>${esc(save.name)}</b><small>● Learner</small></div></div>
     </div>
     <div class="places">${PLACES.map(
       (p) => `<button class="place" data-id="${p.id}"><span class="lock">${icons.lock}</span><span class="ic">${p.icon}</span>${p.name}</button>`,
     ).join('')}</div>
     <div class="hub-bottom">
       <div class="grownup" aria-live="polite"></div>
       <button class="toy horn" aria-label="Honk">${icons.horn}</button>
     </div>`,
  )

  const info = el.querySelector('.grownup')!
  const render = () => {
    const devices = Object.keys(save.starts).length
    info.innerHTML = `<span class="sync ${sync}"><span class="ic">${icons.cloud}</span>${
      sync === 'synced' ? 'Saved' : 'Offline: will sync'
    }</span><br>Engine starts: <b>${totalStarts(save)}</b> on ${devices} device${devices === 1 ? '' : 's'}${
      save.lastStart ? `<br>Last start: ${save.lastStart.device}, ${ago(save.lastStart.at)}` : ''
    }<br><a href="/">Scan a licence</a>`
  }
  render()

  for (const btn of el.querySelectorAll<HTMLButtonElement>('.place')) {
    btn.addEventListener('click', () => {
      click()
      const p = PLACES.find((x) => x.id === btn.dataset.id)!
      say(p.line)
      btn.classList.remove('wiggle')
      void btn.offsetWidth
      btn.classList.add('wiggle')
    })
  }
  el.querySelector('.horn')!.addEventListener('click', () => {
    beepBeep()
    void world().then((w) => w.flashHeadlights(1))
  })

  const apply = (r: { save: Save; sync: SyncState } | null) => {
    if (!r || !el.isConnected) return
    save = r.save
    sync = r.sync
    render()
  }
  void saving?.then(apply)

  // Pick up starts made on other devices when he comes back to the game, and push offline changes.
  const refresh = async () => {
    if (!el.isConnected) return cleanup()
    apply(await syncPending(code))
    const v = await verifyLicence(code)
    if (v.ok) apply(v)
  }
  const onVisible = () => !document.hidden && void refresh()
  const onOnline = () => void refresh()
  const timer = setInterval(() => !document.hidden && void refresh(), 15000)
  function cleanup() {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onOnline)
    clearInterval(timer)
  }
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)

  show(el)
}
