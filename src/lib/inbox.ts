// Ismaeel's requests ("I want to learn about…"): voice notes, photos of homework,
// and typed words. Stored on this device in IndexedDB. A grown-up exports them
// from the parent screen and drops the file into the repo's requests/ folder,
// where Claude turns them into lessons. Nothing is uploaded automatically.

export type InboxItem =
  | { id: string; at: number; kind: 'voice'; blob: Blob; mime: string; seconds: number }
  | { id: string; at: number; kind: 'photo'; blob: Blob; mime: string }
  | { id: string; at: number; kind: 'text'; text: string }

const DB = 'blockwise-inbox'
const STORE = 'items'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
export async function addItem(item: InboxItem) {
  try {
    await tx('readwrite', (s) => s.put(item))
  } catch {
    /* storage unavailable */
  }
}
export async function listItems(): Promise<InboxItem[]> {
  try {
    const all = await tx<InboxItem[]>('readonly', (s) => s.getAll() as IDBRequest<InboxItem[]>)
    return all.sort((a, b) => b.at - a.at)
  } catch {
    return []
  }
}
export async function removeItem(id: string) {
  try {
    await tx('readwrite', (s) => s.delete(id))
  } catch {
    /* ignore */
  }
}
export async function clearItems() {
  try {
    await tx('readwrite', (s) => s.clear())
  } catch {
    /* ignore */
  }
}

const ext = (mime: string) => (mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : mime.includes('webm') ? 'webm' : mime.includes('png') ? 'png' : mime.includes('heic') ? 'heic' : mime.includes('ogg') ? 'ogg' : 'jpg')

/** Bundles every request (plus the activity log) into one zip for the repo's requests/ folder. */
export async function exportZip(activity: unknown, learner: string): Promise<File> {
  const { zipSync, strToU8 } = await import('fflate')
  const items = await listItems()
  const files: Record<string, Uint8Array> = {}
  const index = []
  for (const it of items) {
    const stamp = new Date(it.at).toISOString().replace(/[:.]/g, '-')
    if (it.kind === 'text') {
      index.push({ id: it.id, at: new Date(it.at).toISOString(), kind: 'text', text: it.text })
    } else {
      const name = `${stamp}-${it.kind}.${ext(it.mime)}`
      files[name] = new Uint8Array(await it.blob.arrayBuffer())
      index.push({ id: it.id, at: new Date(it.at).toISOString(), kind: it.kind, file: name, ...(it.kind === 'voice' ? { seconds: it.seconds } : {}) })
    }
  }
  files['requests.json'] = strToU8(JSON.stringify({ learner, exportedAt: new Date().toISOString(), items: index }, null, 2))
  files['activity.json'] = strToU8(JSON.stringify(activity, null, 2))
  const zip = zipSync(files)
  const day = new Date().toISOString().slice(0, 10)
  return new File([zip as BlobPart], `requests-${day}.zip`, { type: 'application/zip' })
}
