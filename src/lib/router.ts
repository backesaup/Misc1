import { useEffect, useState } from 'react'

// Hash routes so every screen is deep-linkable and works from the home-screen app offline.
export type Route =
  | { name: 'home' }
  | { name: 'section'; id: string }
  | { name: 'lesson'; id: string }
  | { name: 'parent' }
  | { name: 'play' }
  | { name: 'ask' }

export function parse(hash: string): Route {
  const [path] = hash.replace(/^#/, '').split('?')
  const [, a, b] = path.split('/')
  if (a === 'section' && b) return { name: 'section', id: b }
  if (a === 'lesson' && b) return { name: 'lesson', id: b }
  if (a === 'parent') return { name: 'parent' }
  if (a === 'play') return { name: 'play' }
  if (a === 'ask') return { name: 'ask' }
  return { name: 'home' }
}

export const href = (r: Route) => ('id' in r ? `#/${r.name}/${r.id}` : r.name === 'home' ? '#/' : `#/${r.name}`)

export function go(r: Route) {
  window.location.hash = href(r)
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const on = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

/** Optional ?step=N on a lesson link opens that step directly (handy for checking a lesson). */
export function startStep(): number {
  const q = window.location.hash.split('?')[1]
  const n = Number(new URLSearchParams(q).get('step'))
  return Number.isFinite(n) && n > 0 ? n : 0
}
