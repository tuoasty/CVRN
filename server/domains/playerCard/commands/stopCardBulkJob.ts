import { Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { requestCardBulkStop } from '@/server/db/cardBulkJobs.repo'

export function stopCardBulkJob(admin: DBClient, jobId: string): Promise<Result<null>> {
    return requestCardBulkStop(admin, jobId)
}
