// Lists or replaces every spoken/visible text in a lesson, by path, for rewriting lessons quickly.
//   node scripts/lesson-text.mjs dump <id>             print "path<TAB>text" for each line
//   node scripts/lesson-text.mjs apply <id> <file.json> set texts from {"path": "new text"}
// Formatting of the lesson file is kept: only the matching string values are replaced.
import { readFileSync, writeFileSync } from 'node:fs'

const [cmd, id, file] = process.argv.slice(2)
const path = `content/lessons/${id}.json`
const raw = readFileSync(path, 'utf8')
const lesson = JSON.parse(raw)
const KEYS = new Set(['text', 'prompt', 'onRight', 'reveal', 'say', 'hint', 'narration', 'ask', 'spoken', 'label', 'title', 'handsOn', 'goodAnswer'])
const out = []
function walk(v, p) {
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${p}[${i}]`))
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    if (k.startsWith('_') || k === 'thumb' || k === 'scene' || k === 'animation' || k === 'revealAnimation') continue
    const q = p ? `${p}.${k}` : k
    if (typeof x === 'string' && KEYS.has(k)) out.push([q, x])
    else walk(x, q)
  }
}
walk(lesson, '')
if (cmd === 'dump') {
  for (const [p, t] of out) console.log(`${p}\t${t}`)
} else if (cmd === 'apply') {
  const edits = JSON.parse(readFileSync(file, 'utf8'))
  const get = (o, p) => p.split(/\.|\[|\]/).filter(Boolean).reduce((a, k) => a?.[k], o)
  const set = (o, p, val) => {
    const ks = p.split(/\.|\[|\]/).filter(Boolean)
    const last = ks.pop()
    const parent = ks.reduce((a, k) => a[k], o)
    parent[last] = val
  }
  let text = raw
  let n = 0
  for (const [p, val] of Object.entries(edits)) {
    const old = get(lesson, p)
    if (typeof old !== 'string') { console.error(`no text at ${p}`); process.exitCode = 1; continue }
    const enc = (s) => JSON.stringify(s)
    const i = text.indexOf(enc(old))
    if (i < 0) { console.error(`could not find ${p}`); process.exitCode = 1; continue }
    text = text.slice(0, i) + enc(val) + text.slice(i + enc(old).length)
    set(lesson, p, val)
    n++
  }
  JSON.parse(text)
  writeFileSync(path, text)
  console.log(`${id}: ${n} texts replaced`)
}
