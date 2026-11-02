import { Err, Ok, Result } from '@/shared/types/result'
import { CardBulkJobRow, CardBulkJobUpdate, DBClient } from '@/shared/types/db'
import type { Json } from '@/database.types'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findCardBulkJobById, updateCardBulkJob } from '@/server/db/cardBulkJobs.repo'
import type { OverallConfig, OverallInputRow } from '@/server/domains/overall/types'
import { CardBulkFailure, PlayerCard } from '../types'
import { buildCardData } from '../helpers/buildCardData'
import { renderAndSaveCard } from '../helpers/renderAndSaveCard'

export const BULK_PAUSE_MS = 1500
export const BULK_MAX_CONSECUTIVE_FAILURES = 10

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

async function readJob(admin: DBClient, jobId: string): Promise<Result<CardBulkJobRow | null>> {
    try {
        const job = await findCardBulkJobById(admin, jobId)
        if (!job.ok) logger.error({ jobId, error: job.error }, 'runCardBulkJob: job read failed')
        return job
    } catch (error) {
        logger.error({ jobId, error }, 'runCardBulkJob: job read threw')
        return Err(serializeError(error))
    }
}

async function writeJob(admin: DBClient, jobId: string, patch: CardBulkJobUpdate): Promise<void> {
    try {
        const written = await updateCardBulkJob(admin, jobId, patch)
        if (!written.ok) logger.error({ jobId, error: written.error }, 'runCardBulkJob: job write failed')
    } catch (error) {
        logger.error({ jobId, error }, 'runCardBulkJob: job write threw')
    }
}

export async function runCardBulkJob(admin: DBClient, p: {
    jobId: string
    seasonNumber: number
    groupId: string
    players: OverallInputRow[]
    config: OverallConfig
    startedBy: string
    sleep?: (ms: number) => Promise<void>
}): Promise<void> {
    const { jobId, seasonNumber, groupId, players, config, startedBy } = p
    const sleep = p.sleep ?? wait

    let done = 0
    let failed = 0
    let streak = 0
    const failures: CardBulkFailure[] = []

    const progress = () => ({ done, failed, failures: failures as unknown as Json })
    const finish = (status: 'completed' | 'stopped', stopReason: string | null = null) =>
        writeJob(admin, jobId, {
            ...progress(),
            status,
            stop_reason: stopReason,
            current_username: null,
            finished_at: new Date().toISOString(),
        })

    const renderOne = async (player: OverallInputRow): Promise<Result<PlayerCard>> => {
        try {
            return await renderAndSaveCard(admin, {
                seasonNumber,
                groupId,
                subject: player,
                data: buildCardData(player, config, seasonNumber),
                ensurePlayerId: async () => Ok(player.playerId),
                strictImages: true,
                generatedBy: startedBy,
            })
        } catch (error) {
            return Err(serializeError(error))
        }
    }

    for (const [index, player] of players.entries()) {
        const job = await readJob(admin, jobId)
        if (job.ok) {
            if (!job.value || job.value.status !== 'running') return
            if (job.value.stop_requested) {
                await finish('stopped')
                return
            }
        }

        await writeJob(admin, jobId, { current_username: player.username, heartbeat_at: new Date().toISOString() })

        const startedAt = Date.now()
        const result = await renderOne(player)
        logger.info({ jobId, playerId: player.playerId, ms: Date.now() - startedAt, ok: result.ok }, 'runCardBulkJob: card finished')

        done++
        if (result.ok) {
            streak = 0
        } else {
            failed++
            streak++
            failures.push({ playerId: player.playerId, username: player.username, message: result.error.message })
        }
        await writeJob(admin, jobId, { ...progress(), heartbeat_at: new Date().toISOString() })

        if (streak >= BULK_MAX_CONSECUTIVE_FAILURES) {
            await finish('stopped', `Stopped after ${BULK_MAX_CONSECUTIVE_FAILURES} failures in a row`)
            return
        }

        if (index < players.length - 1) await sleep(BULK_PAUSE_MS)
    }

    await finish('completed')
}
