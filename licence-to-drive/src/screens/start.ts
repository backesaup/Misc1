// START ENGINE → licence scan intro (under 4 s, tap to skip) → home.
import { beepBeep, engineStartAndRev, hmm, scanTick, unlockAudio, verifiedChime } from '../lib/audio'
import { deviceId, deviceKind, reducedMotion } from '../lib/device'
import { commit, localSave, rememberLicence, verifyLicence, type Verify } from '../lib/save'
import { say } from '../lib/voice'
import { recordStart } from '../../shared/save'
import { icons } from '../icons'
import { h, licenceCard, show } from '../ui'
import { showWorld, world } from '../world'
import { checkScreen } from './check'
import { hubScreen } from './hub'

export function startScreen(code: string): void {
  showWorld()
  void world().then((w) => w.setMode('intro'))
  // Start checking the licence straight away, while he looks at the button.
  const verifying = verifyLicence(code)

  const el = h(
    'section',
    { class: 'screen start' },
    `<button class="engine-btn" aria-label="Start engine"><span class="ic">${icons.key}</span>START<br>ENGINE</button>`,
  )
  const btn = el.querySelector('button')!
  const go = () => {
    btn.classList.add('pressed')
    unlockAudio() // must happen inside the touch
    beepBeep()
    intro(code, verifying)
  }
  btn.addEventListener('pointerup', go, { once: true })
  show(el)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function intro(code: string, verifying: Promise<Verify>): Promise<void> {
  const cached = localSave(code)
  const card = licenceCard(cached?.name ?? '· · ·')
  card.classList.add('scanning')
  const line = h('div', { class: 'say-line' })
  const el = h('section', { class: 'screen intro' })
  const skip = h('button', { class: 'skip', 'aria-label': 'Skip' })
  el.append(card, line, skip)
  show(el)

  let skipped = false
  let canSkip = false
  let finish: () => void = () => {}
  skip.addEventListener('pointerup', () => {
    if (canSkip && !skipped) {
      skipped = true
      finish()
    }
  })

  const ticks = setInterval(scanTick, 180)
  const fast = reducedMotion() ? 400 : 1100
  const [result] = await Promise.all([verifying, sleep(fast)])
  clearInterval(ticks)
  card.classList.remove('scanning')

  if (!result.ok) {
    card.classList.add('rejected')
    card.querySelector('.stamp')!.textContent = 'TRY AGAIN'
    hmm()
    const words =
      result.reason === 'unknown'
        ? "Hmm. That card didn't work. Let's try again!"
        : 'Uh oh, no internet. A grown-up can help.'
    say(words)
    line.textContent = result.reason === 'unknown' ? '🤔' : '📶'
    line.classList.add('show')
    await sleep(2800)
    checkScreen({ message: result.reason === 'unknown' ? 'unknown' : 'offline' })
    return
  }

  rememberLicence(code)
  const name = result.save.name
  card.querySelector('.name')!.textContent = name
  card.classList.add('verified')
  verifiedChime()
  canSkip = true

  const w = await world()
  w.setPlate(name)
  const started = recordStart(result.save, deviceId(), deviceKind())
  const saving = commit(code, started)

  finish = () => hubScreen(code, started, result.sync, saving)
  say(`Licence accepted! Hello ${name}!`)
  line.textContent = `Hello ${name}!`
  line.classList.add('show')

  await sleep(250)
  if (skipped) return
  w.flashHeadlights(2)
  await sleep(450)
  if (skipped) return
  engineStartAndRev()
  w.rev()
  await sleep(1600)
  if (skipped) return
  skipped = true
  finish()
}
