// Game facts used in lessons, checked against PrismarineJS minecraft-data.
import { describe, expect, it } from 'vitest'
import mcData from 'minecraft-data'

describe('Minecraft facts used in lessons', () => {
  const bedrock = mcData('bedrock_1.21.0')
  const java = mcData('1.21.4')
  it('a stack of blocks is 64 (Bedrock and Java)', () => {
    expect(bedrock.itemsByName.oak_planks.stackSize).toBe(64)
    expect(java.itemsByName.oak_planks.stackSize).toBe(64)
    expect(java.itemsByName.stone.stackSize).toBe(64)
  })
  it('some items stack to 16, so "64" is about blocks, not everything', () => {
    expect(java.itemsByName.egg.stackSize).toBe(16)
    expect(java.itemsByName.ender_pearl.stackSize).toBe(16)
  })
})
