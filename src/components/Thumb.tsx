import type { Lesson } from '@/lesson/types'
import { CardArt } from './CardArt'
import { useSkinSprites } from '@/scenes/voxel/skins'

// A YouTube-style cover for a lesson: a real frame from the lesson's own scene (captured by
// `npm run thumbs` into src/assets/thumbs/), a few big words, and Steve reacting in the corner.
// Lessons without a captured frame show their card art instead.
const shots = import.meta.glob<string>('../assets/thumbs/*.jpg', { eager: true, query: '?url', import: 'default' })
export const thumbUrl = (id: string) => shots[`../assets/thumbs/${id}.jpg`]

export function Thumb({ lesson, big = false }: { lesson: Pick<Lesson, 'id' | 'section' | 'cardArt' | 'thumb' | 'title' | 'steps'>; big?: boolean }) {
  const { face } = useSkinSprites('steve')
  const url = thumbUrl(lesson.id)
  const t = lesson.thumb
  // Steve's reaction leans left or right, the same way every time for a lesson
  const tilt = [...lesson.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 2 ? -10 : 9
  return (
    // flat 2D drawings fill their frame already, so they're zoomed in less than 3D scenes
    <span className="thumb" data-big={big || undefined} data-flat={lesson.steps[0]?.scene?.type === 'diagram' || undefined} style={{ ['--accent' as string]: t?.color ?? 'var(--tone)' }}>
      {url ? <img className="thumb-shot" src={url} alt="" loading="lazy" decoding="async" /> : <span className="thumb-art"><CardArt art={lesson.cardArt ?? lesson.section} /></span>}
      {t?.text && <span className="thumb-text">{t.text}</span>}
      <img className="thumb-steve" src={face} alt="" style={{ ['--tilt' as string]: `${tilt}deg` }} />
    </span>
  )
}
