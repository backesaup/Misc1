// Everything the app remembers lives in localStorage on this device only.
// Every access is wrapped: private mode or blocked storage must never break the app.

const PREFIX = 'blockwise:'

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage unavailable: carry on without remembering */
  }
}

export function removeKey(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}
