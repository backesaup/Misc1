// Renders the app icon SVG to the PNG sizes iOS and the manifest need.
// Run: node scripts/make-icons.mjs
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage()
for (const [name, size, pad] of [['apple-touch-icon.png', 180, 0], ['pwa-192.png', 192, 0], ['pwa-512.png', 512, 0]]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:#f3ead8">${svg.replace('<svg', `<svg width="${size}" height="${size}" style="display:block;padding:${pad}px"`)}</body></html>`)
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname, omitBackground: false })
  console.log('wrote', name)
}
await browser.close()
