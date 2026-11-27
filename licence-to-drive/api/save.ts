import { handleSave } from '../server/api.js'
import { upstashFromEnv } from '../server/store.js'

const store = upstashFromEnv(process.env)

export const GET = (req: Request) => handleSave(req, store)
export const PUT = (req: Request) => handleSave(req, store)
