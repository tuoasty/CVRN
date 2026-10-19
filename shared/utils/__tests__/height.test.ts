import { describe, expect, it } from 'vitest'
import { formatGameHeightRange } from '../height'

describe('formatGameHeightRange', () => {
    it('shows one height when the range is a single step', () => {
        expect(formatGameHeightRange(1.375, 1.375)).toBe(`6'7"`)
    })

    it('shows both ends of a range', () => {
        expect(formatGameHeightRange(1.025, 1.2)).toBe(`5'5" to 6'0"`)
    })
})
