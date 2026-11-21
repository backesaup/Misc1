import { test, expect, type Page } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'content/lessons')
const lessons = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))

const allowFallback = process.env.ALLOW_TTS_FALLBACK === '1'
const IGNORE = [/GPU stall/, /THREE\.Clock/, /WebGL/, /GL Driver/]

function watch(page: Page) {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORE.some((r) => r.test(m.text()))) problems.push(`console: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (/^https?:$/.test(u.protocol) && u.hostname !== '127.0.0.1') problems.push(`external request: ${r.url()}`)
  })
  return problems
}

/** Plays a lesson start to finish, answering every question correctly after one wrong try. */
async function playThrough(page: Page, lesson: { id: string; steps: unknown[] }) {
  // Make narration instant so the test is quick: end every audio/speech as soon as it starts.
  await page.addInitScript(() => {
    localStorage.setItem('blockwise:settings', JSON.stringify({ showDrafts: true, sounds: false }))
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      const el = this
      const p = play.call(el)
      p.then(() => setTimeout(() => el.dispatchEvent(new Event('ended')), 30)).catch(() => {})
      return p
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => void setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 30)
    }
  })
  await page.goto(`/#/lesson/${lesson.id}`)
  await page.getByRole('button', { name: 'Play' }).click()
  for (let guard = 0; guard < 400; guard++) {
    const main = page.locator('main.player')
    if (await page.getByRole('button', { name: 'Show the rule' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Show the rule' }).click()
      await expect(page.locator('.end-dock[data-ready]')).toBeVisible({ timeout: 20_000 })
      return
    }
    const choices = page.locator('.choice:not([disabled])')
    if ((await choices.count()) > 0) {
      await choices.first().click()
      await page.waitForTimeout(200)
      continue
    }
    const parts = page.locator('.part-btn')
    if ((await parts.count()) > 0 && !(await main.getAttribute('data-ready'))) await parts.first().click()
    const next = page.locator('.dock-btn.next:not([disabled])')
    if (await next.isVisible().catch(() => false)) await next.click()
    await page.waitForTimeout(250)
  }
  await page.screenshot({ path: 'test-results/stuck-' + lesson.id + '.png' })
  const at = await page.locator('main.player').getAttribute('data-step', { timeout: 2000 }).catch((e) => String(e).slice(0, 120))
  const ready = await page.locator('main.player').getAttribute('data-ready').catch(() => '?')
  throw new Error(`lesson did not reach its end (stuck at step "${at}", ready=${ready})`)
}

for (const lesson of lessons) {
  test(`${lesson.id} plays start to finish`, async ({ page }) => {
    const problems = watch(page)
    await playThrough(page, lesson)
    const fallbacks = await page.evaluate(() => window.__narration?.fallbacks ?? [])
    if (!allowFallback) expect(fallbacks, 'narration lines without an audio file (run scripts/generate-audio.py)').toEqual([])
    expect(problems).toEqual([])
  })
}

test('home, sections, sandbox, farm and ask open without errors', async ({ page }) => {
  const problems = watch(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Hi/ })).toBeVisible()
  for (const name of ["How it's really made", 'Build it', 'Maths shorts']) {
    await page.getByRole('button', { name }).click()
    await expect(page.locator('main.section')).toBeVisible()
    await page.getByRole('button', { name: 'Home' }).click()
  }
  await page.getByRole('button', { name: 'Free build' }).click()
  await expect(page.locator('.sandbox canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByRole('button', { name: 'Farm' }).click()
  await expect(page.locator('.farm canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByRole('button', { name: 'Ask' }).click()
  await expect(page.getByRole('heading', { name: 'What do you want to learn?' })).toBeVisible()
  expect(problems).toEqual([])
})
