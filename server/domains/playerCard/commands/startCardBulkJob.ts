import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { runInBackground } from '@/server/utils/runInBackground'
import { insertCardBulkJob } from '@/server/db/cardBulkJobs.repo'
import { findPlayerIdsWithCards } from '@/server/db/playerCards.repo'
import { getOverallConfig } from '@/server/domains/overall'
import type { OverallInputRow } from '@/server/domains/overall'
import { CardBulkJob, CardBulkMode } from '../types'
import { getCardCatalog } from '../queries/getCardCatalog'
import { buildCardData } from '../helpers/buildCardData'
import { bulkStartProblem, selectBulkPlayers, toCardBulkJob } from '../helpers/bulkJob'
import { expireStaleBulkJobs } from '../helpers/bulkLock'
import { runCardBulkJob } from './runCardBulkJob'

export async function startCardBulkJob(admin: DBClient, p: {
    seasonNumber: number
    regionCode: string
    groupId: string
    mode: CardBulkMode
    rows: OverallInputRow[]
    startedBy: string
}): Promise<Result<CardBulkJob>> {
    try {
        const { seasonNumber, groupId, mode, startedBy } = p
        const regionCode = p.regionCode.toUpperCase()

        const expired = await expireStaleBulkJobs(admin)
        if (!expired.ok) return expired

        const catalog = await getCardCatalog(admin)
        if (!catalog.ok) return catalog

        const config = await getOverallConfig(admin, seasonNumber)
        if (!config.ok) return config

        let existingPlayerIds: string[] = []
        if (mode === 'missing') {
            const existing = await findPlayerIdsWithCards(admin, { seasonNumber, groupId })
            if (!existing.ok) return existing
            existingPlayerIds = existing.value
        }

        const players = selectBulkPlayers(p.rows, { regionCode, mode, existingPlayerIds })
        const problem = bulkStartProblem({
            group: catalog.value.find(group => group.id === groupId),
            players,
            ovrOf: player => buildCardData(player, config.value, seasonNumber).ovr,
        })
        if (problem) return Err({ message: problem, code: 'VALIDATION_ERROR' })

        const job = await insertCardBulkJob(admin, {
            season_number: seasonNumber,
            region_code: regionCode,
            group_id: groupId,
            mode,
            total: players.length,
            started_by: startedBy,
        })
        if (!job.ok) return job

        runInBackground(
            () => runCardBulkJob(admin, { jobId: job.value.id, seasonNumber, groupId, players, config: config.value, startedBy }),
            'runCardBulkJob',
        )

        return Ok(toCardBulkJob(job.value))
    } catch (error) {
        return Err(serializeError(error))
    }
}
