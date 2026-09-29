import { Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { findChampionGfxBySeasonId } from '@/server/db/mediaPost.repo'
import { MediaPost } from '../types'

export async function getSeasonChampionGfx(supabase: DBClient, seasonId: string): Promise<Result<MediaPost | null>> {
    return findChampionGfxBySeasonId(supabase, seasonId)
}
