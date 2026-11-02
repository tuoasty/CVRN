import useSWR from 'swr';
import { getAdminDashboardAction } from '@/app/actions/admin.actions';
import type { DashboardColumn } from '@/server/domains/admin';

export const ADMIN_DASHBOARD_KEY = 'admin/dashboard';

async function fetchAdminDashboard(): Promise<DashboardColumn[]> {
    const result = await getAdminDashboardAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useAdminDashboard() {
    const { data, error, isLoading, mutate } = useSWR(ADMIN_DASHBOARD_KEY, fetchAdminDashboard);

    return {
        columns: data ?? [],
        isLoading,
        failed: Boolean(error) && data === undefined,
        refresh: () => { void mutate(); },
    };
}
