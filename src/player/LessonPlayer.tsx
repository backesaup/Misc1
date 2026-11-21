import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ArrowLeft, Home, Pause, Play, RotateCcw, ChevronRight, Check, Eye, Star, MessagesSquare, Hand, X } from 'lucide-react'
import type { Lesson, Step, SceneRef, QuestionStep, ExploreStep, BuildStep, Cue, Question } from '@/lesson/types'
import { stepKind } from '@/lesson/types'
import { bonusStep, commonLine, handsOnLine, stepLines, titleLine, type SpokenLine } from '@/lesson/lines'
import { narrator } from '@/lib/narrator'
import { sfx } from '@/lib/sfx'
import { useSettings } from '@/lib/settings'
import { go, startStep } from '@/lib/router'
import { cn } from '@/lib/utils'
import { log } from '@/lib/activity'
import { SceneController } from '@/scenes/controller'
import { getScene, sceneKey } from '@/scenes/registry'
import type { SceneDef } from '@/scenes/types'
import { Stage3D } from './Stage3D'
import { CardArt } from '@/components/CardArt'
import { Guide } from '@/components/Guide'
import ClickSpark, { type ClickSparkHandle } from '@/components/vendor/reactbits/ClickSpark'
import CountUp from '@/components/vendor/reactbits/CountUp'
import VerticalCutReveal from '@/components/vendor/fancy/vertical-cut-reveal'
import { MicButton } from '@/components/MicButton'
import { matchChoice } from '@/lib/spoken'

type Phase = 'intro' | 'playing' | 'end'
interface QState {
  chosen: number | null
  revealed: boolean
  /** showing the similar "try one like it" question after a wrong answer */
  retry: boolean
  /** wrong choices already tried (after the first, he gets a hint and one more go) */
  tried: number[]
}
const FRESH: QState = { chosen: null, revealed: false, retry: false, tried: [] }

/** The scene in effect for each step: a step without a scene keeps the last one. */
function effectiveScenes(steps: Step[]): (SceneRef | undefined)[] {
  let cur: SceneRef | undefined
  return steps.map((s) => (cur = s.scene ?? cur))
}

const question0 = (q: Pick<Question, 'choices'>, i: number) => q.choices[i]

