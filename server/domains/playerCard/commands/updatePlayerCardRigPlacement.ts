import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { updatePlayerCardOverlayPlacement } from '@/server/db/playerCards.repo'
import { PlayerCardRig, UpdatePlayerCardRigPlacementInput } from '../types'
import { toPlayerCardRig } from '../helpers/toCardShapes'

export async function updatePlayerCardRigPlacement(
    supabase: DBClient,
    p: UpdatePlayerCardRigPlacementInput,
): Promise<Result<PlayerCardRig>> {
    try {
        const saved = await updatePlayerCardOverlayPlacement(supabase, {
            playerId: p.playerId,
            seasonNumber: p.seasonNumber,
            groupId: p.groupId,
            slot: 'rig',
            placement: p.placement,
        })
        if (!saved.ok) return saved
        if (!saved.value) return Err({ message: 'This player has no rig for this season and group', code: 'NOT_FOUND' })
        return Ok(toPlayerCardRig(saved.value))
    } catch (error) {
        logger.error({ error }, 'updatePlayerCardRigPlacement: unexpected error')
        return Err(serializeError(error))
    }
}
