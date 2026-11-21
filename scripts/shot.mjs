import { chromium } from 'playwright'
const [,, url, out, w = '820', h = '1180', wait = '2500', clicks = ''] = process.argv
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
const errs = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 200)) })
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
page.on('request', (r) => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) errs.push('EXTERNAL: ' + r.url()) })
if (process.env.SHOT_INIT) await page.addInitScript((kv) => { for (const [k, v] of Object.entries(JSON.parse(kv))) localStorage.setItem(k, v) }, process.env.SHOT_INIT)
await page.goto(url)
await page.waitForTimeout(+wait)
for (const c of clicks.split('|').filter(Boolean)) {
  const [sel, ms] = c.split('@')
  if (sel.startsWith('=')) { await page.screenshot({ path: out.replace(/\.png$/, `-${sel.slice(1)}.png`) }); continue }
  if (sel.startsWith('wait')) { await page.waitForTimeout(+(ms || 1000)); continue }
  await page.locator(sel).first().click()
  await page.waitForTimeout(+(ms || 1500))
}
await page.screenshot({ path: out })
console.log(errs.slice(0, 15).join('\n') || 'no errors')
await browser.close()
