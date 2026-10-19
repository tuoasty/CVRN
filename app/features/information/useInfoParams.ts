"use client"

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function useInfoParams() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const get = useCallback((key: string) => searchParams.get(key), [searchParams])

    const set = useCallback((patch: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams.toString())
        for (const [key, value] of Object.entries(patch)) {
            if (value === null) next.delete(key)
            else next.set(key, value)
        }
        const query = next.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }, [pathname, router, searchParams])

    return { get, set }
}
