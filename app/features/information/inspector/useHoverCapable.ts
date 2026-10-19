"use client"

import { useSyncExternalStore } from 'react'

const QUERY = '(hover: hover) and (min-width: 768px)'

function subscribe(onChange: () => void): () => void {
    const media = window.matchMedia(QUERY)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
}

export function useHoverCapable(): boolean {
    return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true)
}
