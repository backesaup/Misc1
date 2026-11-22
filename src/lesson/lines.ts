import type { Lesson, Question, QuestionStep, Step } from './types.ts'
import { learner } from '../config.ts'
import { stepKind } from './types.ts'

/**
 * Every spoken line in the app, with the audio file it plays.
 * scripts/generate-audio.py and the audio check both mirror these rules, so
 * keep the naming here and there in sync (see scripts/lines.mjs).
 */
import voice from '../../content/voice.json' with { type: 'json' }

/**
 * Narration voices (content/voice.json), one per character. Each line's hash covers its
 * speaker's engine, voice, speed, pitch and the pauses, so changing any of them re-records it.
 */
export type Speaker = keyof typeof voice.speakers
const pauses = `p${voice.pauses.sentence}-${voice.pauses.count}-${voice.pauses.beforeQuestion}`
export function voiceKey(speaker: Speaker = 'narrator') {
  const sp = voice.speakers[speaker] ?? voice.speakers.narrator
  return voice.engine === 'fish'
    ? `fish:${voice.fishModel}:${sp.fish.voice}:${sp.fish.speed}:${pauses}`
    : `kokoro:${sp.kokoro.voice}:${sp.kokoro.speed}:${sp.kokoro.pitch}:${pauses}`
}
export const deviceVoice = (speaker: Speaker = 'narrator') => (voice.speakers[speaker] ?? voice.speakers.narrator).device
export const hashInput = (text: string, speaker: Speaker = 'narrator') => `${voiceKey(speaker)}|${text}`

export interface SpokenLine {
  key: string
  text: string
  audio: string
  /** Who says it (default: the narrator). */
  speaker?: Speaker
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
  'didnt-catch': "I didn't catch that. Try saying it again, or tap your answer.",
  'game-more': 'More of the farm is on the way. Come back soon.',
  'section-game': 'The farm. The robot needs your help.',
  hello: `Hi ${learner.spoken}! Pick something to learn.`,
  'well-done': `You worked through every step, ${learner.spoken}. Try explaining it to someone at home.`,
}

// Numbers 0–100, spoken by number dials and "make it" results.
for (let n = 0; n <= 100; n++) COMMON_LINES[`n-${n}`] = n === 0 ? 'zero' : String(n)
Object.assign(COMMON_LINES, {
  'w-row-of': 'row of',
  'w-rows-of': 'rows of',
  'w-and': 'and',
  'w-left-over': 'left over.',
  'w-none-left': 'None left over!',
  'w-pairs': 'pairs',
  'w-odd': 'and one left over. That makes it an odd number.',
  'w-even': 'No odd one out. That makes it an even number.',
  'w-ten': 'ten',
  'w-tens': 'tens',
  'w-one': 'one.',
  'w-ones': 'ones.',
  'w-each': 'each',
  'w-makes': 'makes',
  'w-steps-uses': 'steps uses',
  'w-blocks': 'blocks.',
  'w-by': 'by',
  'w-square-uses': 'square uses',
  'w-groups-of': 'groups of',
  'w-group-of': 'group of',
  'w-units-long': 'units long.',
  'w-unit-long': 'unit long.',
  'new-way': 'A new way!',
  'found-before': 'You found that one already. Try another number.',
  'every-way': 'You found every way! Look at them all.',
  'how-close': "Let's see how close you were.",
  'make-start': 'Choose a number, then tap the hammer to try it.',
})
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

const line = (lessonId: string, name: string, text: string, override?: string, speaker?: string): SpokenLine => ({
  key: `${lessonId}/${name}`,
  text,
  audio: override ? `audio/${override}` : `audio/${lessonId}/${name}.mp3`,
  ...(speaker && speaker in voice.speakers ? { speaker: speaker as Speaker } : {}),
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
    if (q.narration) out.narration = line(lessonId, step.id, q.narration.text, q.narration.audio, q.narration.speaker)
    questionLines(lessonId, step.id, q, out)
    if (q.retry) {
      const r: Record<string, SpokenLine> = {}
      questionLines(lessonId, `${step.id}-retry`, q.retry, r)
      for (const [key, v] of Object.entries(r)) out[`retry.${key}`] = v
    }
  } else if (k === 'make' && 'make' in step) {
    out.narration = line(lessonId, step.id, step.narration.text, step.narration.audio, step.narration.speaker)
  } else if (k === 'rule' && 'rule' in step) {
    out.narration = line(lessonId, step.id, step.rule.spoken ?? step.rule.text)
    if (step.rule.ask) out.ask = line(lessonId, `${step.id}-ask`, step.rule.ask)
  } else if ('narration' in step) {
    out.narration = line(lessonId, step.id, step.narration.text, step.narration.audio, step.narration.speaker)
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
  speaker: 'robot',
})
export const allPuzzleLines = (p: PuzzleLines) => Object.keys(p.lines).map((k) => puzzleLine(p, k))
