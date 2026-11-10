import { DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findCardsBySeasonNumbers } from '@/server/db/playerCards.repo'
import { TeamCard } from '../types'

export async function getTeamCards(supabase: DBClient, p: { seasonNumbers: number[] }): Promise<Result<TeamCard[]>> {
    try {
        const rows = await findCardsBySeasonNumbers(supabase, p.seasonNumbers)
        if (!rows.ok) {
            logger.error({ seasonNumbers: p.seasonNumbers, error: rows.error }, 'Failed to fetch team cards')
            return rows
        }
        return Ok(rows.value.map(row => ({
            playerId: row.player_id,
            seasonNumber: row.season_number,
            groupId: row.group_id,
            groupName: row.group.name,
            ovr: row.ovr,
            teamName: row.team?.name ?? null,
            imageUrl: row.image_url,
            width: row.group.canvas_width,
            height: row.group.canvas_height,
        })))
    } catch (error) {
        logger.error({ error, seasonNumbers: p.seasonNumbers }, 'Unexpected error fetching team cards')
        return Err(serializeError(error))
    }
}
