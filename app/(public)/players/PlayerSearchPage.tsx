"use client"

import { useState } from "react"
import { Users, Search, X, AlertCircle } from "lucide-react"
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader"
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue"
import { usePlayerSearch } from "@/app/hooks/usePlayerSearch"
import { useRecentPlayers } from "@/app/hooks/useRecentPlayers"
import { PlayerTable, PlayerTableSkeleton } from "@/app/features/players/PlayerTable"

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
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-6 sm:px-6 lg:px-8">
            <PublicPageHeader
                icon={Users}
                title="Players"
                subtitle="Search players across every region and season"
            />

            {/* Search — the focal element. Debounced; Enter submits immediately as an accessible fallback. */}
            <form onSubmit={e => e.preventDefault()} role="search" className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    autoFocus
                    aria-label="Search players by name"
                    placeholder="Search by username or display name..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="h-12 w-full rounded-sm border border-input bg-card pl-12 pr-11 text-base text-foreground transition-shadow placeholder:text-muted-foreground focus:border-ring/60 focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
                {query && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </form>

            {/* Results — aria-live so screen readers hear updates as the user types */}
            <div aria-live="polite" aria-busy={loading}>
                {searchFailed ? (
                    /* A failed fetch must never render as "no players found" — that answers the
                       user's question wrongly and confidently. */
                    <div className="flex flex-col items-center justify-center space-y-3 py-20">
                        <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                            Couldn&apos;t load search results.
                        </p>
                        <button
                            type="button"
                            onClick={() => retry()}
                            className="rounded-sm border border-input bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Try again
                        </button>
                    </div>
                ) : loading && list.length === 0 ? (
                    <PlayerTableSkeleton />
                ) : hasQuery && list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 py-20">
                        <Search className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No players found for &ldquo;{debounced}&rdquo;.</p>
                    </div>
                ) : !hasQuery && list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 py-20">
                        <Users className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Start typing a player&apos;s name to search.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* The default list is otherwise unexplained — the user can't tell what
                            they're looking at before they type. */}
                        <p className="px-1 text-xs text-muted-foreground">
                            {hasQuery
                                ? `${list.length} result${list.length === 1 ? "" : "s"}`
                                : "Recently added players"}
                        </p>
                        <p className="sr-only">{list.length} player{list.length === 1 ? "" : "s"} found.</p>
                        <PlayerTable players={list} />
                    </div>
                )}
            </div>
        </div>
    )
}
