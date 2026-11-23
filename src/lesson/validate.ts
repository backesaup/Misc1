import type { Cue, Lesson, Question, Step } from './types.ts'
import { allLessonLines, stepLines } from './lines.ts'
import { stepKind } from './types.ts'

export interface SceneCatalog {
  /** scene type -> preset -> list of action names it supports */
  [type: string]: { [preset: string]: string[] }
}

/**
 * Checks a lesson against the brief's "definition of done" rules that can be
 * checked from data alone. Returns a list of problems (empty = fine).
 */
export function validateLesson(lesson: Lesson, catalog?: SceneCatalog): string[] {
  const errs: string[] = []
  const at = (s: Step | undefined, msg: string) => errs.push(`${lesson.id}${s ? `/${s.id}` : ''}: ${msg}`)

  if (!lesson.id || !/^[a-z0-9-]+$/.test(lesson.id)) at(undefined, 'id must be kebab-case')
  if (!['made', 'build', 'maths', 'science'].includes(lesson.section)) at(undefined, `unknown section "${lesson.section}"`)
  if (!lesson.steps?.length) at(undefined, 'has no steps')
  if (lesson.verify?.length && lesson.status !== 'draft')
    at(undefined, 'has unverified facts, so it must be marked "status": "draft"')

  const ids = new Set<string>()
  let questions = 0
  let currentScene: string | undefined
  lesson.steps.forEach((step, i) => {
    if (ids.has(step.id)) at(step, 'duplicate step id')
    ids.add(step.id)
    const kind = stepKind(step)
    if (i === 0 && !step.scene && kind !== 'rule') at(step, 'first step needs a scene')
    if (step.scene) currentScene = `${step.scene.type}:${step.scene.preset}`

    const checkCues = (cues: Cue[] | undefined, where: string) => {
      if (!cues || !catalog || !currentScene) return
      const [type, preset] = currentScene.split(':')
      const actions = catalog[type]?.[preset]
      if (!actions) return at(step, `unknown scene ${currentScene}`)
      for (const c of cues) {
        if (!actions.includes(c.action)) at(step, `${where}: scene ${currentScene} has no action "${c.action}"`)
        if (typeof c.at !== 'number' || c.at < 0) at(step, `${where}: cue "${c.action}" needs a time "at" >= 0`)
      }
    }
    checkCues(step.animation, 'animation')

    if (kind === 'question' && 'question' in step) {
      questions++
      checkQuestion(step.question, (m) => at(step, m))
      if (step.question.retry) checkQuestion(step.question.retry, (m) => at(step, `retry: ${m}`))
      checkCues(step.question.revealAnimation, 'revealAnimation')
    }
    if (kind === 'explore' && 'parts' in step && !step.parts.length) at(step, 'explore step needs parts')
    if (kind === 'make' && 'make' in step) {
      if (step.scene) currentScene = `${step.scene.type}:${step.scene.preset}`
      questions++ // an open challenge counts as his prediction-and-test
      const m = step.make
      if (!['rows', 'pairs', 'split', 'tens', 'share', 'stairs', 'square', 'groups', 'line', 'balance', 'every', 'cut', 'coins', 'sides'].includes(m.mode)) at(step, `unknown make mode "${m.mode}"`)
      if (!(m.total > 0 && m.total <= 100)) at(step, 'make.total must be 1–100 (stairs/square: the most blocks needed)')
      if (m.mode === 'share' && !(m.extra && m.extra > 0)) at(step, 'share needs extra (how many friends)')
      const needs = ({ balance: 'diagram:balance', every: 'diagram:grid', cut: 'diagram:fraction', coins: 'diagram:coins', sides: 'diagram:shapes' } as Record<string, string>)[m.mode] ?? 'voxel:arrange'
      if (currentScene !== needs) at(step, `make mode ${m.mode} needs the ${needs} scene`)
    }
    if (kind === 'build' && 'blocks' in step) {
      for (const b of step.blocks) if (!(b.count > 0)) at(step, `block "${b.block}" needs a count`)
    }
    if (kind === 'rule' && i !== lesson.steps.length - 1) at(step, 'the rule must be the last step')
  })

  if (questions < 1) at(undefined, 'needs at least one guess')
  if (!lesson.talk?.length) at(undefined, 'needs a "talk" card for a grown-up (questions + what a good answer includes)')
  if (!lesson.handsOn?.trim()) at(undefined, 'needs a "handsOn" real-world challenge')
  if (!lesson.thumb?.text?.trim()) at(undefined, 'needs a "thumb" cover: a few big words (see docs/LESSON_DIRECTION.md)')
  else if (lesson.thumb.text.split(/\s+/).length > 3) at(undefined, 'thumb text must be 3 words or fewer')
  if (lesson.bonus) checkQuestion(lesson.bonus, (m) => at(undefined, `bonus: ${m}`))

  // Voice rules from the lesson direction brief: no baby talk, empty praise or skipped steps.
  for (const l of allLessonLines(lesson)) {
    const hit = l.text.match(BANNED)
    if (hit) at(undefined, `line "${l.key}" uses "${hit[0]}" (see docs/LESSON_DIRECTION.md)`)
  }
  // Never use a word before it's explained: a step's term may not appear in any earlier step.
  lesson.steps.forEach((step, i) => {
    if (!step.term) return
    const esc = step.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const word = new RegExp(`\\b${esc}s?\\b`, 'i')
    for (const prev of lesson.steps.slice(0, i))
      for (const l of Object.values(stepLines(lesson.id, prev)))
        if (word.test(l.text)) at(step, `"${step.term}" is used in "${l.key}" before this step explains it`)
  })
  const last = lesson.steps[lesson.steps.length - 1]
  if (!last || stepKind(last) !== 'rule') at(undefined, 'must end with a closing rule')
  return errs
}

