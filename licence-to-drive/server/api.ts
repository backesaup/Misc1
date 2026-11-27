// The two API routes, written against the web-standard Request/Response so the same code runs
// on Vercel and in the Vite dev server.
//
//   GET  /api/save      Authorization: Licence <code>  → 200 save | 404 unknown licence
//   PUT  /api/save      Authorization: Licence <code>  body: save → 200 merged save
//   POST /api/licence   body: { name, setupKey } → 201 { code }
//
// The code travels in a header, not the URL, so it stays out of request logs. The database
// key is a hash of the code, so the database never holds the code itself.

import { hashCode, isLicenceCode, newLicenceCode } from '../shared/licence.js'
import { cleanName, mergeSaves, newSave, parseSave } from '../shared/save.js'
import type { Store } from './store.js'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

const key = async (code: string) => `ltd:save:${await hashCode(code)}`

function codeFrom(req: Request): string | null {
  const m = /^Licence\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')
  const code = m?.[1].toLowerCase()
  return isLicenceCode(code) ? code : null
}

export async function handleSave(req: Request, store: Store | null): Promise<Response> {
  if (!store) return json(503, { error: 'no-database' })
  const code = codeFrom(req)
  if (!code) return json(404, { error: 'unknown-licence' })
  const k = await key(code)
  const existing = parseSave(JSON.parse((await store.get(k)) ?? 'null'))
  if (!existing) return json(404, { error: 'unknown-licence' })

  if (req.method === 'GET') return json(200, existing)
  if (req.method === 'PUT') {
    const text = await req.text()
    if (text.length > 100_000) return json(413, { error: 'too-big' })
    let incoming
    try {
      incoming = parseSave(JSON.parse(text))
    } catch {
      incoming = null
    }
    if (!incoming) return json(400, { error: 'bad-save' })
    const merged = mergeSaves(existing, incoming)
    await store.set(k, JSON.stringify(merged))
    return json(200, merged)
  }
  return json(405, { error: 'method' })
}

export async function handleLicence(
  req: Request,
  store: Store | null,
  env: { setupKey?: string; production: boolean },
): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method' })
  if (!store) return json(503, { error: 'no-database' })
  if (env.production && !env.setupKey) return json(503, { error: 'no-setup-key' })
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json(400, { error: 'bad-request' })
  }
  if (env.setupKey && body.setupKey !== env.setupKey) return json(403, { error: 'wrong-setup-key' })
  const name = cleanName(body.name)
  if (!name) return json(400, { error: 'need-name' })
  const code = newLicenceCode()
  if (!(await store.create(await key(code), JSON.stringify(newSave(name))))) return json(500, { error: 'retry' })
  return json(201, { code })
}
