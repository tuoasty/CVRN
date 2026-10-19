"use client"

import { useEffect, useRef } from 'react'

export default function FilmstripScroller({ className, children }: { className?: string; children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = ref.current
        const current = el?.querySelector<HTMLElement>('[aria-current="page"]')?.closest('li')
        if (!el || !current) return
        el.scrollLeft = current.offsetLeft - (el.clientWidth - current.clientWidth) / 2
    }, [])

    return <div ref={ref} className={className}>{children}</div>
}
