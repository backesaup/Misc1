import { lazy, Suspense } from 'react'
import { Settings2, Boxes, MessageCircleQuestion } from 'lucide-react'
import { sections } from '@/lesson/content'
import { commonLine } from '@/lesson/lines'
import { narrator } from '@/lib/narrator'
import { sfx } from '@/lib/sfx'
import { go } from '@/lib/router'
import { useSettings } from '@/lib/settings'
import { learner } from '@/config'
import { CardArt } from '@/components/CardArt'
import { HoldButton } from '@/components/HoldButton'
import Float from '@/components/vendor/fancy/float'

const HomeBackdrop = lazy(() => import('@/components/HomeBackdrop'))
const LogoMark = lazy(() => import('@/components/LogoMark'))

export function Home() {
  const { reducedMotion } = useSettings()
  const open = (id: string) => {
    narrator.unlock()
    sfx.tap()
    narrator.say(commonLine(`section-${id}` as 'section-made'))
    go({ name: 'section', id })
  }
  return (
    <main className="home">
      <Suspense fallback={<div className="home-backdrop" aria-hidden />}>
        <HomeBackdrop still={reducedMotion} />
      </Suspense>
      <header className="home-top">
        <button
          className="logo-btn"
          aria-label={`Say hello to ${learner.name}`}
          onClick={() => {
            narrator.unlock()
            narrator.say(commonLine('hello'))
          }}
        >
          <Suspense fallback={<img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" width={88} height={88} />}>
            <LogoMark still={reducedMotion} />
          </Suspense>
        </button>
        <h1 className="home-hello">
          Hi <span translate="no">{learner.name}</span>
        </h1>
        <HoldButton ms={3000} onDone={() => go({ name: 'parent' })} label="Grown-ups: hold for 3 seconds" className="parent-hold">
          <Settings2 aria-hidden />
        </HoldButton>
      </header>
      <nav className="tiles" aria-label="Sections">
        {sections.map((s, i) => (
          <button key={s.id} className="tile" data-tone={s.tone} onClick={() => open(s.id)}>
            <span className="tile-art">
              {reducedMotion ? (
                <CardArt art={s.art} />
              ) : (
                <Float speed={0.35} amplitude={[4, 8, 0]} rotationRange={[3, 4, 1.5]} timeOffset={i * 1.7}>
                  <CardArt art={s.art} />
                </Float>
              )}
            </span>
            <span className="tile-title">{s.title}</span>
          </button>
        ))}
      </nav>
      <nav className="tiles-small" aria-label="More">
        <button className="tile small" data-tone="build" onClick={() => (narrator.unlock(), sfx.tap(), narrator.say(commonLine('section-play')), go({ name: 'play' }))}>
          <Boxes aria-hidden />
          <span className="tile-title">Free build</span>
        </button>
        <button className="tile small" data-tone="made" onClick={() => (narrator.unlock(), sfx.tap(), narrator.say(commonLine('section-ask')), go({ name: 'ask' }))}>
          <MessageCircleQuestion aria-hidden />
          <span className="tile-title">Ask</span>
        </button>
      </nav>
    </main>
  )
}
