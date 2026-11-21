import { lazy, Suspense, useEffect, useRef } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import LiquidGlass from 'liquid-glass-js'
import { sections, visibleLessons } from '@/lesson/content'
import { commonLine, titleLine } from '@/lesson/lines'
import type { SectionId } from '@/lesson/types'
import { narrator } from '@/lib/narrator'
import { sfx } from '@/lib/sfx'
import { go } from '@/lib/router'
import { useSettings } from '@/lib/settings'
import { useLenis } from '@/lib/useLenis'
import { CardArt } from '@/components/CardArt'

const VantaFog = lazy(() => import('@/components/VantaFog'))

const FOG: Record<SectionId, [number, number, number]> = {
  made: [0xffd9b0, 0xf2a37a, 0xe9c7a0],
  build: [0xd8efc0, 0x9fcf86, 0xc9e2b1],
  maths: [0xd6e9ff, 0x8fb8ef, 0xc4dbf5],
}

/** A draggable liquid-glass lens over the hero art: look closer at how things are made. */
function Lens({ target, enabled }: { target: React.RefObject<HTMLElement | null>; enabled: boolean }) {
  useEffect(() => {
    const el = target.current
    if (!enabled || !el) return
    const r = el.getBoundingClientRect()
    const size = Math.min(150, r.width * 0.42)
    let glass: InstanceType<typeof LiquidGlass> | null = null
    const t = window.setTimeout(() => {
      glass = new LiquidGlass({
        background: el,
        width: size,
        height: size,
        radius: size / 2,
        scale: 54,
        depth: size / 2,
        curvature: 2,
        chroma: 0.12,
        glow: 0.12,
        edge: 0.65,
        zIndex: 5,
        x: r.left + r.width * 0.52,
        y: r.top + window.scrollY + r.height * 0.18,
      })
    }, 120)
    const onScroll = () => glass?.refresh()
    window.addEventListener('resize', onScroll)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', onScroll)
      glass?.destroy()
    }
  }, [target, enabled])
  return null
}

export function Section({ id }: { id: SectionId }) {
  const info = sections.find((s) => s.id === id) ?? sections[0]
  const { settings, progress, reducedMotion } = useSettings()
  const list = visibleLessons(info.id, settings.showDrafts)
  const hero = useRef<HTMLDivElement>(null)
  useLenis(!reducedMotion)

  const openLesson = (lessonId: string) => {
    const l = list.find((x) => x.id === lessonId)
    if (!l) return
    narrator.unlock()
    sfx.tap()
    narrator.say(titleLine(l))
    go({ name: 'lesson', id: l.id })
  }

  return (
    <main className="section" data-tone={info.tone}>
      <Suspense fallback={null}>
        <VantaFog hi={FOG[info.id][0]} mid={FOG[info.id][1]} lo={FOG[info.id][2]} still={reducedMotion} />
      </Suspense>
      <header className="section-top">
        <button className="icon-btn" onClick={() => (sfx.tap(), go({ name: 'home' }))} aria-label="Home">
          <ArrowLeft aria-hidden />
        </button>
        <h1 className="section-title">{info.title}</h1>
      </header>
      <div className="section-hero" ref={hero} onClick={() => narrator.say(commonLine(`section-${info.id}` as 'section-made'))}>
        <CardArt art={info.art} />
      </div>
      {info.id === 'made' && <Lens target={hero} enabled={!reducedMotion} />}

      {list.length === 0 ? (
        <button className="empty" onClick={() => narrator.say(commonLine('build-empty'))}>
          <CardArt art="build" className="empty-art" />
          <span>Coming soon</span>
        </button>
      ) : (
        <ul className="cards">
          {list.map((l) => (
            <li key={l.id}>
              <button className="card" onClick={() => openLesson(l.id)} data-draft={l.status === 'draft' || undefined}>
                <span className="card-art">
                  <CardArt art={l.cardArt ?? l.section} />
                </span>
                <span className="card-title">{l.title}</span>
                {progress[l.id] && (
                  <span className="card-tick" aria-label="Finished">
                    <Check aria-hidden strokeWidth={3.5} />
                  </span>
                )}
                {l.status === 'draft' && <span className="card-draft">Draft</span>}
                {l.edition && <span className="card-edition">{l.edition.replace(/^mod:/, '')}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
