// Turning what he says into answers: spoken numbers and yes/no.

const SMALL: Record<string, number> = {
  zero: 0, oh: 0, nought: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5, six: 6, seven: 7,
  eight: 8, ate: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }

/** "sixty four" → 64, "3,240" → 3240, "three thousand two hundred and forty" → 3240. Null if no number. */
export function parseSpokenNumber(text: string): number | null {
  const t = text.toLowerCase().replace(/(\d),(\d)/g, '$1$2')
  const digits = t.match(/-?\d+(\.\d+)?/)
  if (digits) return Number(digits[0])
  const words = t.replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean)
  let total = 0, current = 0, found = false
  for (const w of words) {
    if (w in SMALL) { current += SMALL[w]; found = true }
    else if (w in TENS) { current += TENS[w]; found = true }
    else if (w === 'hundred') { current = (current || 1) * 100; found = true }
    else if (w === 'thousand') { total += (current || 1) * 1000; current = 0; found = true }
    else if (w === 'and' || w === 'a') continue
    else if (found) break // stop at the first word after a number ("sixty four blocks")
  }
  return found ? total + current : null
}

const YES = /\b(yes|yeah|yep|yup|yah|correct|true|it is)\b/i
const NO = /\b(no|nope|nah|not|false|isn't|is not)\b/i

/** Which choice did he say? Returns the index, or null if it isn't clear. */
export function matchChoice(said: string, choices: string[]): number | null {
  const text = said.trim().toLowerCase()
  if (!text) return null
  const numeric = choices.every((c) => !Number.isNaN(Number(c.replace(/,/g, ''))))
  if (numeric) {
    const n = parseSpokenNumber(text)
    if (n === null) return null
    const i = choices.findIndex((c) => Number(c.replace(/,/g, '')) === n)
    return i >= 0 ? i : null
  }
  const lower = choices.map((c) => c.toLowerCase())
  const yes = lower.indexOf('yes'), no = lower.indexOf('no')
  if (yes >= 0 && no >= 0) {
    if (NO.test(text)) return no
    if (YES.test(text)) return yes
  }
  const hit = lower.findIndex((c) => text.includes(c))
  return hit >= 0 ? hit : null
}