/** Words that signal a skipped step or empty praise. */
export const BANNED =
  /\b(just|simply|obviously|of course|super|superstar|genius|so smart|you're smart|clever|great job|good job|well done, superstar|wow\w*|easy peasy|does that make sense)\b/i

function checkQuestion(q: Pick<Question, 'choices' | 'answer' | 'wrong' | 'onWrong' | 'reveal' | 'open'>, err: (m: string) => void) {
  if (q.choices.length < 2 || q.choices.length > 4) err('needs 2 to 4 choices')
  if (q.answer < 0 || q.answer >= q.choices.length) err('answer is not one of the choices')
  if (!q.reveal?.trim()) err('needs a reveal line')
  if (q.open) return // an estimate: every answer is fine
  q.choices.forEach((c, i) => {
    if (i === q.answer) return
    const m = q.wrong?.[String(i)]
    if (!m) err(`wrong choice "${c}" needs a named misunderstanding (wrong.${i}: { mistake, say })`)
    else if (!m.mistake?.trim() || !m.say?.trim() || !m.hint?.trim()) err(`wrong choice "${c}" needs "mistake", "hint" and "say"`)
  })
}

/** Terms a lesson teaches: one per step, at most. */
export const termsTaught = (l: Lesson) => l.steps.map((s) => s.term).filter((t): t is string => !!t)

/**
 * Checks the glossary across all lessons: every assumed word must be known
 * already (content/known.json) or taught by a lesson this one requires.
 */
export function validateLibrary(lessons: Lesson[], known: string[]): string[] {
  const errs: string[] = []
  const byId = new Map(lessons.map((l) => [l.id, l]))
  const norm = (t: string) => t.trim().toLowerCase()
  for (const l of lessons) {
    const available = new Set(known.map(norm))
    const seen = new Set<string>()
    const walk = (id: string) => {
      if (seen.has(id)) return
      seen.add(id)
      const dep = byId.get(id)
      if (!dep) return errs.push(`${l.id}: requires unknown lesson "${id}"`)
      termsTaught(dep).forEach((t) => available.add(norm(t)))
      dep.requires?.forEach(walk)
    }
    l.requires?.forEach(walk)
    for (const t of l.assumes ?? []) if (!available.has(norm(t))) errs.push(`${l.id}: assumes "${t}", which is not known yet and no required lesson teaches it`)
    const mine = termsTaught(l).map(norm)
    const dup = mine.find((t, i) => mine.indexOf(t) !== i)
    if (dup) errs.push(`${l.id}: teaches "${dup}" twice`)
  }
  return errs
}
