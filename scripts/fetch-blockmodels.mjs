// Downloads Java block models (Minecraft and mods: Create, Farmer's Delight, MrCrayfish's Furniture)
// listed in content/textures.json `blockModels`, follows each model's `parent` chain, and saves one
// flattened file per model (elements + texture paths) into src/assets/textures/blockmodels/, with its
// textures in blockmodels/tex/. Gitignored like the other fetched art. Run by fetch-textures.mjs.
//   node scripts/fetch-blockmodels.mjs [--force] [--soft]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'content/textures.json'), 'utf8'))
const force = process.argv.includes('--force')
const soft = process.argv.includes('--soft')
const outDir = join(root, 'src/assets/textures/blockmodels')
const NS = manifest.namespaces ?? {}

const cache = new Map()
async function getFile(ns, rel, binary = false) {
  const key = `${ns}:${rel}:${binary}`
  if (cache.has(key)) return cache.get(key)
  const n = NS[ns]
  let result = null
  if (n) {
    for (const r of n.roots) {
      const res = await fetch(`https://raw.githubusercontent.com/${n.repo}/${n.branch}/${r}/${rel}`).catch(() => null)
      if (res?.ok) {
        result = binary ? Buffer.from(await res.arrayBuffer()) : await res.text()
        break
      }
    }
  }
  cache.set(key, result)
  return result
}
const split = (id, fallbackNs) => (id.includes(':') ? id.split(':') : [fallbackNs, id])

/** Model json with parents merged: elements from the nearest model that has them, textures child-first. */
async function resolveModel(id, ns = 'minecraft', depth = 0) {
  const [mns, path] = split(id, ns)
  if (path.startsWith('builtin/') || depth > 12) return { elements: null, textures: {} }
  const text = await getFile(mns, `models/${path}.json`)
  if (!text) throw new Error(`model ${mns}:${path} not found`)
  const json = JSON.parse(text)
  // ids without a namespace mean minecraft:, as in the game
  const parent = json.parent ? await resolveModel(json.parent, 'minecraft', depth + 1) : { elements: null, textures: {} }
  const textures = { ...parent.textures }
  for (const [k, v] of Object.entries(json.textures ?? {})) textures[k] = v.includes(':') || v.startsWith('#') ? v : `minecraft:${v}`
  return { elements: json.elements ?? parent.elements, textures }
}

let ok = 0, kept = 0
const failed = []
for (const [key, entry] of Object.entries(manifest.blockModels ?? {})) {
  const out = join(outDir, `${key}.json`)
  if (existsSync(out) && !force) { kept++; continue }
  try {
    const m = await resolveModel(entry.model)
    if (!m.elements) throw new Error('no elements')
    const textures = { ...m.textures, ...(entry.textures ?? {}) }
    // follow #references
    const resolve = (v, n = 0) => (v?.startsWith('#') && n < 8 ? resolve(textures[v.slice(1)], n + 1) : v)
    const files = {}
    for (const k of Object.keys(textures)) {
      const id = resolve(textures[k])
      if (!id || id.startsWith('#')) continue
      const [tns, tpath] = split(id, 'minecraft')
      const file = `tex/${tns}__${tpath.replace(/\//g, '__')}.png`
      if (!existsSync(join(outDir, file)) || force) {
        const png = await getFile(tns, `textures/${tpath}.png`, true)
        if (!png) throw new Error(`texture ${id} not found`)
        mkdirSync(dirname(join(outDir, file)), { recursive: true })
        writeFileSync(join(outDir, file), png)
      }
      files[k] = file
    }
    mkdirSync(outDir, { recursive: true })
    writeFileSync(out, JSON.stringify({ model: entry.model, elements: m.elements, textures: files }))
    console.log(`✓ ${key.padEnd(24)} ← ${entry.model}`)
    ok++
  } catch (e) {
    failed.push(`${key} (${e.message})`)
  }
}
console.log(`\nblock models: ${ok} fetched, ${kept} already present, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`)
if (failed.length && !soft) process.exitCode = 1
