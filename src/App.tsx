import { lazy, Suspense, useEffect } from 'react'
import { useRoute } from '@/lib/router'
import { useSettings } from '@/lib/settings'
import { setSoundsEnabled } from '@/lib/sfx'
import { lessonById } from '@/lesson/content'
import { Home } from '@/screens/Home'
import { Section } from '@/screens/Section'
import { Parent } from '@/screens/Parent'
import { Ask } from '@/screens/Ask'
import { appName } from '@/config'
import type { SectionId } from '@/lesson/types'

const Sandbox = lazy(() => import('@/screens/Sandbox').then((m) => ({ default: m.Sandbox })))
const LessonPlayer = lazy(() => import('@/player/LessonPlayer').then((m) => ({ default: m.LessonPlayer })))

export default function App() {
  const route = useRoute()
  const { settings } = useSettings()
  useEffect(() => setSoundsEnabled(settings.sounds), [settings.sounds])

  const lesson = route.name === 'lesson' ? lessonById(route.id) : undefined
  // drafts are only reachable when a grown-up has turned them on
  const blocked = lesson?.status === 'draft' && !settings.showDrafts

  useEffect(() => {
    document.title = lesson ? `${lesson.title} · ${appName}` : appName
  }, [lesson])

  if (route.name === 'parent') return <Parent />
  if (route.name === 'ask') return <Ask />
  if (route.name === 'play')
    return (
      <Suspense fallback={<div className="player loading" aria-busy="true" />}>
        <Sandbox />
      </Suspense>
    )
  if (route.name === 'section' && ['made', 'build', 'maths'].includes(route.id)) return <Section id={route.id as SectionId} />
  if (route.name === 'lesson' && lesson && !blocked)
    return (
      <Suspense fallback={<div className="player loading" aria-busy="true" />}>
        <LessonPlayer key={lesson.id} lesson={lesson} />
      </Suspense>
    )
  return <Home />
}
