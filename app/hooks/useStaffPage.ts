import useSWR from 'swr'
import { getStaffPageAction } from '@/app/actions/staff.actions'
import type { StaffPage } from '@/server/domains/staff/types'

export const STAFF_PAGE_KEY = 'admin/staff'

async function fetchStaffPage(): Promise<StaffPage> {
    const result = await getStaffPageAction()
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

export function useStaffPage() {
    const { data, error, isLoading, mutate } = useSWR(STAFF_PAGE_KEY, fetchStaffPage, {
        revalidateOnFocus: false,
    })
    return { page: data ?? null, isLoading, error: error?.message ?? null, mutate }
}
