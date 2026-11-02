import { Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { findLatestCardBulkJob } from '@/server/db/cardBulkJobs.repo'
import { CardBulkJob } from '../types'
import { toCardBulkJob } from '../helpers/bulkJob'
import { expireStaleBulkJobs } from '../helpers/bulkLock'

export async function getCardBulkStatus(admin: DBClient): Promise<Result<CardBulkJob | null>> {
    const expired = await expireStaleBulkJobs(admin)
    if (!expired.ok) return expired

    const latest = await findLatestCardBulkJob(admin)
    if (!latest.ok) return latest
    return Ok(latest.value ? toCardBulkJob(latest.value) : null)
}
