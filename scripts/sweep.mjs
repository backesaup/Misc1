// Error sweep: opens every lesson at several steps (start, middle, end) on an iPad-sized
// viewport, taps Play, and reports page errors and console errors.
//   node scripts/sweep.mjs [baseUrl]
import { chromium } from 'playwright'
import { readdirSync, readFileSync } from 'node:fs'
const base = process.argv[2] ?? 'http://127.0.0.1:5173'
const lessons = readdirSync('content/lessons').filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync('content/lessons/' + f, 'utf8')))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 810, height: 1080 }, hasTouch: true })
await page.addInitScript(() => localStorage.setItem('blockwise:settings', JSON.stringify({ showDrafts: true, sounds: false })))
let current = ''
const problems = []
page.on('pageerror', (e) => problems.push(`${current}: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && !/GPU stall|GL Driver|precision|WebGL/.test(m.text()) && problems.push(`${current}: console ${m.text().slice(0, 160)}`))
for (const l of lessons) {
  const n = l.steps.length
  for (const step of [...new Set([0, Math.floor(n / 2), n - 2])]) {
    current = `${l.id}@${step}`
    await page.goto('about:blank')
    await page.goto(`${base}/#/lesson/${l.id}?step=${step}`)
    await page.waitForTimeout(900)
    const play = page.locator('.play-big')
    if (await play.count()) await play.tap().catch(() => play.click())
    await page.waitForTimeout(1600)
    const choice = page.locator('.choice:not([disabled])').first()
    if (await choice.count()) await choice.click().catch(() => {})
    const hammer = page.locator('.dial-take:not([disabled])').first()
    if (await hammer.count()) await hammer.click().catch(() => {})
    await page.waitForTimeout(900)
  }
}
console.log(problems.length ? problems.join('\n') : `swept ${lessons.length} lessons: no errors`)
await browser.close()
