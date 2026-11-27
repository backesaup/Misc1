// For grown-ups: make the licence code, then get the QR to print and the URL for the NFC tag
// and the iPhone Shortcut. Normal reading UI; Ismaeel never needs this page.
import QRCode from 'qrcode'
import { extractLicenceCode } from '../../shared/licence'
import { esc, h, show } from '../ui'
import { hideWorld } from '../world'

export function setupScreen(): void {
  hideWorld()
  const el = h(
    'section',
    { class: 'setup' },
    `<div class="setup-inner">
      <h1>Licence to Drive: set-up</h1>
      <p>Make the licence code once, then put it on the card two ways: an NFC sticker for phones and a QR for the iPad.</p>

      <div class="card">
        <h2 style="margin-top:0">1. Make a licence</h2>
        <form data-form="new">
          <label for="name">Driver's name (shown in the game, never in a link)</label>
          <input id="name" name="name" maxlength="24" autocomplete="off" placeholder="Ismaeel" required />
          <label for="key">Set-up key (the <code>SETUP_KEY</code> set on Vercel)</label>
          <input id="key" name="key" type="password" autocomplete="off" />
          <div class="row"><button class="toy red" type="submit">Make licence</button></div>
          <p class="err" data-err="new"></p>
        </form>
      </div>

      <div class="card">
        <h2 style="margin-top:0">…or show an existing licence</h2>
        <form data-form="old">
          <label for="code">Licence code or start link</label>
          <input id="code" name="code" autocomplete="off" spellcheck="false" />
          <div class="row"><button class="toy" type="submit">Show</button></div>
          <p class="err" data-err="old"></p>
        </form>
      </div>

      <div data-result></div>
      <p><a href="/">← Back to the Licence Check</a></p>
    </div>`,
  )
  show(el)

  const result = el.querySelector<HTMLElement>('[data-result]')!

  el.querySelector('[data-form="new"]')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = e.target as HTMLFormElement
    const err = el.querySelector('[data-err="new"]')!
    err.textContent = ''
    const data = new FormData(f)
    try {
      const res = await fetch('/api/licence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.get('name'), setupKey: data.get('key') }),
      })
      const body = (await res.json()) as { code?: string; error?: string }
      if (!res.ok || !body.code) {
        err.textContent =
          {
            'wrong-setup-key': 'That set-up key is wrong.',
            'no-setup-key': 'Set SETUP_KEY in the Vercel project settings first.',
            'no-database': 'No database yet: connect Upstash Redis to the Vercel project.',
            'need-name': 'Type a name.',
          }[body.error ?? ''] ?? `Something went wrong (${res.status}).`
        return
      }
      void renderResult(result, body.code)
    } catch {
      err.textContent = 'Could not reach the server.'
    }
  })

  el.querySelector('[data-form="old"]')!.addEventListener('submit', (e) => {
    e.preventDefault()
    const raw = String(new FormData(e.target as HTMLFormElement).get('code') ?? '')
    const code = extractLicenceCode(raw)
    el.querySelector('[data-err="old"]')!.textContent = code ? '' : "That isn't a licence code."
    if (code) void renderResult(result, code)
  })
}

async function renderResult(box: HTMLElement, code: string): Promise<void> {
  const url = `${location.origin}/start?code=${code}`
  box.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0">2. The licence</h2>
      <p class="warn">Anyone with this code can open the save, so keep it on the card and off group chats.</p>
      <p>Code: <code>${esc(code)}</code></p>
      <p>Start link (for the NFC tag and the Shortcut):</p>
      <span class="url">${esc(url)}</span>
      <div class="row">
        <button class="toy small" data-copy>Copy link</button>
        <a class="toy small yellow" href="${esc(url)}" style="text-decoration:none">Try it now</a>
        <button class="toy small" data-print>Print QR</button>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">3. QR for his iPad</h2>
      <div class="qr-wrap"><canvas data-qr></canvas>
        <ol>
          <li>Print this QR about 2.5 cm wide and stick it on the back of the card, under the clear sleeve.</li>
          <li>On his iPad, open the game in Safari, tap Share → <b>Add to Home Screen</b>.</li>
          <li>Open it from the home screen and allow the camera. It opens on the Licence Check: he holds the card up to the front camera.</li>
        </ol>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">4. NFC sticker for phones</h2>
      <ol>
        <li>Put an NTAG215 sticker on the back of the card, under the sleeve.</li>
        <li>In the free <b>NFC Tools</b> app: Write → Add a record → URL → paste the start link → Write, and hold the card to the phone.
          Now any iPhone shows a banner that opens the game with one tap.</li>
        <li><b>One tap, nothing else (each iPhone, once):</b> Shortcuts → Automation → <b>+</b> → NFC → Scan, and tap the card →
          choose <b>Run Immediately</b> → New Blank Automation → add <b>Open URLs</b> → paste the start link → Done.</li>
        <li>Android: nothing to set up. Tapping the card opens the link, and the Licence Check has a <b>Tap card</b> button in Chrome.</li>
      </ol>
    </div>
    <div class="print-only"><canvas data-qr-print></canvas></div>`
  const opts = { errorCorrectionLevel: 'L' as const, margin: 2, scale: 8, color: { dark: '#000000', light: '#ffffff' } }
  await QRCode.toCanvas(box.querySelector<HTMLCanvasElement>('[data-qr]')!, url, opts)
  await QRCode.toCanvas(box.querySelector<HTMLCanvasElement>('[data-qr-print]')!, url, opts)
  box.querySelector('[data-copy]')!.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement
    try {
      await navigator.clipboard.writeText(url)
      b.textContent = 'Copied ✓'
    } catch {
      b.textContent = 'Select the link above'
    }
  })
  box.querySelector('[data-print]')!.addEventListener('click', () => window.print())
  box.scrollIntoView({ behavior: 'smooth' })
}
