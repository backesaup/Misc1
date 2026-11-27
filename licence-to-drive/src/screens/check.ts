// Licence Check: where the iPad home-screen app opens. He holds the card up to the front
// camera and the game reads the QR itself. On Android phones the NFC tag can be read here too.
import { extractLicenceCode } from '../../shared/licence'
import { rememberedLicence } from '../lib/save'
import { icons } from '../icons'
import { h, licenceCard, show, toast } from '../ui'
import { hideWorld } from '../world'
import { startScreen } from './start'

type Scanner = { stop(): Promise<void>; clear(): void; isScanning: boolean }
let scanner: Scanner | null = null

async function stopCamera(): Promise<void> {
  const s = scanner
  scanner = null
  if (!s) return
  try {
    if (s.isScanning) await s.stop()
    s.clear()
  } catch {
    /* already stopped */
  }
}

export function checkScreen(opts: { message?: 'unknown' | 'offline' } = {}): void {
  hideWorld()
  const hasNfc = 'NDEFReader' in window
  const remembered = rememberedLicence()
  const card = licenceCard('')
  card.classList.add('hint-card-inner')

  const el = h(
    'section',
    { class: 'screen check' },
    `<div class="logo"><span class="ic">${icons.wheel}</span>Licence to Drive</div>
     <div class="viewfinder">
       <div id="reader"></div>
       <div class="frame"></div>
       <div class="hint-card"></div>
     </div>
     <div class="check-actions">
       ${hasNfc ? `<button class="toy" data-act="nfc"><span class="ic">${icons.nfc}</span>Tap card</button>` : ''}
     </div>
     <div class="grownup">Grown-ups: <a href="/setup">set up a licence</a>${
       remembered ? ` · <a href="#" data-act="saved">use this device's licence</a>` : ''
     }</div>`,
  )
  el.querySelector('.hint-card')!.append(card)
  show(el)

  if (opts.message === 'unknown') toast('🤔', 'Try again!')
  if (opts.message === 'offline') toast('📶', 'No internet')

  let done = false
  const accept = async (raw: string) => {
    if (done) return
    const code = extractLicenceCode(raw)
    if (!code) return
    done = true
    navigator.vibrate?.(60)
    await stopCamera()
    history.replaceState(null, '', '/start')
    startScreen(code)
  }

  el.querySelector('[data-act="saved"]')?.addEventListener('click', (e) => {
    e.preventDefault()
    if (remembered) void accept(remembered)
  })

  el.querySelector('[data-act="nfc"]')?.addEventListener('click', async () => {
    try {
      type NdefRecord = { recordType: string; data: DataView }
      const Reader = (window as unknown as { NDEFReader: new () => EventTarget & { scan(): Promise<void> } }).NDEFReader
      const reader = new Reader()
      await reader.scan()
      toast(icons.nfc, 'Tap your card!', 2000)
      reader.addEventListener('reading', (ev) => {
        for (const r of (ev as unknown as { message: { records: NdefRecord[] } }).message.records) {
          if (r.recordType === 'url' || r.recordType === 'text') {
            void accept(new TextDecoder().decode(r.data))
          }
        }
      })
    } catch {
      toast(icons.nfc, 'NFC is off')
    }
  })

  void startCamera(el, accept)
}

async function startCamera(el: HTMLElement, onCode: (text: string) => void): Promise<void> {
  const finder = el.querySelector('.viewfinder')!
  await stopCamera()
  try {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
    if (!el.isConnected) return
    const s = new Html5Qrcode('reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    })
    scanner = s
    await s.start(
      { facingMode: 'user' }, // front camera: he holds the card up to the screen
      { fps: 12, disableFlip: false },
      (text) => onCode(text),
      () => {},
    )
    if (!el.isConnected) return void stopCamera()
    finder.classList.add('live')
  } catch {
    await stopCamera()
    if (!el.isConnected) return
    const off = h('div', { class: 'cam-off' }, `<button class="toy"><span class="ic">${icons.camera}</span>Camera</button>`)
    finder.append(off)
    off.querySelector('button')!.addEventListener('click', () => {
      off.remove()
      void startCamera(el, onCode)
    })
  }
}
