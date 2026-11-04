import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findPlayerCardOverlay } from '@/server/db/playerCards.repo'
import { PlayerCardRig, PlayerCardRigKey } from '../types'
import { toPlayerCardRig } from '../helpers/toCardShapes'

export async function getPlayerCardRig(supabase: DBClient, p: PlayerCardRigKey): Promise<Result<PlayerCardRig | null>> {
    try {
        const row = await findPlayerCardOverlay(supabase, { ...p, slot: 'rig' })
        if (!row.ok) return row
        return Ok(row.value ? toPlayerCardRig(row.value) : null)
    } catch (error) {
        return Err(serializeError(error))
    }
}
