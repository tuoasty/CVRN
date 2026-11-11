"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue"
import { usePlayerSearch } from "@/app/hooks/usePlayerSearch"
import { useRecentPlayers } from "@/app/hooks/useRecentPlayers"
import { PlayerTable, PlayerTableSkeleton } from "@/app/features/players/PlayerTable"

function Message({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-col items-center gap-3 py-20 text-center text-sm text-muted-foreground">{children}</div>
}

export default function PlayerSearchPage() {
    const [query, setQuery] = useState("")
    const debounced = useDebouncedValue(query.trim(), 300)

    const { players, isLoading, error, retry } = usePlayerSearch(debounced)
    const { players: recent, isLoading: recentLoading } = useRecentPlayers()

    const hasQuery = debounced.length > 0
    const list = hasQuery ? players : recent
    const loading = hasQuery ? isLoading : recentLoading
    const searchFailed = hasQuery && !!error

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Players</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Every player across all regions and seasons</p>

            <form onSubmit={e => e.preventDefault()} role="search" className="relative mt-6 w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                    type="text"
                    autoFocus
                    aria-label="Search players by name"
                    placeholder="Search by username or display name"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === "Escape") setQuery("")
                    }}
                    className="h-11 w-full rounded-[2px] border border-border bg-transparent pl-10 pr-11 text-base text-foreground transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground dark:bg-input/30 sm:text-sm"
                />
                {query && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                )}
            </form>

            <div aria-live="polite" aria-busy={loading} className="mt-8">
                {searchFailed ? (
                    <Message>
                        <p>Couldn&apos;t load search results.</p>
                        <button
                            type="button"
                            onClick={() => retry()}
                            className="h-9 rounded-[2px] border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                        >
                            Try again
                        </button>
                    </Message>
                ) : loading && list.length === 0 ? (
                    <PlayerTableSkeleton />
                ) : hasQuery && list.length === 0 ? (
                    <Message>
                        <p>No players found for &ldquo;{debounced}&rdquo;.</p>
                    </Message>
                ) : !hasQuery && list.length === 0 ? (
                    <Message>
                        <p>Start typing a player&apos;s name to search.</p>
                    </Message>
                ) : (
                    <>
                        <h2 className="mb-3 text-sm font-semibold text-foreground">
                            {hasQuery ? (
                                <>
                                    <span className="font-mono tabular-nums">{list.length}</span> result{list.length === 1 ? "" : "s"}
                                </>
                            ) : (
                                "Recently added"
                            )}
                        </h2>
                        <PlayerTable players={list} />
                    </>
                )}
            </div>
        </div>
    )
}
