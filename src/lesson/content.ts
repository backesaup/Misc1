import type { Lesson, SectionId } from './types'

const modules = import.meta.glob<{ default: Lesson }>('../../content/lessons/*.json', { eager: true })

export const lessons: Lesson[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))

export const lessonById = (id: string) => lessons.find((l) => l.id === id)

export const visibleLessons = (section: SectionId, showDrafts: boolean) =>
  lessons.filter((l) => l.section === section && (showDrafts || l.status !== 'draft'))

export interface SectionInfo {
  id: SectionId
  title: string
  subtitle: string
  art: string
  tone: string
}

export const sections: SectionInfo[] = [
  { id: 'made', title: "How it's really made", subtitle: 'Real machines, opened up', art: 'made', tone: 'made' },
  { id: 'build', title: 'Build it', subtitle: 'Step by step, for Minecraft Bedrock', art: 'build', tone: 'build' },
  { id: 'maths', title: 'Maths shorts', subtitle: 'Guess, then see why', art: 'maths', tone: 'maths' },
]
