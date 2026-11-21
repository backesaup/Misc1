import type { Lesson, Question, QuestionStep, Step } from './types.ts'
import { learner } from '../config.ts'
import { stepKind } from './types.ts'

/**
 * Every spoken line in the app, with the audio file it plays.
 * scripts/generate-audio.py and the audio check both mirror these rules, so
 * keep the naming here and there in sync (see scripts/lines.mjs).
 */
/** Narration voice settings. The hash of voice|speed|text marks each file as up to date. */
export const VOICE = 'bm_lewis'
export const SPEED = 0.9
export const hashInput = (text: string) => `${VOICE}|${SPEED}|${text}`

export interface SpokenLine {
  key: string
  text: string
  audio: string
}

export const COMMON_LINES: Record<string, string> = {
  'lets-see': "Let's see what happened.",
  'say-rule': 'Can you say the rule out loud? Try it, then tap the eye to check.',
  'bonus-intro': 'Here is a bonus challenge. It goes one step further, so take your time.',
  'try-similar': 'Now try one like it.',
  'try-again': 'Have another go.',
  yes: 'Yes.',
  'tap-play': 'Tap the big button to start.',
  again: 'Again?',
  'section-made': "How it's really made.",
  'section-build': 'Build it.',
  'section-maths': 'Maths shorts.',
  'build-empty': 'New builds are on the way.',
  'ask-empty': 'Tap the microphone and tell me what you want to learn about. Or take a photo.',
  'section-play': 'Free building. Make anything you like.',
  'section-ask': 'What do you want to learn about?',
  'game-more': 'More of the farm is on the way. Come back soon.',
  'section-game': 'The farm. The robot needs your help.',
  hello: `Hi ${learner.spoken}! Pick something to learn.`,
  'well-done': `You worked through every step, ${learner.spoken}. Try explaining it to someone at home.`,
}

// Numbers 1–30, spoken by the number dial in the game.
for (let n = 1; n <= 30; n++) COMMON_LINES[`n-${n}`] = String(n)
export const numberLine = (n: number): SpokenLine => commonLine(`n-${n}`)

export const commonLine = (key: keyof typeof COMMON_LINES & string): SpokenLine => ({
  key: `common/${key}`,
  text: COMMON_LINES[key],
  audio: `audio/common/${key}.mp3`,
})

export const titleLine = (lesson: Lesson): SpokenLine => ({
  key: `titles/${lesson.id}`,
  text: lesson.title,
  audio: `audio/titles/${lesson.id}.mp3`,
})

const line = (lessonId: string, name: string, text: string, override?: string): SpokenLine => ({
  key: `${lessonId}/${name}`,
  text,
  audio: override ? `audio/${override}` : `audio/${lessonId}/${name}.mp3`,
})

function questionLines(lessonId: string, base: string, q: Question, out: Record<string, SpokenLine>) {
  out.prompt = line(lessonId, `${base}-prompt`, q.prompt)
  if (q.onRight) out.right = line(lessonId, `${base}-right`, q.onRight)
  if (q.onWrong) out.wrong = line(lessonId, `${base}-wrong`, q.onWrong)
  for (const [i, m] of Object.entries(q.wrong ?? {})) {
    out[`hint:${i}`] = line(lessonId, `${base}-hint-${i}`, m.hint)
    out[`wrong:${i}`] = line(lessonId, `${base}-wrong-${i}`, m.say)
  }
  out.reveal = line(lessonId, `${base}-reveal`, q.reveal)
}

export function stepLines(lessonId: string, step: Step) {
  const k = stepKind(step)
  const out: Record<string, SpokenLine> = {}
  if (k === 'question' && 'question' in step) {
    const q = step.question
    if (q.narration) out.narration = line(lessonId, step.id, q.narration.text, q.narration.audio)
    questionLines(lessonId, step.id, q, out)
    if (q.retry) {
      const r: Record<string, SpokenLine> = {}
      questionLines(lessonId, `${step.id}-retry`, q.retry, r)
      for (const [key, v] of Object.entries(r)) out[`retry.${key}`] = v
    }
  } else if (k === 'rule' && 'rule' in step) {
    out.narration = line(lessonId, step.id, step.rule.spoken ?? step.rule.text)
    if (step.rule.ask) out.ask = line(lessonId, `${step.id}-ask`, step.rule.ask)
  } else if ('narration' in step) {
    out.narration = line(lessonId, step.id, step.narration.text, step.narration.audio)
    if (k === 'explore' && 'parts' in step) {
      for (const p of step.parts) out[`part:${p.id}`] = line(lessonId, `${step.id}-${p.id}`, p.narration)
    }
  }
  return out
}

/** The optional stretch question, as a question step (id "bonus"). */
export function bonusStep(lesson: Lesson): QuestionStep | null {
  if (!lesson.bonus) return null
  const { intro, ...q } = lesson.bonus
  return { id: 'bonus', question: { ...q, narration: { text: intro ?? COMMON_LINES['bonus-intro'] } } }
}

export const handsOnLine = (lesson: Lesson): SpokenLine | null =>
  lesson.handsOn ? line(lesson.id, 'hands-on', `Here's something to try away from the screen. ${lesson.handsOn}`) : null

export function allLessonLines(lesson: Lesson): SpokenLine[] {
  return [
    titleLine(lesson),
    ...lesson.steps.flatMap((s) => Object.values(stepLines(lesson.id, s))),
    ...(lesson.bonus ? Object.values(stepLines(lesson.id, bonusStep(lesson)!)) : []),
    ...(lesson.handsOn ? [handsOnLine(lesson)!] : []),
  ]
}

export function commonLines(): SpokenLine[] {
  return Object.keys(COMMON_LINES).map((k) => commonLine(k))
}

/** Narration for a game puzzle: content/puzzles/<id>.json → audio/game-<id>/<key>.mp3 */
export interface PuzzleLines { id: string; lines: Record<string, string> }
export const puzzleLine = (p: PuzzleLines, key: string): SpokenLine => ({
  key: `game-${p.id}/${key}`,
  text: p.lines[key] ?? '',
  audio: `audio/game-${p.id}/${key}.mp3`,
})
export const allPuzzleLines = (p: PuzzleLines) => Object.keys(p.lines).map((k) => puzzleLine(p, k))
