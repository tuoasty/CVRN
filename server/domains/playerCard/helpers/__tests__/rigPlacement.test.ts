import { describe, expect, it } from 'vitest'
import { defaultRigPlacement, rigImageHeight } from '../rigPlacement'

const box = { w: 450, h: 450 }

describe('defaultRigPlacement', () => {
    it('fills the box and centres a tall rig', () => {
        expect(defaultRigPlacement({ width: 2000, height: 3000 }, box)).toEqual({ imageX: 0, imageY: -112, imageW: 450 })
    })

    it('fills the box and centres a wide rig', () => {
        expect(defaultRigPlacement({ width: 3000, height: 2000 }, box)).toEqual({ imageX: -112, imageY: 0, imageW: 675 })
    })

    it('rounds to whole pixels', () => {
        const placement = defaultRigPlacement({ width: 100, height: 300 }, { w: 100.2, h: 100.7 })
        for (const value of Object.values(placement)) expect(Number.isInteger(value)).toBe(true)
    })
})

describe('rigImageHeight', () => {
    it('follows the image proportions', () => {
        expect(rigImageHeight({ imageW: 450 }, { width: 2000, height: 3000 })).toBe(675)
    })
})
