import useSWRInfinite from 'swr/infinite'
import { getAuditLogAction } from '@/app/actions/audit.actions'
import type { AuditKind, AuditOutcome, AuditPage } from '@/server/domains/audit/types'

export type AuditFilters = {
    userId: string | null
    action: string
    kind: AuditKind | null
    outcome: AuditOutcome | null
}

type AuditKey = readonly ['admin/audit', string | null, string, AuditKind | null, AuditOutcome | null, number | null]

async function fetchAuditPage([, userId, action, kind, outcome, before]: AuditKey): Promise<AuditPage> {
    const result = await getAuditLogAction({
        userId: userId ?? undefined,
        action: action || undefined,
        kind: kind ?? undefined,
        outcome: outcome ?? undefined,
        before: before ?? undefined,
    })
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

export function useAuditLog(filters: AuditFilters) {
    const getKey = (index: number, previous: AuditPage | null): AuditKey | null => {
        if (previous && previous.nextCursor === null) return null
        const before = index === 0 ? null : previous?.nextCursor ?? null
        return ['admin/audit', filters.userId, filters.action.trim(), filters.kind, filters.outcome, before]
    }

    const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(getKey, fetchAuditPage, {
        revalidateOnFocus: false,
        revalidateFirstPage: false,
    })

    const pages = data ?? []
    const last = pages[pages.length - 1]
    return {
        entries: pages.flatMap(p => p.entries),
        people: pages[0]?.people ?? [],
        hasMore: !!last && last.nextCursor !== null,
        isLoading,
        isLoadingMore: isValidating && size > pages.length,
        error: error?.message ?? null,
        loadMore: () => setSize(size + 1),
        mutate,
    }
}
