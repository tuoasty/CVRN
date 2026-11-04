import { describe, expect, it } from 'vitest'
import type { PlayerCardOverlayRow } from '@/shared/types/db'
import { toPlayerCardRig } from '../toCardShapes'

describe('toPlayerCardRig', () => {
    it('maps a row', () => {
        const row = { player_id: 'p', season_number: 3, group_id: 'g', image_url: 'u', width: 1000, height: 1400, uploaded_at: 't', image_w: null } as PlayerCardOverlayRow
        expect(toPlayerCardRig(row)).toEqual({ playerId: 'p', seasonNumber: 3, groupId: 'g', imageUrl: 'u', width: 1000, height: 1400, uploadedAt: 't', placement: null })
    })

    it('maps a saved placement', () => {
        const row = { image_x: -4, image_y: 5, image_w: 600 } as PlayerCardOverlayRow
        expect(toPlayerCardRig(row).placement).toEqual({ imageX: -4, imageY: 5, imageW: 600 })
    })
})
