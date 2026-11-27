import { handleLicence } from '../server/api.js'
import { upstashFromEnv } from '../server/store.js'

const store = upstashFromEnv(process.env)

export const POST = (req: Request) =>
  handleLicence(req, store, { setupKey: process.env.SETUP_KEY, production: !!process.env.VERCEL })
