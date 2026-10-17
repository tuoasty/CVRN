"use client"

import { useEffect } from 'react'

function isTyping(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    if (target.isContentEditable) return true
    return target.closest('input, textarea, select, [role="combobox"]') !== null
}

export function useListKeys(onMove: (delta: 1 | -1) => void, onFocusFilter: () => void) {
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
            if (event.key === 'j' || event.key === 'J') { event.preventDefault(); onMove(1) }
            else if (event.key === 'k' || event.key === 'K') { event.preventDefault(); onMove(-1) }
            else if (event.key === '/') { event.preventDefault(); onFocusFilter() }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onMove, onFocusFilter])
}
