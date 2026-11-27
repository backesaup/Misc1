// Where saves live. On Vercel: Upstash Redis over its REST API (no extra packages).
// In `npm run dev`: a JSON file in .data/ so the whole flow can be tried without an account.

export interface Store {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  /** Set only if the key doesn't exist yet. Returns false if it was already there. */
  create(key: string, value: string): Promise<boolean>
}

export function upstashFromEnv(env: Record<string, string | undefined>): Store | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  async function cmd(args: string[]): Promise<unknown> {
    const res = await fetch(url!, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    if (!res.ok) throw new Error(`Database error ${res.status}`)
    return ((await res.json()) as { result: unknown }).result
  }
  return {
    async get(key) {
      const r = await cmd(['GET', key])
      return typeof r === 'string' ? r : null
    },
    async set(key, value) {
      await cmd(['SET', key, value])
    },
    async create(key, value) {
      return (await cmd(['SET', key, value, 'NX'])) === 'OK'
    },
  }
}

export function memoryStore(initial: Record<string, string> = {}, onChange?: (all: Record<string, string>) => void): Store {
  const data = { ...initial }
  return {
    async get(key) {
      return data[key] ?? null
    },
    async set(key, value) {
      data[key] = value
      onChange?.(data)
    },
    async create(key, value) {
      if (key in data) return false
      data[key] = value
      onChange?.(data)
      return true
    },
  }
}
