import type { Device } from '../../shared/save'

export function deviceKind(): Device {
  const ua = navigator.userAgent
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/iPhone|iPod/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return 'Android'
  return 'Computer'
}

/** A random id for this device, kept locally, so each device's engine starts are counted apart. */
export function deviceId(): string {
  const k = 'ltd:device'
  try {
    let id = localStorage.getItem(k)
    if (!id) {
      id = `${deviceKind()}-${crypto.getRandomValues(new Uint32Array(2)).join('')}`
      localStorage.setItem(k, id)
    }
    return id
  } catch {
    return `${deviceKind()}-session`
  }
}

export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
