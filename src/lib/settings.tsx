import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readJSON, removeKey, writeJSON } from './storage'

export interface Settings {
  captions: boolean
  showDrafts: boolean
  sounds: boolean
  /** Narration playback speed. Audio is already generated at 0.9x. */
  speed: number
  /** 'system' follows the device setting; 'on' always uses the simple path. */
  reduceMotion: 'system' | 'on'
}

const DEFAULTS: Settings = { captions: false, showDrafts: false, sounds: true, speed: 1, reduceMotion: 'system' }

type Progress = Record<string, { done: true; at: number }>

interface Ctx {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reducedMotion: boolean
  progress: Progress
  markDone: (lessonId: string) => void
  resetProgress: () => void
}

const SettingsContext = createContext<Ctx | null>(null)

function useSystemReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => readJSON('settings', DEFAULTS))
  const [progress, setProgress] = useState<Progress>(() => readJSON<Progress>('progress', {}))
  const system = useSystemReducedMotion()

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      writeJSON('settings', next)
      return next
    })
  }, [])

  const markDone = useCallback((id: string) => {
    setProgress((p) => {
      const next: Progress = { ...p, [id]: { done: true, at: Date.now() } }
      writeJSON('progress', next)
      return next
    })
  }, [])

  const resetProgress = useCallback(() => {
    removeKey('progress')
    setProgress({})
  }, [])

  const reducedMotion = settings.reduceMotion === 'on' || system
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full'
  }, [reducedMotion])

  const value = useMemo(
    () => ({ settings, update, reducedMotion, progress, markDone, resetProgress }),
    [settings, update, reducedMotion, progress, markDone, resetProgress],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings outside SettingsProvider')
  return ctx
}
