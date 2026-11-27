import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'
import { handleLicence, handleSave } from './server/api.ts'
import { memoryStore, upstashFromEnv } from './server/store.ts'

// In dev, serve /api/* from the same handlers Vercel runs. Uses Upstash if its env vars are
// set, otherwise a JSON file in .data/.
function devApi(): Plugin {
  const file = '.data/dev-db.json'
  const store =
    upstashFromEnv(process.env) ??
    memoryStore(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}, (all) => {
      mkdirSync('.data', { recursive: true })
      writeFileSync(file, JSON.stringify(all, null, 2))
    })
  const toRequest = async (req: IncomingMessage) => {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
    const body = ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : Buffer.concat(chunks)
    return new Request(`http://localhost${req.url}`, { method: req.method, headers, body })
  }
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(api)
    },
    configurePreviewServer(server) {
      server.middlewares.use(api)
    },
  }
  async function api(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const path = req.url?.split('?')[0]
    if (path !== '/api/save' && path !== '/api/licence') return next()
    const request = await toRequest(req)
    const response =
      path === '/api/save'
        ? await handleSave(request, store)
        : await handleLicence(request, store, { setupKey: process.env.SETUP_KEY, production: false })
    res.statusCode = response.status
    response.headers.forEach((v, k) => res.setHeader(k, v))
    res.end(await response.text())
  }
}

export default defineConfig({
  plugins: [devApi()],
  server: { host: true },
  build: { target: 'safari15', chunkSizeWarningLimit: 900 },
})
