import { describe, expect, it } from 'vitest'
import { matchChoice, parseSpokenNumber } from './spoken'

describe('spoken numbers', () => {
  it.each([
    ['64', 64], ['sixty four', 64], ['sixty-four', 64], ['3,240', 3240], ['three thousand two hundred and forty', 3240],
    ['a hundred', 100], ['one hundred', 100], ['ten', 10], ['twenty seven blocks', 27], ['I think it is 54', 54],
    ['two hundred and fifty six', 256], ['one thousand', 1000],
  ])('%s → %d', (text, n) => expect(parseSpokenNumber(text)).toBe(n))
  it('no number', () => expect(parseSpokenNumber('I don’t know')).toBeNull())
})

describe('matching a spoken answer to the choices', () => {
  it('numbers', () => {
    expect(matchChoice('sixty four', ['16', '64', '88'])).toBe(1)
    expect(matchChoice('three thousand two hundred forty', ['114', '3,240', '540'])).toBe(1)
    expect(matchChoice('fifty', ['16', '64', '88'])).toBeNull()
  })
  it('yes and no', () => {
    expect(matchChoice('yeah', ['Yes', 'No'])).toBe(0)
    expect(matchChoice('no it is not', ['Yes', 'No'])).toBe(1)
    expect(matchChoice('banana', ['Yes', 'No'])).toBeNull()
  })
})
