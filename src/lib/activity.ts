import { readJSON, writeJSON } from './storage'

/**
 * A small activity log kept on this device only, so a grown-up can see what
 * works for him: which steps he replays, which wrong answers he picks, how long
 * he spends, and where he stops. Shown on the parent screen; never sent anywhere.
 */
export type ActivityEvent =
  | { type: 'start'; lesson: string }
  | { type: 'step'; lesson: string; step: string; ms?: number }
  | { type: 'replay'; step: string }
  | { type: 'right'; step: string; tries: number; retry: boolean }
  | { type: 'wrong'; step: string; choice: string; retry: boolean }
  | { type: 'finish'; lesson: string }
  | { type: 'quit'; lesson: string; step: string }
  | { type: 'bonus'; lesson: string }
  | { type: 'sandbox'; blocks: number }

type Stored = ActivityEvent & { at: number }
const KEY = 'activity'
const MAX = 2000

export function log(e: ActivityEvent) {
  const list = readJSON<{ events: Stored[] }>(KEY, { events: [] }).events
  list.push({ ...e, at: Date.now() })
  writeJSON(KEY, { events: list.slice(-MAX) })
}

export const readActivity = (): Stored[] => readJSON<{ events: Stored[] }>(KEY, { events: [] }).events
export const clearActivity = () => writeJSON(KEY, { events: [] })

/** A plain summary for the parent screen. */
export function summarise(events: Stored[]) {
  const replays = new Map<string, number>()
  const wrongs = new Map<string, Map<string, number>>()
  const quits = new Map<string, number>()
  let finished = 0
  for (const e of events) {
    if (e.type === 'replay') replays.set(e.step, (replays.get(e.step) ?? 0) + 1)
    if (e.type === 'wrong') {
      const m = wrongs.get(e.step) ?? new Map()
      m.set(e.choice, (m.get(e.choice) ?? 0) + 1)
      wrongs.set(e.step, m)
    }
    if (e.type === 'quit') quits.set(`${e.lesson} at ${e.step}`, (quits.get(`${e.lesson} at ${e.step}`) ?? 0) + 1)
    if (e.type === 'finish') finished++
  }
  const top = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  return {
    finished,
    replays: top(replays),
    wrongs: [...wrongs.entries()].map(([step, m]) => ({ step, choices: top(m) })),
    quits: top(quits),
  }
}
