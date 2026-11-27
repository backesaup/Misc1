import './styles.css'
import { extractLicenceCode } from '../shared/licence'
import { rememberedLicence } from './lib/save'
import { checkScreen } from './screens/check'
import { setupScreen } from './screens/setup'
import { startScreen } from './screens/start'

// Keep the fps counter on for the session if the page was opened with ?fps.
try {
  if (new URLSearchParams(location.search).has('fps')) sessionStorage.setItem('ltd:fps', '1')
} catch {
  /* ignore */
}

function route(): void {
  const path = location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/setup') return setupScreen()
  if (path === '/start') {
    const code = extractLicenceCode(location.href)
    // Take the code out of the address bar once we have it.
    history.replaceState(null, '', '/start')
    if (code) return startScreen(code)
    // A reload of /start (the code was already taken out of the address bar).
    const remembered = rememberedLicence()
    if (remembered) return startScreen(remembered)
    return checkScreen({ message: 'unknown' })
  }
  checkScreen()
}

route()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
