import { describe, expect, it } from 'vitest'
import { handleLicence, handleSave } from '../server/api'
import { memoryStore } from '../server/store'
import { extractLicenceCode, isLicenceCode, newLicenceCode } from './licence'
import { mergeSaves, newSave, parseSave, recordStart, totalStarts } from './save'

describe('licence codes', () => {
  it('are long, random and valid', () => {
    const a = newLicenceCode()
    const b = newLicenceCode()
    expect(a).toHaveLength(32)
    expect(isLicenceCode(a)).toBe(true)
    expect(a).not.toBe(b)
  })
  it('come out of a bare code or a start link', () => {
    const c = newLicenceCode()
    expect(extractLicenceCode(c)).toBe(c)
    expect(extractLicenceCode(` ${c.toUpperCase()} `)).toBe(c)
    expect(extractLicenceCode(`https://x.vercel.app/start?code=${c}`)).toBe(c)
    expect(extractLicenceCode('https://x.vercel.app/start?code=ismaeel')).toBeNull()
    expect(extractLicenceCode('Ismaeel')).toBeNull()
  })
})

describe('save merging', () => {
  it('keeps every engine start from every device', () => {
    const base = newSave('Ismaeel', 1)
    const ipad = recordStart(recordStart(base, 'ipad-1', 'iPad', 10), 'ipad-1', 'iPad', 20)
    const phone = recordStart(base, 'phone-1', 'iPhone', 30)
    const server = mergeSaves(mergeSaves(base, ipad), phone)
    expect(totalStarts(server)).toBe(3)
    expect(server.lastStart).toEqual({ device: 'iPhone', at: 30 })
    // Merging the same thing again changes nothing.
    expect(mergeSaves(server, ipad)).toEqual(server)
    expect(mergeSaves(server, server)).toEqual(server)
  })
  it('never lets points go down and keeps the server name', () => {
    const s = { ...newSave('Ismaeel'), points: 5 }
    const d = { ...newSave('Hacker'), points: 2 }
    const m = mergeSaves(s, d)
    expect(m.points).toBe(5)
    expect(m.name).toBe('Ismaeel')
  })
  it('rejects junk', () => {
    expect(parseSave(null)).toBeNull()
    expect(parseSave({ name: '' })).toBeNull()
    expect(parseSave({ name: 'A', starts: { x: -1, y: 'a', z: 2 } })?.starts).toEqual({ z: 2 })
  })
})

describe('api', () => {
  const store = memoryStore()
  const make = async (name = 'Ismaeel') => {
    const res = await handleLicence(
      new Request('http://t/api/licence', { method: 'POST', body: JSON.stringify({ name, setupKey: 'k' }) }),
      store,
      { setupKey: 'k', production: true },
    )
    return { res, body: (await res.json()) as { code?: string; error?: string } }
  }
  const auth = (code: string) => ({ Authorization: `Licence ${code}` })

  it('needs the set-up key', async () => {
    const res = await handleLicence(
      new Request('http://t/api/licence', { method: 'POST', body: JSON.stringify({ name: 'A', setupKey: 'no' }) }),
      store,
      { setupKey: 'k', production: true },
    )
    expect(res.status).toBe(403)
    const noKey = await handleLicence(new Request('http://t', { method: 'POST', body: '{"name":"A"}' }), store, { production: true })
    expect(noKey.status).toBe(503)
  })

  it('makes a licence, loads it, and merges saves from two devices', async () => {
    const { res, body } = await make()
    expect(res.status).toBe(201)
    const code = body.code!
    const get = await handleSave(new Request('http://t/api/save', { headers: auth(code) }), store)
    expect(get.status).toBe(200)
    const save = parseSave(await get.json())!
    expect(save.name).toBe('Ismaeel')

    const put = (s: unknown) =>
      handleSave(new Request('http://t/api/save', { method: 'PUT', headers: auth(code), body: JSON.stringify(s) }), store)
    await put(recordStart(save, 'ipad', 'iPad'))
    const last = parseSave(await (await put(recordStart(save, 'phone', 'iPhone'))).json())!
    expect(totalStarts(last)).toBe(2)
  })

  it("doesn't know codes it never made, and the database never stores the code", async () => {
    const res = await handleSave(new Request('http://t/api/save', { headers: auth(newLicenceCode()) }), store)
    expect(res.status).toBe(404)
    const { body } = await make('Zed')
    const s = memoryStore()
    // Keys are hashes: the raw code isn't in any key.
    const keys: string[] = []
    const spy = { ...s, create: async (k: string, v: string) => (keys.push(k), s.create(k, v)) }
    await handleLicence(new Request('http://t', { method: 'POST', body: '{"name":"Zed"}' }), spy, { production: false })
    expect(keys[0]).toMatch(/^ltd:save:[0-9a-f]{64}$/)
    expect(keys[0]).not.toContain(body.code!)
  })
})
