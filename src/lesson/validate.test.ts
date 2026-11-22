import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateLesson, validateLibrary, BANNED } from './validate'
import { sceneCatalog } from '@/scenes/catalog'
import type { Lesson } from './types'

const dir = join(__dirname, '../../content/lessons')
const lessons: Lesson[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
const known: string[] = JSON.parse(readFileSync(join(__dirname, '../../content/known.json'), 'utf8')).terms

describe('lessons', () => {
  it('there are lessons', () => expect(lessons.length).toBeGreaterThan(0))
  for (const l of lessons)
    it(`${l.id} follows the lesson rules`, () => {
      expect(validateLesson(l, sceneCatalog)).toEqual([])
    })
  it('every assumed word is known or taught by a required lesson (glossary)', () => {
    expect(validateLibrary(lessons, known)).toEqual([])
  })
})

describe('validator', () => {
  const base: Lesson = {
    id: 'x',
    section: 'maths',
    title: 'X',
    talk: [{ ask: 'a', goodAnswer: 'b' }],
    handsOn: 'Try it.',
    thumb: { text: 'WHY?' },
    steps: [
      { id: 'a', scene: { type: 'voxel', preset: 'blocks64' }, narration: { text: 'Hello.' } },
      { id: 'q', question: { prompt: 'P?', choices: ['1', '2'], answer: 0, reveal: 'R.', wrong: { '1': { mistake: 'm', hint: 'h', say: 's' } } } },
      { id: 'r', kind: 'rule', rule: { text: 'Rule' } },
    ],
  }
  it('accepts a minimal good lesson', () => expect(validateLesson(base, sceneCatalog)).toEqual([]))
  it('needs a short cover caption', () => {
    expect(validateLesson({ ...base, thumb: undefined }, sceneCatalog).join()).toMatch(/thumb/)
    expect(validateLesson({ ...base, thumb: { text: 'one two three four' } }, sceneCatalog).join()).toMatch(/3 words/)
  })
  it('needs a guess', () => {
    const l = { ...base, steps: [base.steps[0], base.steps[2]] }
    expect(validateLesson(l, sceneCatalog).join()).toMatch(/at least one guess/)
  })
  it('needs every wrong choice to name a misunderstanding', () => {
    const l = structuredClone(base)
    ;(l.steps[1] as { question: { wrong: object } }).question.wrong = {}
    expect(validateLesson(l, sceneCatalog).join()).toMatch(/named misunderstanding/)
  })
  it('needs a closing rule last', () => {
    const l = { ...base, steps: [base.steps[0], base.steps[1]] }
    expect(validateLesson(l, sceneCatalog).join()).toMatch(/closing rule/)
  })
  it('rejects unknown scene actions', () => {
    const l = structuredClone(base)
    l.steps[0].animation = [{ at: 0, action: 'teleport' }]
    expect(validateLesson(l, sceneCatalog).join()).toMatch(/no action "teleport"/)
  })
  it('drafts are required when facts are unverified', () => {
    expect(validateLesson({ ...base, verify: ['x'] }, sceneCatalog).join()).toMatch(/draft/)
  })
  it('flags banned words', () => {
    expect(BANNED.test('It is simply 64.')).toBe(true)
    expect(BANNED.test('Great job, superstar!')).toBe(true)
    expect(BANNED.test('Does that make sense?')).toBe(true)
    expect(BANNED.test('8 rows of 8 makes 64.')).toBe(false)
  })
  it('catches assumed words nobody taught', () => {
    expect(validateLibrary([{ ...base, assumes: ['perimeter'] }], ['counting']).join()).toMatch(/perimeter/)
  })
})
