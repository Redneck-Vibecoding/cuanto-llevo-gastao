export interface ShareAppOptions {
  title?: string
  text?: string
  url?: string
}

export type ShareAppOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * Builds the canonical root application URL using the configured baseURL
 * and current window origin.
 */
export function getAppShareUrl(baseURL = '/'): string {
  if (typeof window === 'undefined') return baseURL

  try {
    const origin = window.location.origin
    if (!origin) return baseURL
    return new URL(baseURL, origin).href
  } catch {
    return window.location.origin ? `${window.location.origin}${baseURL}` : baseURL
  }
}

/**
 * Shares the application URL using the Web Share API when supported,
 * falling back to copying to the system clipboard.
 */
export async function shareApp(options: ShareAppOptions): Promise<ShareAppOutcome> {
  const url = options.url || (typeof window !== 'undefined' ? window.location.origin : '')
  const title = options.title || 'Cuánto llevo gastao'
  const text = options.text

  const shareData: ShareData = {
    title,
    ...(text ? { text } : {}),
    url
  }

  // 1. Try Web Share API if supported
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    let canShare = true
    if (typeof navigator.canShare === 'function') {
      try {
        canShare = navigator.canShare(shareData)
      } catch {
        canShare = false
      }
    }

    if (canShare) {
      try {
        await navigator.share(shareData)
        return 'shared'
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') {
          return 'cancelled'
        }
        // Fall through to clipboard if Web Share threw another error
      }
    }
  }

  // 2. Fallback to Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(url)
      return 'copied'
    } catch {
      // Clipboard write failed or was denied
    }
  }

  return 'failed'
}
