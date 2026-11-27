// The licence code is the only key to Ismaeel's save. It is long and random so it can't be
// guessed, and it never contains his name.

// No 0/o/1/l/i so a grown-up can read it off the card if they ever need to type it.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const CODE_LENGTH = 32 // 32 chars from 31 symbols ≈ 158 bits of randomness

export function newLicenceCode(): string {
  const out: string[] = []
  const bytes = new Uint8Array(64)
  while (out.length < CODE_LENGTH) {
    crypto.getRandomValues(bytes)
    for (const b of bytes) {
      // Rejection sampling keeps every symbol equally likely.
      if (b < 248 && out.length < CODE_LENGTH) out.push(ALPHABET[b % 31])
    }
  }
  return out.join('')
}

export function isLicenceCode(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`).test(value)
}

/**
 * Pull a licence code out of whatever the card gave us: a bare code, or a URL like
 * https://…/start?code=… (what the NFC tag and the QR hold).
 */
export function extractLicenceCode(raw: string): string | null {
  const text = raw.trim()
  const direct = text.toLowerCase()
  if (isLicenceCode(direct)) return direct
  try {
    const url = new URL(text)
    const code = url.searchParams.get('code')?.trim().toLowerCase()
    return isLicenceCode(code) ? code : null
  } catch {
    return null
  }
}

export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
