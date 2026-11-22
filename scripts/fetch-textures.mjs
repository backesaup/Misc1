// Downloads the block textures listed in content/textures.json into src/assets/textures/.
// Each block tries its candidates in order (e.g. Bedrock sample pack first, then Java assets).
//   node scripts/fetch-textures.mjs            fetch missing files
//   node scripts/fetch-textures.mjs --force    re-download everything
//   node scripts/fetch-textures.mjs --soft     never fail (used by `npm run build`: offline builds keep the built-in looks)
// The files are gitignored: they are Mojang's or mod authors' art, kept out of the repo.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'content/textures.json'), 'utf8'))
const force = process.argv.includes('--force')
const soft = process.argv.includes('--soft')

const url = (sourceId, path) => {
  const s = manifest.sources[sourceId]
  if (!s) throw new Error(`unknown source "${sourceId}"`)
  return `https://raw.githubusercontent.com/${s.repo}/${s.branch}/${s.base ? s.base + '/' : ''}${path}`
}

let got = 0, kept = 0, failed = []
const entries = ['blocks', 'skins', 'items', 'mobs'].flatMap((g) => Object.entries(manifest[g] ?? {}))
// a 3D model is two files: its geometry and its texture
for (const [key, m] of Object.entries(manifest.models ?? {})) entries.push([`${key} (model)`, m.geo], [`${key} (texture)`, m.texture], ...(m.overlay ? [[`${key} (overlay)`, m.overlay]] : []))
for (const [key, entry] of entries) {
  const out = join(root, 'src/assets/textures', entry.file)
  if (existsSync(out) && !force) { kept++; continue }
  let ok = false
  for (const cand of entry.from) {
    const [src, ...rest] = cand.split(':')
    const res = await fetch(url(src, rest.join(':'))).catch(() => null)
    if (res?.ok) {
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, Buffer.from(await res.arrayBuffer()))
      console.log(`✓ ${key.padEnd(24)} ← ${cand}`)
      ok = true
      got++
      break
    }
  }
  if (!ok) failed.push(key)
}
console.log(`\n${got} downloaded, ${kept} already present, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`)
if (failed.length && !soft) process.exitCode = 1
