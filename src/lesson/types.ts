// The lesson format. Every lesson is a JSON file in content/lessons/.
// Adding a lesson never needs player code unless it adds a new scene type.

export type SectionId = 'made' | 'build' | 'maths'

/** One spoken line. Captions are always this same text, so they never drift. */
export interface Line {
  text: string
  /** Optional override; by default the path is derived (see audioPath). */
  audio?: string
}

export interface SceneRef {
  /** Scene type, e.g. "voxel" or "diagram". */
  type: string
  /** Which preset of that scene type, e.g. "blocks64". */
  preset: string
  /** Starting state for the scene when this step begins (optional). */
  params?: Record<string, number | string | boolean>
}

/** One timeline cue: at `at` seconds into the step, run `action`. */
export interface Cue {
  at: number
  action: string
  duration?: number
  [param: string]: unknown
}

interface StepBase {
  id: string
  scene?: SceneRef
  animation?: Cue[]
  /** The one new word this step names (at most one new term per step). */
  term?: string
}

/** A wrong choice, the misunderstanding behind it, and what to say about it. */
export interface Mistake {
  /** Which misunderstanding gives this answer, e.g. "added 8 and 8 instead of 8 rows of 8". */
  mistake: string
  /** A small nudge after the first wrong try; he then gets one more go. */
  hint: string
  /** Re-explains the broken step a different way (after a second wrong try). */
  say: string
}

export interface Question {
  prompt: string
  choices: string[]
  answer: number
  /** Specific praise: say what he did, not what he is. */
  onRight?: string
  /** Every wrong choice, keyed by its index, maps to a named misunderstanding. */
  wrong?: Record<string, Mistake>
  /** Fallback re-explanation if a wrong choice has no entry. */
  onWrong?: string
  /** The shared explanation, said after any answer. */
  reveal: string
  revealAnimation?: Cue[]
  /** Optional lead-in narration before the prompt. */
  narration?: Line
  /** A similar question to try after a wrong answer. */
  retry?: Omit<Question, 'retry' | 'narration' | 'revealAnimation'>
}

export interface NarratedStep extends StepBase {
  kind?: 'narrated'
  narration: Line
  /** Big label shown over the scene (short labels and numbers only). */
  label?: string
}

export interface QuestionStep extends StepBase {
  kind?: 'question'
  question: Question
}

export interface ExplorePart {
  id: string
  label: string
  narration: string
}

export interface ExploreStep extends StepBase {
  kind: 'explore'
  narration: Line
  parts: ExplorePart[]
}

export interface BuildBlock {
  block: string
  count: number
}

export interface BuildStep extends StepBase {
  kind: 'build'
  narration: Line
  blocks: BuildBlock[]
}

export interface RuleStep extends StepBase {
  kind: 'rule'
  /** He is asked to say the rule out loud before it is shown. */
  rule: { text: string; spoken?: string; ask?: string }
}

export type Step = NarratedStep | QuestionStep | ExploreStep | BuildStep | RuleStep

export interface Lesson {
  id: string
  section: SectionId
  title: string
  /** Card art preset (drawn in code) or an image in public/cards/. */
  cardArt?: string
  cardImage?: string
  /** "draft" lessons are hidden from the child until a parent turns drafts on. */
  status?: 'draft' | 'ready'
  /** Facts a grown-up must check before this lesson ships. */
  verify?: string[]
  order?: number
  /** Words this lesson uses without teaching: each must be known already or taught by a required lesson. */
  assumes?: string[]
  /** Lessons that must come first (their terms count as known). */
  requires?: string[]
  /** "Talk about it": questions a grown-up asks him afterwards, and what a good answer includes. */
  talk?: { ask: string; goodAnswer: string }[]
  /** A real-world challenge, said and shown at the end ("build a 3 × 3 × 3 cube from Lego"). */
  handsOn?: string
  /** An optional stretch question offered at the end. */
  bonus?: Question & { intro?: string }
  /** Which game the build is for, shown as a tag: "bedrock", "java" or "mod:<name>". */
  edition?: string
  steps: Step[]
}

export function stepKind(step: Step): 'narrated' | 'question' | 'explore' | 'build' | 'rule' {
  if ('question' in step) return 'question'
  if ('rule' in step) return 'rule'
  if (step.kind === 'explore') return 'explore'
  if (step.kind === 'build') return 'build'
  return 'narrated'
}
