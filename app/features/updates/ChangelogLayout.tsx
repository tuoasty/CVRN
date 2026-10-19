"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChangelogToc, TocEntry } from './changelog/extractToc'
import { activeTocId, OVERVIEW_ID } from './changelog/tocNavigation'

const GAP = 16

interface Props {
    toc: ChangelogToc
    version: string
    title: string | null
    header: ReactNode
    footer: ReactNode
    rail?: ReactNode
    children: ReactNode
}

function stickyNav(): HTMLElement | null {
    return document.querySelector<HTMLElement>('header.sticky')
}

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function hashId(): string {
    try {
        return decodeURIComponent(window.location.hash.slice(1))
    } catch {
        return ''
    }
}

function ExpandAllButton({ allOpen, onClick, className }: { allOpen: boolean; onClick: () => void; className?: string }) {
    const Icon = allOpen ? ChevronsDownUp : ChevronsUpDown
    return (
        <Button variant="ghost" size="sm" onClick={onClick} className={cn('gap-1.5 rounded-sm text-muted-foreground', className)}>
            <Icon className="h-4 w-4" />
            {allOpen ? 'Collapse all' : 'Expand all'}
        </Button>
    )
}

export default function ChangelogLayout({ toc, version, title, header, footer, rail, children }: Props) {
    const contentRef = useRef<HTMLDivElement>(null)
    const [navHeight, setNavHeight] = useState<number | null>(null)
    const entries = useMemo<TocEntry[]>(
        () => (toc.overview && toc.entries.length > 0
            ? [{ id: OVERVIEW_ID, text: 'Overview', depth: 1 }, ...toc.entries]
            : toc.entries),
        [toc],
    )
    const [active, setActive] = useState<string | null>(() => entries[0]?.id ?? null)
    const [allOpen, setAllOpen] = useState(false)
    const hasToc = toc.entries.length > 0
    const hasToggles = toc.toggleCount > 0

    const scrollOffset = useCallback(() => {
        return (stickyNav()?.offsetHeight ?? 0) + GAP
    }, [])

    const reveal = useCallback((id: string, smooth: boolean) => {
        const target = document.getElementById(id)
        if (!target || !contentRef.current?.contains(target)) return
        let details = target.closest('details')
        while (details) {
            details.open = true
            details = details.parentElement?.closest('details') ?? null
        }
        window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - scrollOffset(),
            behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
        })
    }, [scrollOffset])

    const go = useCallback((id: string) => {
        window.history.pushState(window.history.state, '', `#${id}`)
        reveal(id, true)
    }, [reveal])

    useEffect(() => {
        const nav = stickyNav()
        if (!nav) return
        const measure = () => setNavHeight(nav.offsetHeight)
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(nav)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const onHash = () => {
            const id = hashId()
            if (id) reveal(id, false)
        }
        onHash()
        window.addEventListener('hashchange', onHash)
        return () => window.removeEventListener('hashchange', onHash)
    }, [reveal])

    useEffect(() => {
        const content = contentRef.current
        if (!content || !hasToggles) return
        const sync = () => {
            const all = Array.from(content.querySelectorAll('details'))
            setAllOpen(all.length > 0 && all.every(d => d.open))
        }
        sync()
        content.addEventListener('toggle', sync, true)
        return () => content.removeEventListener('toggle', sync, true)
    }, [hasToggles])

    useEffect(() => {
        const content = contentRef.current
        if (!content || !hasToc) return
        let frame = 0
        const update = () => {
            frame = 0
            const positions = entries.map(e => ({
                id: e.id,
                top: document.getElementById(e.id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
            }))
            const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
            setActive(activeTocId(positions, scrollOffset(), atBottom))
        }
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update)
        }
        update()
        window.addEventListener('scroll', schedule, { passive: true })
        window.addEventListener('resize', schedule)
        content.addEventListener('toggle', schedule, true)
        return () => {
            if (frame) cancelAnimationFrame(frame)
            window.removeEventListener('scroll', schedule)
            window.removeEventListener('resize', schedule)
            content.removeEventListener('toggle', schedule, true)
        }
    }, [entries, hasToc, scrollOffset])

    function toggleAll() {
        const content = contentRef.current
        if (!content) return
        const next = !allOpen
        content.querySelectorAll('details').forEach(d => { d.open = next })
        setAllOpen(next)
    }

    function isPlainClick(e: MouseEvent<HTMLAnchorElement>): boolean {
        return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
    }

    function onTocClick(e: MouseEvent<HTMLAnchorElement>, id: string) {
        if (!isPlainClick(e)) return
        e.preventDefault()
        go(id)
    }

    function onTopClick(e: MouseEvent<HTMLAnchorElement>) {
        if (!isPlainClick(e)) return
        e.preventDefault()
        if (window.location.hash) window.history.pushState(window.history.state, '', window.location.pathname + window.location.search)
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }

    const hasNav = hasToc || hasToggles
    const stickyStyle = navHeight !== null
        ? { top: navHeight + 24, maxHeight: `calc(100vh - ${navHeight + 48}px)` }
        : undefined
    const stickyClass = 'sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-8'

    if (!hasNav && !rail) {
        return (
            <div className="mx-auto max-w-3xl">
                {header}
                <div ref={contentRef}>{children}</div>
                {footer}
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-3xl lg:grid lg:max-w-none lg:grid-cols-[minmax(13rem,1fr)_minmax(0,48rem)_minmax(0,1fr)] lg:gap-x-10 xl:grid-cols-[minmax(13rem,1fr)_minmax(0,48rem)_minmax(13rem,1fr)]">
            {hasNav && (
                <aside className="hidden w-[13rem] justify-self-end lg:col-start-1 lg:row-start-1 lg:block">
                    <div className={cn(stickyClass, 'space-y-4')} style={stickyStyle}>
                        {hasToc && (
                            <nav aria-label="On this page">
                                <a
                                    href="#top"
                                    onClick={onTopClick}
                                    className="group mb-6 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <span className={cn(
                                        'block font-mono tabular-nums',
                                        title ? 'text-xs text-muted-foreground' : 'text-lg font-semibold text-foreground',
                                    )}>
                                        {version}
                                    </span>
                                    {title && (
                                        <span className="mt-0.5 block text-balance text-lg font-semibold leading-snug tracking-[-0.01em] text-foreground decoration-muted-foreground decoration-1 underline-offset-4 group-hover:underline">
                                            {title}
                                        </span>
                                    )}
                                </a>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
                                <ul className="mt-3 border-l border-border">
                                    {entries.map(entry => {
                                        const isActive = entry.id === active
                                        return (
                                            <li key={entry.id}>
                                                <a
                                                    href={`#${entry.id}`}
                                                    onClick={e => onTocClick(e, entry.id)}
                                                    aria-current={isActive ? 'location' : undefined}
                                                    className={cn(
                                                        '-ml-px block border-l-2 py-1 pr-2 text-sm transition-colors',
                                                        entry.depth === 2 ? 'pl-6' : 'pl-3',
                                                        isActive
                                                            ? 'border-foreground font-semibold text-foreground'
                                                            : 'border-transparent text-muted-foreground hover:text-foreground',
                                                    )}
                                                >
                                                    {entry.text}
                                                </a>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </nav>
                        )}
                        {hasToggles && <ExpandAllButton allOpen={allOpen} onClick={toggleAll} className="-ml-2.5" />}
                    </div>
                </aside>
            )}

            <div className="min-w-0 lg:col-start-2 lg:row-start-1">
                {header}
                <div ref={contentRef}>{children}</div>
                {footer}
            </div>

            {rail && (
                <aside className="hidden w-[13rem] justify-self-start xl:col-start-3 xl:row-start-1 xl:block">
                    <div className={stickyClass} style={stickyStyle}>{rail}</div>
                </aside>
            )}
        </div>
    )
}
