// The game's copy of the shared save. The server holds the real one (keyed by the licence
// code); this keeps a local copy so the game works offline, and syncs when it's back online.

import { mergeSaves, parseSave, type Save } from '../../shared/save'

const LICENCE_KEY = 'ltd:licence'
const saveKey = (code: string) => `ltd:save:${code}`
const dirtyKey = (code: string) => `ltd:dirty:${code}`

function read(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function write(k: string, v: string | null): void {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* private mode or full: the game still works for this visit */
  }
}

export const rememberedLicence = () => read(LICENCE_KEY)
export const rememberLicence = (code: string) => write(LICENCE_KEY, code)
export const forgetLicence = () => write(LICENCE_KEY, null)

export function localSave(code: string): Save | null {
  try {
    return parseSave(JSON.parse(read(saveKey(code)) ?? 'null'))
  } catch {
    return null
  }
}

export type SyncState = 'synced' | 'offline'

export type Verify =
  | { ok: true; save: Save; sync: SyncState }
  | { ok: false; reason: 'unknown' | 'offline' | 'server' }

const headers = (code: string) => ({ Authorization: `Licence ${code}`, 'Content-Type': 'application/json' })

async function withTimeout(p: Promise<Response>, ms: number): Promise<Response> {
  return Promise.race([p, new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
}

/** Check the licence with the server and load its save. Falls back to the local copy offline. */
export async function verifyLicence(code: string): Promise<Verify> {
  try {
    const res = await withTimeout(fetch('/api/save', { headers: headers(code), cache: 'no-store' }), 6000)
    if (res.status === 404) return { ok: false, reason: 'unknown' }
    if (!res.ok) throw new Error(String(res.status))
    let save = parseSave(await res.json())
    if (!save) throw new Error('bad save')
    const local = localSave(code)
    if (local && read(dirtyKey(code))) save = mergeSaves(save, local)
    write(saveKey(code), JSON.stringify(save))
    return { ok: true, save, sync: 'synced' }
  } catch {
    const local = localSave(code)
    if (local) return { ok: true, save: local, sync: 'offline' }
    return { ok: false, reason: navigator.onLine ? 'server' : 'offline' }
  }
}

/** Save locally right away, then push to the server. Returns the merged save. */
export async function commit(code: string, save: Save): Promise<{ save: Save; sync: SyncState }> {
  write(saveKey(code), JSON.stringify(save))
  write(dirtyKey(code), '1')
  return push(code, save)
}

async function push(code: string, save: Save): Promise<{ save: Save; sync: SyncState }> {
  try {
    const res = await withTimeout(
      fetch('/api/save', { method: 'PUT', headers: headers(code), body: JSON.stringify(save) }),
      8000,
    )
    if (!res.ok) throw new Error(String(res.status))
    const merged = parseSave(await res.json())
    if (!merged) throw new Error('bad save')
    write(saveKey(code), JSON.stringify(merged))
    write(dirtyKey(code), null)
    return { save: merged, sync: 'synced' }
  } catch {
    return { save, sync: 'offline' }
  }
}

/** Push any changes made offline. Called when the device comes back online. */
export async function syncPending(code: string): Promise<{ save: Save; sync: SyncState } | null> {
  const local = localSave(code)
  if (!local || !read(dirtyKey(code))) return null
  return push(code, local)
}
