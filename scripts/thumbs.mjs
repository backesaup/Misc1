// Captures a cover picture for every lesson: plays the lesson to its `thumb.step` and saves the
// scene (no captions or buttons) to src/assets/thumbs/<id>.jpg. The Thumb component adds the big
// words and Steve on top, so the text stays sharp and easy to change.
//   npm run dev                              (in another terminal)
//   node scripts/thumbs.mjs [base-url] [lesson-id …]
// In this cloud container set CHROMIUM_PATH=/opt/pw-browsers/chromium.
import { chromium } from 'playwright'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [base = 'http://127.0.0.1:5173', ...only] = process.argv.slice(2)
const out = join(root, 'src/assets/thumbs')
mkdirSync(out, { recursive: true })
const lessons = readdirSync(join(root, 'content/lessons'))
  .map((f) => JSON.parse(readFileSync(join(root, 'content/lessons', f), 'utf8')))
  .filter((l) => !only.length || only.includes(l.id))

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
async function shoot(l) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 860 }, deviceScaleFactor: 1 })
  await page.addInitScript(() => {
    try {
      localStorage.setItem('blockwise:settings', JSON.stringify({ showDrafts: true, sounds: false }))
    } catch { /* about:blank */ }
  })
  const step = l.thumb?.step ?? 0
  await page.goto(`${base}/#/lesson/${l.id}?step=${step}`)
  await page.waitForTimeout(1500)
  await page.locator('[aria-label="Play"]').first().click()
  await page.addStyleTag({ content: '.steve-avatar,.caption,.stage-label,.scene-counter,.make-label,.scene-tag{display:none!important}' })
  await page.waitForTimeout(l.thumb?.wait ?? 6500)
  const stage = page.locator('.stage').first()
  await stage.screenshot({ path: join(out, `${l.id}.jpg`), type: 'jpeg', quality: 72 })
  await page.close()
  console.log('✓', l.id)
}
const queue = [...lessons]
await Promise.all(Array.from({ length: 3 }, async () => { for (let l; (l = queue.shift()); ) await shoot(l).catch((e) => console.log('✗', l.id, e.message.split('\n')[0])) }))
await browser.close()
