import { describe, it, expect } from 'vitest'
import { classifyWinLossColor } from '../classifyWinLossColor'

describe('classifyWinLossColor', () => {
  it.each([
    '#00ff00', 
    '#00b050', 
    '#93c47d', 
    '#38761d', 
  ])('classifies green %s as win', (hex) => {
    expect(classifyWinLossColor(hex)).toBe('win')
  })

  it.each([
    '#ff0000', 
    '#e06666', 
    '#cc0000', 
    '#990000', 
  ])('classifies red %s as loss', (hex) => {
    expect(classifyWinLossColor(hex)).toBe('loss')
  })

  it.each([
    '#ffffff', 
    '#000000', 
    '#cccccc', 
    '#ffff00', 
  ])('returns null for non green/red %s', (hex) => {
    expect(classifyWinLossColor(hex)).toBeNull()
  })

  it('returns null for null, empty, or malformed input', () => {
    expect(classifyWinLossColor(null)).toBeNull()
    expect(classifyWinLossColor('')).toBeNull()
    expect(classifyWinLossColor('#fff')).toBeNull()
    expect(classifyWinLossColor('not-a-color')).toBeNull()
  })

  it('accepts a hex without the leading #', () => {
    expect(classifyWinLossColor('00ff00')).toBe('win')
    expect(classifyWinLossColor('ff0000')).toBe('loss')
  })
})
