import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAppShareUrl, shareApp } from '../../app/utils/shareApp'

describe('shareApp utility', () => {
  const originalNavigator = global.navigator
  const originalWindow = global.window

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    })
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    })
  })

  describe('getAppShareUrl', () => {
    it('returns baseUrl when window is undefined', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true
      })
      expect(getAppShareUrl('/app/')).toBe('/app/')
    })

    it('resolves relative baseUrl against window.location.origin', () => {
      Object.defineProperty(global, 'window', {
        value: { location: { origin: 'https://example.com' } },
        writable: true,
        configurable: true
      })
      expect(getAppShareUrl('/')).toBe('https://example.com/')
      expect(getAppShareUrl('/cuanto-llevo-gastao/')).toBe('https://example.com/cuanto-llevo-gastao/')
    })
  })

  describe('shareApp', () => {
    it('uses Web Share API when available and returns shared', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined)
      const canShareMock = vi.fn().mockReturnValue(true)

      Object.defineProperty(global, 'navigator', {
        value: {
          share: shareMock,
          canShare: canShareMock
        },
        writable: true,
        configurable: true
      })

      const outcome = await shareApp({
        title: 'App Title',
        text: 'App Description',
        url: 'https://example.com/app/'
      })

      expect(outcome).toBe('shared')
      expect(canShareMock).toHaveBeenCalledWith({
        title: 'App Title',
        text: 'App Description',
        url: 'https://example.com/app/'
      })
      expect(shareMock).toHaveBeenCalledWith({
        title: 'App Title',
        text: 'App Description',
        url: 'https://example.com/app/'
      })
    })

    it('returns cancelled when user aborts Web Share dialog', async () => {
      const abortError = new Error('User cancelled')
      abortError.name = 'AbortError'
      const shareMock = vi.fn().mockRejectedValue(abortError)

      Object.defineProperty(global, 'navigator', {
        value: {
          share: shareMock
        },
        writable: true,
        configurable: true
      })

      const outcome = await shareApp({
        title: 'App Title',
        url: 'https://example.com/app/'
      })

      expect(outcome).toBe('cancelled')
    })

    it('falls back to clipboard when navigator.share is not supported', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined)

      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: writeTextMock
          }
        },
        writable: true,
        configurable: true
      })

      const outcome = await shareApp({
        title: 'App Title',
        url: 'https://example.com/app/'
      })

      expect(outcome).toBe('copied')
      expect(writeTextMock).toHaveBeenCalledWith('https://example.com/app/')
    })

    it('falls back to clipboard when navigator.share throws a non-abort error', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      const notAllowedError = new Error('Not allowed')
      notAllowedError.name = 'NotAllowedError'
      const shareMock = vi.fn().mockRejectedValue(notAllowedError)

      Object.defineProperty(global, 'navigator', {
        value: {
          share: shareMock,
          clipboard: {
            writeText: writeTextMock
          }
        },
        writable: true,
        configurable: true
      })

      const outcome = await shareApp({
        title: 'App Title',
        url: 'https://example.com/app/'
      })

      expect(outcome).toBe('copied')
      expect(writeTextMock).toHaveBeenCalledWith('https://example.com/app/')
    })

    it('returns failed when both share and clipboard fail', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true
      })

      const outcome = await shareApp({
        title: 'App Title',
        url: 'https://example.com/app/'
      })

      expect(outcome).toBe('failed')
    })
  })
})