const SPARK_COLORS = ['#ffd166', '#f4a261', '#58b368', '#7cc6fe']

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { settings, reducedMotion, markDone } = useSettings()
  const bonus = useMemo(() => bonusStep(lesson), [lesson])
  // the bonus question (if any) sits after the rule and is only reached from the end screen
  const steps = useMemo(() => (bonus ? [...lesson.steps, bonus] : lesson.steps), [lesson.steps, bonus])
  const ruleIndex = lesson.steps.length - 1
  const bonusIndex = bonus ? lesson.steps.length : -1
  const scenesFor = useMemo(() => effectiveScenes(steps), [steps])

  const [phase, setPhase] = useState<Phase>('intro')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const [caption, setCaption] = useState<string | null>(null)
  const [q, setQ] = useState<QState>(FRESH)
  const [ruleShown, setRuleShown] = useState(false)
  const [bonusDone, setBonusDone] = useState(false)
  const [showHands, setShowHands] = useState(false)
  const [talkOpen, setTalkOpen] = useState(false)
  const [activePart, setActivePart] = useState<string | null>(null)
  const [scene, setScene] = useState<{ key: string; def: SceneDef; ctrl: SceneController } | null>(null)
  const [labelKey, setLabelKey] = useState(0)

  const token = useRef(0)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const sceneRef = useRef(scene)
  sceneRef.current = scene
  const spark = useRef<ClickSparkHandle>(null)
  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([])
  const htmlRoot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    narrator.rate = settings.speed
  }, [settings.speed])
  useEffect(() => {
    narrator.onLine = setCaption
    return () => {
      narrator.onLine = null
      narrator.stop()
      tl.current?.kill()
    }
  }, [])

  const step = steps[index]
  const kind = step ? stepKind(step) : 'narrated'
  const lines = useMemo(() => (step ? stepLines(lesson.id, step) : {}), [lesson.id, step])

  const buildTimeline = useCallback(
    (cues: Cue[] | undefined, ctrl: SceneController, def: SceneDef) => {
      const t = gsap.timeline({ paused: true })
      for (const cue of cues ?? []) {
        const action = def.actions[cue.action]
        if (!action) continue
        const r = action(ctrl, cue, { reduced: reducedMotion })
        if (typeof r === 'function') t.call(r, undefined, cue.at)
        else t.add(r, cue.at)
      }
      return t
    },
    [reducedMotion],
  )

  /** Prepare the scene for step i, reusing the mounted one when it continues. */
  const enterScene = useCallback(
    (i: number) => {
      const ref = scenesFor[i]
      if (!ref) return sceneRef.current
      const def = getScene(ref)
      if (!def) return sceneRef.current
      const key = sceneKey(ref)
      let cur = sceneRef.current
      if (!cur || cur.key !== key) {
        cur = { key, def, ctrl: new SceneController(def.defaults) }
        if (steps[i].scene?.params) def.applyParams?.(cur.ctrl, steps[i].scene!.params!)
        sceneRef.current = cur
        setScene(cur)
      } else if (steps[i].scene?.params) {
        def.applyParams?.(cur.ctrl, steps[i].scene!.params!)
      }
      cur.ctrl.snapshot()
      return cur
    },
    [scenesFor, steps],
  )

  const runStep = useCallback(
    async (i: number) => {
      const my = ++token.current
      const alive = () => token.current === my
      narrator.stop()
      tl.current?.progress(1).kill()
      tl.current = null
      setPaused(false)
      setReady(false)
      setActivePart(null)
      setQ(FRESH)
      setIndex(i)
      setLabelKey((k) => k + 1)

      const s = steps[i]
      const k = stepKind(s)
      log({ type: 'step', lesson: lesson.id, step: s.id })
      const cur = enterScene(i)
      const ls = stepLines(lesson.id, s)
      if (cur) cur.ctrl.onPart = null

      const t = cur ? buildTimeline(s.animation, cur.ctrl, cur.def) : null
      tl.current = t

      if (k === 'rule') {
        // ask him to say the rule out loud before it's shown
        t?.play()
        setPhase('end')
        setRuleShown(false)
        await narrator.say(ls.ask ?? commonLine('say-rule')).done
        return
      }

      if (k === 'question') {
        t?.play()
        if (ls.narration) {
          const r = await narrator.say(ls.narration).done
          if (!alive() || r === 'cancelled') return
        }
        // a short pause before every question, then ask
        await narrator.say(ls.prompt, { delay: 450 }).done
        return
      }

      if (k === 'explore' && cur) cur.ctrl.onPart = (id) => choosePartRef.current(id)
      t?.play()
      const r = await narrator.say(ls.narration).done
      if (alive() && r === 'ended') setReady(true)
    },
    [steps, lesson.id, enterScene, buildTimeline],
  )

  const showRule = async () => {
    const my = token.current
    sfx.tap()
    setRuleShown(true)
    markDone(lesson.id)
    log({ type: 'finish', lesson: lesson.id })
    const ls = stepLines(lesson.id, steps[ruleIndex])
    const r = await narrator.say(ls.narration).done
    if (token.current !== my) return
    if (r === 'ended') await narrator.say(commonLine('well-done'), { delay: 350 }).done
    if (token.current !== my) return
    setReady(true)
    const hands = handsOnLine(lesson)
    if (hands) {
      setShowHands(true)
      await narrator.say(hands, { delay: 300 }).done
    }
  }

  const choosePart = useCallback(
    (id: string) => {
      if (!step || stepKind(step) !== 'explore') return
      sfx.tap()
      setActivePart(id)
      setReady(true)
      const line = stepLines(lesson.id, step)[`part:${id}`]
      if (line) narrator.say(line)
    },
    [lesson.id, step],
  )
  const choosePartRef = useRef(choosePart)
  choosePartRef.current = choosePart

  const celebrate = (choice: number) => {
    sfx.correct()
    const el = choiceRefs.current[choice]
    if (el && !reducedMotion) {
      const r = el.getBoundingClientRect()
      const root = el.closest('.player-shell')?.getBoundingClientRect()
      spark.current?.spark(r.left + r.width / 2 - (root?.left ?? 0), r.top + r.height / 2 - (root?.top ?? 0))
    }
  }

  const answer = useCallback(
    async (choice: number) => {
      if (!step || !('question' in step) || q.chosen !== null) return
      const my = token.current
      const alive = () => token.current === my
      const say = async (l: SpokenLine | undefined) => (l ? narrator.say(l).done : 'ended')
      const main = (step as QuestionStep).question
      const inRetry = q.retry && !!main.retry
      const qs: Pick<Question, 'answer' | 'wrong' | 'choices'> = inRetry ? main.retry! : main
      const pre = inRetry ? 'retry.' : ''
      const right = choice === qs.answer
      setQ((s) => ({ ...s, chosen: choice }))
      narrator.stop()

      if (right) {
        log({ type: 'right', step: step.id, tries: q.tried.length + 1, retry: inRetry })
        celebrate(choice)
        setQ((s) => ({ ...s, chosen: choice, revealed: true }))
        if (!inRetry) {
          const cur = sceneRef.current
          const reveal = cur ? buildTimeline(main.revealAnimation, cur.ctrl, cur.def) : null
          tl.current?.progress(1)
          tl.current = reveal
          reveal?.play()
        }
        await say(lines[`${pre}right`] ?? commonLine('yes'))
        if (!alive()) return
        await say(lines[`${pre}reveal`])
        if (alive()) setReady(true)
        return
      }

      // Wrong: calm, no buzzer. First a small hint and one more go (a little productive struggle).
      log({ type: 'wrong', step: step.id, choice: question0(qs, choice), retry: inRetry })
      await say(commonLine('lets-see'))
      if (!alive()) return
      if (q.tried.length === 0) {
        await say(lines[`${pre}hint:${choice}`])
        if (!alive()) return
        setQ((s) => ({ ...s, chosen: null, tried: [...s.tried, choice] }))
        await say(commonLine('try-again'))
        return
      }
      // Second wrong try: go back to the broken step, re-explain it, show it.
      if (!inRetry) {
        const cur = sceneRef.current
        const reveal = cur ? buildTimeline(main.revealAnimation, cur.ctrl, cur.def) : null
        tl.current?.progress(1)
        tl.current = reveal
        reveal?.play()
      }
      const r = await say(lines[`${pre}wrong:${choice}`] ?? lines[`${pre}wrong`])
      if (!alive() || r === 'cancelled') return
      setQ((s) => ({ ...s, revealed: true }))
      sfx.reveal()
      await say(lines[`${pre}reveal`])
      if (!alive()) return
      if (!inRetry && main.retry) {
        // let him try a similar question straight away
        await say(commonLine('try-similar'))
        if (!alive()) return
        setQ({ chosen: null, revealed: false, retry: true, tried: [] })
        await say(lines['retry.prompt'])
        return
      }
      setReady(true)
    },
    [step, q.chosen, q.retry, q.tried, buildTimeline, lines, reducedMotion],
  )

  const start = () => {
    narrator.unlock()
    sfx.tap()
    log({ type: 'start', lesson: lesson.id })
    setPhase('playing')
    const jump = Math.min(startStep(), lesson.steps.length - 1)
    if (jump > 0) {
      // fast-forward the scene through earlier steps so it's in the right state
      for (let i = 0; i < jump; i++) {
        const cur = enterScene(i)
        const s = steps[i]
        const cues = [...(s.animation ?? []), ...('question' in s ? (s.question.revealAnimation ?? []) : [])]
        if (cur) buildTimeline(cues, cur.ctrl, cur.def).progress(1).kill()
      }
    }
    void runStep(jump)
  }
  const next = () => {
    sfx.tap()
    if (index === bonusIndex) {
      // back to the end screen after the bonus
      token.current++
      narrator.stop()
      setBonusDone(true)
      setIndex(ruleIndex)
      setPhase('end')
      setRuleShown(true)
      setReady(true)
      return
    }
    if (index < ruleIndex) void runStep(index + 1)
  }
  const replay = () => {
    sfx.tap()
    if (step) log({ type: 'replay', step: `${lesson.id}/${step.id}` })
    narrator.stop()
    tl.current?.kill()
    tl.current = null
    sceneRef.current?.ctrl.restore()
    void runStep(index)
  }
  const togglePause = () => {
    sfx.tap()
    if (paused) {
      narrator.resume()
      tl.current?.resume()
      setPaused(false)
    } else {
      narrator.pause()
      tl.current?.pause()
      setPaused(true)
    }
  }
  const again = () => {
    sfx.tap()
    token.current++
    narrator.stop()
    tl.current?.kill()
    sceneRef.current = null
    setScene(null)
    setBonusDone(false)
    setShowHands(false)
    setTalkOpen(false)
    setPhase('playing')
    void Promise.resolve().then(() => runStep(0))
  }
  const playBonus = () => {
    sfx.tap()
    log({ type: 'bonus', lesson: lesson.id })
    setPhase('playing')
    void runStep(bonusIndex)
  }
  const leave = (to: 'section' | 'home') => {
    sfx.tap()
    if (phase === 'playing' && step) log({ type: 'quit', lesson: lesson.id, step: step.id })
    token.current++
    narrator.stop()
    go(to === 'home' ? { name: 'home' } : { name: 'section', id: lesson.section })
  }

  const sceneProps = scene ? { ctrl: scene.ctrl, reduced: reducedMotion, activePart } : null
  const Overlay = scene?.def.Overlay
  const label = step && 'label' in step ? step.label : undefined
  const ruleStep = lesson.steps[ruleIndex]

  if (phase === 'intro') {
    return (
      <main className="player intro" data-section={lesson.section}>
        <header className="player-top">
          <button className="icon-btn" onClick={() => leave('section')} aria-label="Back to lessons">
            <ArrowLeft aria-hidden />
          </button>
        </header>
        <div className="intro-body">
          <button className="intro-art" onClick={() => narrator.say(titleLine(lesson))} aria-label={`Hear the title: ${lesson.title}`}>
            <CardArt art={lesson.cardArt ?? lesson.section} />
          </button>
          <h1 className="intro-title">{lesson.title}</h1>
          <Guide wave still={reducedMotion} className="guide intro-guide" />
          <button className="play-big" onClick={start} aria-label="Play">
            <Play aria-hidden fill="currentColor" />
          </button>
        </div>
      </main>
    )
  }

  const question = step && 'question' in step ? (q.retry && step.question.retry ? step.question.retry : step.question) : null

  return (
    <ClickSpark ref={spark} sparkColor={SPARK_COLORS} sparkCount={14} sparkRadius={70} sparkSize={14} shape="star" disabled className="player-shell" ring>
      <main
        className={cn('player', `kind-${phase === 'end' ? 'rule' : kind}`)}
        data-section={lesson.section}
        data-step={phase === 'end' ? ruleStep.id : step?.id}
        data-ready={ready || undefined}
      >
        <header className="player-top">
          <button className="icon-btn" onClick={() => leave('section')} aria-label="Back to lessons">
            <ArrowLeft aria-hidden />
          </button>
          <ol className="dots" aria-label={`Step ${Math.min(index, ruleIndex) + 1} of ${lesson.steps.length}`}>
            {lesson.steps.map((s, i) => (
              <li key={s.id} data-state={i < index ? 'done' : i === index ? 'now' : 'todo'} />
            ))}
          </ol>
          <button className="icon-btn" onClick={replay} aria-label="Replay this step" disabled={phase === 'end'}>
            <RotateCcw aria-hidden />
          </button>
        </header>

        <section className="stage" aria-label="Lesson picture">
          {scene && sceneProps && scene.def.kind === '3d' && <Stage3D def={scene.def} props={sceneProps} htmlRoot={htmlRoot} />}
          <div className="stage-html" ref={htmlRoot} />
          {scene && sceneProps && scene.def.kind === '2d' && (
            <div className="stage-2d">
              <scene.def.Component {...sceneProps} />
            </div>
          )}
          {Overlay && sceneProps && <Overlay {...sceneProps} />}
          {label && phase !== 'end' && (
            <div className="stage-label" key={labelKey} aria-hidden>
              <VerticalCutReveal splitBy="characters" staggerDuration={0.03} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.5 }}>
                {label}
              </VerticalCutReveal>
            </div>
          )}
          {index === bonusIndex && phase !== 'end' && (
            <div className="bonus-flag" aria-hidden>
              <Star aria-hidden fill="currentColor" /> Bonus
            </div>
          )}
          {phase === 'end' && 'rule' in ruleStep && (
            <EndCard rule={ruleStep.rule.text} shown={ruleShown} ready={ready} reduced={reducedMotion} onShow={showRule}>
              {showHands && lesson.handsOn && (
                <p className="hands-on">
                  <Hand aria-hidden /> <span>{lesson.handsOn}</span>
                </p>
              )}
            </EndCard>
          )}
          {phase === 'end' && ruleShown && lesson.talk && (
            <button className="talk-btn" onClick={() => setTalkOpen(true)}>
              <MessagesSquare aria-hidden /> Talk about it
            </button>
          )}
          {talkOpen && lesson.talk && (
            <div className="talk-sheet" role="dialog" aria-modal="true" aria-label="Talk about it, for a grown-up">
              <div className="talk-head">
                <h2>Talk about it</h2>
                <button className="icon-btn" onClick={() => setTalkOpen(false)} aria-label="Close">
                  <X aria-hidden />
                </button>
              </div>
              <p className="talk-intro">For a grown-up: ask him, and let him explain. The app can't hear him yet.</p>
              <ol>
                {lesson.talk.map((t) => (
                  <li key={t.ask}>
                    <p className="talk-ask">“{t.ask}”</p>
                    <p className="talk-good">A good answer includes: {t.goodAnswer}</p>
                  </li>
                ))}
              </ol>
              {lesson.handsOn && <p className="talk-hands">Hands-on: {lesson.handsOn}</p>}
            </div>
          )}
          {settings.captions && caption && (
            <p className="caption" aria-live="polite">
              {caption}
            </p>
          )}
        </section>

        {question && phase !== 'end' && (
          <Choices key={`${step?.id}-${q.retry}`} question={question} state={q} reduced={reducedMotion} onChoose={answer} refs={choiceRefs} />
        )}
        {kind === 'explore' && step && phase !== 'end' && (
          <div className="parts" role="group" aria-label="Tap a part">
            {(step as ExploreStep).parts.map((p) => (
              <button key={p.id} className="part-btn" data-on={activePart === p.id || undefined} onClick={() => choosePart(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        {kind === 'build' && step && phase !== 'end' && (
          <ul className="build-list" aria-label="Blocks you need">
            {(step as BuildStep).blocks.map((b) => (
              <li key={b.block}>
                <span className="tabular-nums">{b.count}</span> {b.block}
              </li>
            ))}
          </ul>
        )}

        {phase === 'end' ? (
          <nav className="dock end-dock" aria-label="Finished" data-ready={ready || undefined}>
            <button className="end-btn end-again" onClick={again} aria-label="Again" disabled={!ruleShown}>
              <RotateCcw aria-hidden strokeWidth={2.75} />
            </button>
            {bonus && !bonusDone && ruleShown && (
              <button className="end-btn end-bonus" onClick={playBonus} aria-label="Bonus challenge">
                <Star aria-hidden strokeWidth={2.5} fill="currentColor" />
              </button>
            )}
            <button className="end-btn end-home" onClick={() => leave('home')} aria-label="Home" disabled={!ruleShown}>
              <Home aria-hidden strokeWidth={2.75} />
            </button>
          </nav>
        ) : (
          <nav className="dock" aria-label="Lesson controls">
            <span className="dock-spacer" />
            <button className="dock-btn play" onClick={togglePause} aria-label={paused ? 'Play' : 'Pause'}>
              {paused ? <Play aria-hidden fill="currentColor" /> : <Pause aria-hidden fill="currentColor" />}
            </button>
            <button className="dock-btn next" onClick={next} disabled={!ready} aria-label="Next">
              <ChevronRight aria-hidden strokeWidth={3} />
            </button>
          </nav>
        )}
      </main>
    </ClickSpark>
  )
}

function Choices({
  question,
  state,
  reduced,
  onChoose,
  refs,
}: {
  question: Pick<Question, 'prompt' | 'choices' | 'answer'>
  state: QState
  reduced: boolean
  onChoose: (i: number) => void
  refs: React.RefObject<(HTMLButtonElement | null)[]>
}) {
  const answerText = question.choices[question.answer]
  const numeric = Number(answerText.replace(/,/g, ''))
  return (
    <div className="choices-wrap">
      <div className={cn('choices', `n-${question.choices.length}`)} role="group" aria-label={question.prompt}>
        {question.choices.map((c, i) => {
          const isAnswer = i === question.answer
          const st =
            state.revealed && isAnswer
              ? 'right'
              : (state.chosen === i || state.tried.includes(i)) && !isAnswer
                ? 'tried'
                : state.chosen !== null
                  ? 'rest'
                  : 'open'
          return (
            <button
              key={c}
              ref={(el) => void (refs.current[i] = el)}
              className="choice"
              data-state={st}
              disabled={state.chosen !== null || state.tried.includes(i)}
              onClick={() => onChoose(i)}
            >
              <span className="choice-text tabular-nums">{c}</span>
              {st === 'right' && <Check className="choice-tick" aria-hidden strokeWidth={3.5} />}
            </button>
          )
        })}
      </div>
      {state.chosen === null && !state.revealed && (
        <MicButton
          className="choices-mic"
          label="Say your answer"
          onHeard={(text) => {
            const i = matchChoice(text, question.choices)
            if (i !== null && !state.tried.includes(i)) onChoose(i)
            else narrator.say(commonLine('didnt-catch'))
          }}
        />
      )}
      {state.revealed && !Number.isNaN(numeric) && numeric > 9 && (
        <div className="reveal-num" aria-hidden>
          = <CountUp to={numeric} duration={reduced ? 0 : 1.1} separator="," />
        </div>
      )}
    </div>
  )
}

function EndCard({
  rule,
  shown,
  ready,
  reduced,
  onShow,
  children,
}: {
  rule: string
  shown: boolean
  ready: boolean
  reduced: boolean
  onShow: () => void
  children?: React.ReactNode
}) {
  const [said, setSaid] = useState('')
  return (
    <div className="end">
      <Guide wave={ready} still={reduced} className="guide end-guide" />
      {shown ? (
        <p className="end-rule">
          {rule.split(' = ').map((part, i) => (
            <span className="rule-line" key={i}>
              <VerticalCutReveal
                splitBy="words"
                staggerDuration={0.06}
                transition={{ type: 'spring', stiffness: 220, damping: 24, delay: reduced ? 0 : i * 0.45 }}
              >
                {(i > 0 ? '= ' : '') + part}
              </VerticalCutReveal>
            </span>
          ))}
        </p>
      ) : (
        <div className="say-rule">
          <MicButton
            label="Say the rule"
            showWords={false}
            onHeard={(text) => {
              setSaid(text)
              log({ type: 'said', text })
            }}
          />
          <button className="show-rule" onClick={onShow} aria-label="Show the rule">
            <Eye aria-hidden strokeWidth={2.5} />
          </button>
        </div>
      )}
      {said && <p className="you-said">You said: “{said}”</p>}
      {children}
    </div>
  )
}
