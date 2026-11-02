import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { expireStaleCardBulkJobs, findRunningCardBulkJob } from '@/server/db/cardBulkJobs.repo'
import { findCardTemplateById } from '@/server/db/playerCards.repo'

export const BULK_STALE_MS = 5 * 60 * 1000

const BULK_LOCK_MESSAGE = 'A bulk generation is running. Wait for it to finish or stop it.'

export function expireStaleBulkJobs(admin: DBClient): Promise<Result<null>> {
    const now = Date.now()
    return expireStaleCardBulkJobs(admin, new Date(now - BULK_STALE_MS).toISOString(), new Date(now).toISOString())
}

export async function assertNoRunningBulk(
    client: DBClient,
    scope?: { groupId?: string; templateId?: string },
): Promise<Result<null>> {
    const running = await findRunningCardBulkJob(client)
    if (!running.ok) return running
    if (!running.value) return Ok(null)

    const blocked = Err({ message: BULK_LOCK_MESSAGE, code: 'CONFLICT' as const })
    if (!scope) return blocked
    if (scope.groupId) return scope.groupId === running.value.group_id ? blocked : Ok(null)
    if (scope.templateId) {
        const tier = await findCardTemplateById(client, scope.templateId)
        if (!tier.ok) return tier
        return tier.value?.group_id === running.value.group_id ? blocked : Ok(null)
    }
    return blocked
}
