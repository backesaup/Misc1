// One save for Ismaeel, shared by every device that scans his licence.
// Step 1 only needs his name and a record of engine starts; later steps add the figure, cars,
// coins, points, unlocks and garage, each with its own merge rule below.

export type Device = 'iPad' | 'iPhone' | 'Android' | 'Computer'

export interface Save {
  v: 1
  name: string
  createdAt: number
  /** Engine starts per device id. Merged by taking the larger count, so no start is ever lost. */
  starts: Record<string, number>
  /** The most recent start anywhere (newest wins). */
  lastStart: { device: Device; at: number } | null
  /** Driving points only go up. */
  points: number
  coins: number
  /** Coins only change through events (earn/spend), so devices can't overwrite each other. */
  coinEvents: Record<string, number>
}

export function newSave(name: string, now = Date.now()): Save {
  return { v: 1, name, createdAt: now, starts: {}, lastStart: null, points: 0, coins: 0, coinEvents: {} }
}

const MAX_NAME = 24

export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
  return name.length ? name : null
}

function isCount(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n < 1e9
}

function isTime(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 1e14
}

function countMap(raw: unknown, allowNegative = false): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, n] of Object.entries(raw as Record<string, unknown>)) {
    if (k.length > 64 || Object.keys(out).length >= 2000) continue
    const ok = allowNegative ? typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e9 : isCount(n)
    if (ok) out[k] = Math.round(n as number)
  }
  return out
}

const DEVICES: Device[] = ['iPad', 'iPhone', 'Android', 'Computer']

/** Turn untrusted JSON into a Save, dropping anything that doesn't fit. */
export function parseSave(raw: unknown): Save | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = cleanName(r.name)
  if (!name) return null
  const ls = r.lastStart as Record<string, unknown> | null | undefined
  const lastStart =
    ls && DEVICES.includes(ls.device as Device) && isTime(ls.at) ? { device: ls.device as Device, at: ls.at } : null
  const coinEvents = countMap(r.coinEvents, true)
  return {
    v: 1,
    name,
    createdAt: isTime(r.createdAt) ? r.createdAt : Date.now(),
    starts: countMap(r.starts),
    lastStart,
    points: isCount(r.points) ? Math.round(r.points) : 0,
    coins: Math.max(0, Object.values(coinEvents).reduce((a, b) => a + b, 0)),
    coinEvents,
  }
}

function maxMerge(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a }
  for (const [k, n] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, n)
  return out
}

/**
 * Combine the server's copy with a device's copy. Safe to run in any order, any number of
 * times: merge(a, merge(a, b)) === merge(a, b). The name comes from the server (set when the
 * licence was made).
 */
export function mergeSaves(server: Save, device: Save): Save {
  const coinEvents = { ...device.coinEvents, ...server.coinEvents }
  const lastStart =
    !server.lastStart || (device.lastStart && device.lastStart.at > server.lastStart.at)
      ? device.lastStart
      : server.lastStart
  return {
    v: 1,
    name: server.name,
    createdAt: Math.min(server.createdAt, device.createdAt),
    starts: maxMerge(server.starts, device.starts),
    lastStart,
    points: Math.max(server.points, device.points),
    coins: Math.max(0, Object.values(coinEvents).reduce((a, b) => a + b, 0)),
    coinEvents,
  }
}

export function totalStarts(save: Save): number {
  return Object.values(save.starts).reduce((a, b) => a + b, 0)
}

export function recordStart(save: Save, deviceId: string, device: Device, now = Date.now()): Save {
  return {
    ...save,
    starts: { ...save.starts, [deviceId]: (save.starts[deviceId] ?? 0) + 1 },
    lastStart: { device, at: now },
  }
}
