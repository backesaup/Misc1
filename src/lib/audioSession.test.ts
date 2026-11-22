import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./narrator', () => ({ narrator: { relock: vi.fn(), unlock: vi.fn() } }))
vi.mock('./sfx', () => ({ recoverSounds: vi.fn() }))

describe('audio session around the microphone', () => {
  const session = { type: 'auto' }
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(globalThis, 'navigator', { value: { audioSession: session }, configurable: true })
    ;(globalThis as unknown as { window: unknown }).window = globalThis
    ;(globalThis as unknown as { addEventListener: unknown }).addEventListener = vi.fn()
  })

  it('plays through the speaker, records while listening, then goes back', async () => {
    const { initAudioSession, micStarting, micStopped } = await import('./audioSession')
    const { recoverSounds } = await import('./sfx')
    initAudioSession()
    expect(session.type).toBe('playback')
    micStarting()
    expect(session.type).toBe('play-and-record')
    micStopped()
    vi.advanceTimersByTime(200)
    expect(session.type).toBe('playback')
    expect(recoverSounds).toHaveBeenCalled()
  })
})
