import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { findChampionGfxBySeasonId } from '@/server/db/mediaPost.repo'

export async function assertChampionSlotFree(
    supabase: DBClient,
    seasonId: string,
): Promise<Result<void>> {
    const existing = await findChampionGfxBySeasonId(supabase, seasonId)
    if (!existing.ok) return existing

    if (existing.value) {
        return Err({
            message: 'A champion GFX already exists for this season. Delete it first.',
            code: 'VALIDATION_ERROR',
        })
    }

    return Ok(undefined)
}
