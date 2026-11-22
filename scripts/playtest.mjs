// iPad playtest: walks through the app like Ismaeel would, screenshots each screen at iPad
// size, audits tap targets (< 64 pt) and horizontal overflow, and records errors.
//   node scripts/playtest.mjs [baseUrl] [outDir] [portrait|landscape]
import { chromium, devices } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const base = process.argv[2] ?? 'http://127.0.0.1:5173'
const out = process.argv[3] ?? 'playtest'
const orient = process.argv[4] ?? 'portrait'
mkdirSync(out, { recursive: true })
const ipad = devices['iPad (gen 7)']
const viewport = orient === 'landscape' ? { width: ipad.viewport.height, height: ipad.viewport.width } : ipad.viewport
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const ctx = await browser.newContext({ ...ipad, viewport, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const issues = []
const errors = []
page.on('console', (m) => m.type() === 'error' && !/GPU stall|GL Driver/.test(m.text()) && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
await page.addInitScript(() => {
  // instant narration so the walk-through doesn't wait on speech
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () { const el = this; const p = play.call(el); p.then(() => setTimeout(() => el.dispatchEvent(new Event('ended')), 40)).catch(() => {}); return p }
  if ('speechSynthesis' in window) window.speechSynthesis.speak = (u) => void setTimeout(() => u.onend?.(new Event('end')), 40)
})

let n = 0
async function shot(name, note) {
  const file = `${out}/${String(++n).padStart(2, '0')}-${orient}-${name}.png`
  await page.screenshot({ path: file })
  // audit: tap targets and overflow on this screen
  const audit = await page.evaluate(() => {
    const small = []
    for (const el of document.querySelectorAll('button, a, [role=radio], label.ask-big, input')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const st = getComputedStyle(el)
      if (st.visibility === 'hidden' || st.display === 'none' || el.closest('[hidden]')) continue
      if (r.width < 63.5 || r.height < 63.5) small.push(`${el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.className} (${Math.round(r.width)}×${Math.round(r.height)})`)
    }
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 1
    return { small, overflow }
  })
  if (audit.small.length) issues.push({ screen: name, kind: 'small tap target', detail: audit.small.join('; ') })
  if (audit.overflow) issues.push({ screen: name, kind: 'horizontal overflow', detail: 'page scrolls sideways' })
  if (note) issues.push({ screen: name, kind: 'note', detail: note })
}
const open = async (path, wait = 2000) => { await page.goto('about:blank'); await page.goto(base + path); await page.waitForTimeout(wait) }
const tap = async (sel, wait = 800) => { await page.locator(sel).first().tap(); await page.waitForTimeout(wait) }
const next = async (wait = 2500) => { await page.locator('.dock-btn.next:not([disabled])').waitFor({ timeout: 30000 }); await tap('.dock-btn.next', wait) }

// first open
await page.goto(base + '/')
await page.waitForTimeout(3500)
await shot('home')
await tap('button:has-text("Maths shorts")', 2000)
await shot('section-maths')
await tap('.card', 2500)
await shot('lesson-intro')
await tap('.play-big', 6000)
await shot('lesson-hook')
await next(); await next()
await shot('lesson-explain')
await next(2500)
// a question, answered wrong first
await page.locator('.choice:not([disabled])').first().waitFor({ timeout: 30000 })
await shot('question')
await tap('.choice >> nth=0', 2500)
await shot('question-after-hint')
await tap('.choice >> nth=2', 6000)
await shot('question-reexplained')
// jump to the end of a lesson
await open('/#/lesson/stack-64?step=12')
await tap('.play-big', 4000)
await shot('lesson-say-rule')
await tap('.show-rule', 6000)
await shot('lesson-end')
if (await page.locator('.talk-btn').count()) { await tap('.talk-btn', 800); await shot('talk-card'); await tap('.talk-sheet .icon-btn', 500) }
// disco
await open('/#/lesson/disco?step=8')
await tap('.play-big', 5000)
await shot('disco-explore')
// farm: naming
await open('/#/game', 3000)
await tap('.play-big', 2500)
await shot('farm-name-robot')
if (await page.locator('.name-card input').count()) {
  await page.locator('.name-card input').fill('Bolt')
  await tap('.name-card button[type=submit]', 2500)
  await shot('farm-colour')
  await tap('.name-card .swatch >> nth=1', 2500)
  await page.locator('.name-card input').fill('Sunny Farm')
  await tap('.name-card button[type=submit]', 4000)
  await shot('farm-bed')
}
// sandbox, ask, parent
await open('/#/play', 2500)
const box = await page.locator('.sandbox canvas').boundingBox()
for (const [fx, fy] of [[0.5, 0.6], [0.5, 0.6], [0.55, 0.62]]) { await page.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(400) }
await shot('sandbox')
await open('/#/ask', 1500)
await tap('.ask-big.type', 600)
await shot('ask')
await open('/#/parent', 1500)
await shot('parent')

writeFileSync(`${out}/issues-${orient}.json`, JSON.stringify({ issues, errors: [...new Set(errors)] }, null, 2))
console.log(JSON.stringify({ issues, errors: [...new Set(errors)] }, null, 2))
await browser.close()
