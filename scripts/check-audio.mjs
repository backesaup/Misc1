// Fails if any narration line has no up-to-date audio file.
// Run before deploying: node scripts/check-audio.mjs
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { lines } = JSON.parse(execFileSync(process.execPath, [join(root, 'scripts/list-lines.ts')], { encoding: 'utf8' }))
const missing = [], stale = []
for (const l of lines) {
  const mp3 = join(root, 'public', l.audio)
  const hashFile = mp3.replace(/\.mp3$/, '.hash')
  const want = createHash('sha256').update(l.hashInput).digest('hex')
  if (!existsSync(mp3) || !existsSync(hashFile)) missing.push(l.key)
  else if (readFileSync(hashFile, 'utf8').trim() !== want) stale.push(l.key)
}
const ok = lines.length - missing.length - stale.length
console.log(`${ok} of ${lines.length} narration lines are recorded and up to date.`)
if (missing.length) console.log(`Missing (${missing.length}):\n  ${missing.join('\n  ')}`)
if (stale.length) console.log(`Out of date (${stale.length}):\n  ${stale.join('\n  ')}`)
if (missing.length || stale.length) {
  console.log('\nRun `python scripts/generate-audio.py` on the laptop to record them.')
  process.exitCode = 1
}
