import { useCallback, useRef, useState } from 'react'
import { toSlug } from '@/app/utils/matchDetailHref'

export const SLUG_MAX_LENGTH = 80

function normalizeSlugInput(v: string): string {
    return v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '').slice(0, SLUG_MAX_LENGTH)
}

export function useSlugField() {
    const [shortName, setShortNameState] = useState('')
    const [slug, setSlugState] = useState('')
    const slugEditedRef = useRef(false)

    const setShortName = useCallback((v: string) => {
        setShortNameState(v)
        if (!slugEditedRef.current) setSlugState(toSlug(v).slice(0, SLUG_MAX_LENGTH))
    }, [])

    const setSlug = useCallback((v: string) => {
        slugEditedRef.current = true
        setSlugState(normalizeSlugInput(v))
    }, [])

    const reset = useCallback(() => {
        slugEditedRef.current = false
        setShortNameState('')
        setSlugState('')
    }, [])

    const setInitialSlug = useCallback((s: string) => {
        slugEditedRef.current = false
        setShortNameState('')
        setSlugState(s)
    }, [])

    return { shortName, slug, canonicalSlug: toSlug(slug).slice(0, SLUG_MAX_LENGTH), setShortName, setSlug, reset, setInitialSlug }
}
