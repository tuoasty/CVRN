import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { logger } from '@/server/utils/logger'
import { findPlayerCardOverlay } from '@/server/db/playerCards.repo'
import { CardImageLayer, CardLayer, RigPlacement } from '../types'
import { cropRigToBox } from './cropRigToBox'
import { loadImageAsPngDataUri, loadImageCached } from './loadImage'
import { defaultRigPlacement } from './rigPlacement'
import { toPlayerCardRig } from './toCardShapes'

export const NO_RIG_SEGMENT = 'This layout has no Rig segment, so the rig has nowhere to go'

const RIG_LOAD_FAILED = { message: 'The rig image could not be loaded', code: 'INTEGRATION_ERROR' as const }

export function findRigLayer(layers: CardLayer[]): CardImageLayer | null {
    return layers.find((layer): layer is CardImageLayer => layer.kind === 'image' && layer.field === 'rig') ?? null
}

export function hasRigLayer(layers: CardLayer[]): boolean {
    return findRigLayer(layers) !== null
}

export async function loadCardRig(
    supabase: DBClient,
    p: {
        playerId: string | null
        seasonNumber: number
        groupId: string
        layers: CardLayer[]
        cached: boolean
        placement?: RigPlacement | null
    },
): Promise<Result<string | null>> {
    if (!p.playerId) return Ok(null)

    const row = await findPlayerCardOverlay(supabase, {
        playerId: p.playerId,
        seasonNumber: p.seasonNumber,
        groupId: p.groupId,
        slot: 'rig',
    })
    if (!row.ok) return row
    if (!row.value) return Ok(null)

    const rigLayer = findRigLayer(p.layers)
    if (!rigLayer) return Err({ message: NO_RIG_SEGMENT, code: 'VALIDATION_ERROR' })

    const loaded = await (p.cached ? loadImageCached : loadImageAsPngDataUri)(row.value.image_url)
    if (!loaded.ok) return Err(RIG_LOAD_FAILED)

    const image = { width: row.value.width, height: row.value.height }
    const box = { w: rigLayer.w, h: rigLayer.h }
    const placement = p.placement ?? toPlayerCardRig(row.value).placement ?? defaultRigPlacement(image, box)

    try {
        const source = Buffer.from(loaded.value.slice(loaded.value.indexOf(',') + 1), 'base64')
        const cropped = await cropRigToBox(source, image, placement, box)
        return Ok(`data:image/png;base64,${cropped.toString('base64')}`)
    } catch (error) {
        logger.error({ error, playerId: p.playerId }, 'loadCardRig: crop failed')
        return Err(RIG_LOAD_FAILED)
    }
}
