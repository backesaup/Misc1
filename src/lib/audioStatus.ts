import { lessons } from '@/lesson/content'
import { allLessonLines, commonLines, hashInput, type SpokenLine } from '@/lesson/lines'

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface AudioStatus {
  total: number
  missing: SpokenLine[]
  stale: SpokenLine[]
}

/** Compares every spoken line with public/audio/manifest.json written by generate-audio.py. */
export async function audioStatus(): Promise<AudioStatus> {
  const lines = [...commonLines(), ...lessons.flatMap(allLessonLines)]
  let manifest: Record<string, string> = {}
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}audio/manifest.json`, { cache: 'no-cache' })
    if (res.ok && res.headers.get('content-type')?.includes('json')) manifest = await res.json()
  } catch {
    /* no manifest yet */
  }
  const missing: SpokenLine[] = []
  const stale: SpokenLine[] = []
  for (const l of lines) {
    const have = manifest[l.audio.replace(/^audio\//, '')]
    if (!have) missing.push(l)
    else if (crypto?.subtle && have !== (await sha256(hashInput(l.text)))) stale.push(l)
  }
  return { total: lines.length, missing, stale }
}
