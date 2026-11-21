// Prints every spoken line in the app as JSON: [{ key, text, audio }].
// generate-audio.py and check-audio.mjs both use this, so naming lives in one place
// (src/lesson/lines.ts). Run: node scripts/list-lines.ts
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allLessonLines, allPuzzleLines, commonLines, VOICE, SPEED, type PuzzleLines } from '../src/lesson/lines.ts'
import type { Lesson } from '../src/lesson/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'content/lessons')
const lessons: Lesson[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))

const pdir = join(root, 'content/puzzles')
const puzzles: PuzzleLines[] = readdirSync(pdir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(pdir, f), 'utf8')))
const lines = [...commonLines(), ...lessons.flatMap(allLessonLines), ...puzzles.flatMap(allPuzzleLines)]
const seen = new Set<string>()
const unique = lines.filter((l) => (seen.has(l.audio) ? false : (seen.add(l.audio), true)))
process.stdout.write(JSON.stringify({ voice: VOICE, speed: SPEED, lines: unique }, null, 2))
