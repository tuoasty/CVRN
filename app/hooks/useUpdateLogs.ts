import useSWR, { mutate as globalMutate } from 'swr'
import { getUpdateLogsForAdminAction } from '@/app/actions/updateLog.actions'
import type { UpdateLogListItem } from '@/server/domains/updateLog'

const UPDATE_LOGS_TTL = 2 * 60 * 1000

const ADMIN_KEY = 'update-logs/admin'

async function fetchAdmin(): Promise<UpdateLogListItem[]> {
    const result = await getUpdateLogsForAdminAction()
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

export function useAdminUpdateLogs() {
    const { data, error, isLoading, mutate } = useSWR(ADMIN_KEY, fetchAdmin, {
        dedupingInterval: UPDATE_LOGS_TTL,
        revalidateOnFocus: false,
    })
    return { logs: data ?? [], isLoading, error: error?.message ?? null, mutate }
}

export async function mutateUpdateLogs() {
    await globalMutate(ADMIN_KEY)
}
