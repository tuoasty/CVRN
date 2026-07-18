"use client"

import { useState } from "react"
import { Users, Search, X } from "lucide-react"
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader"
import { Skeleton } from "@/app/components/ui/skeleton"
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue"
import { usePlayerSearch } from "@/app/hooks/usePlayerSearch"
import { useRecentPlayers } from "@/app/hooks/useRecentPlayers"
import PlayerSearchResultCard from "@/app/features/players/PlayerSearchResultCard"

function RowSkeleton() {
    return (
        <div className="panel p-4 flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-sm shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-sm" />
                <Skeleton className="h-3 w-24 rounded-sm" />
                <Skeleton className="h-3 w-32 rounded-sm" />
            </div>
        </div>
    )
}

export default function PlayerSearchPage() {
    const [query, setQuery] = useState("")
    const debounced = useDebouncedValue(query.trim(), 300)

    const { players, isLoading } = usePlayerSearch(debounced)
    const { players: recent, isLoading: recentLoading } = useRecentPlayers()

    const hasQuery = debounced.length > 0

    return (
        <div className="page-wide py-6 space-y-6">
            <PublicPageHeader
                icon={Users}
                title="Players"
                subtitle="Search players across every region and season"
            />

            {/* Search box — debounced; Enter submits immediately as an accessible fallback */}
            <form onSubmit={e => e.preventDefault()} role="search" className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    autoFocus
                    aria-label="Search players by name"
                    placeholder="Search by username or display name..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 text-sm rounded-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {query && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </form>

            {/* Results — aria-live so screen readers hear updates as the user types */}
            <div aria-live="polite" aria-busy={hasQuery ? isLoading : recentLoading}>
                {!hasQuery ? (
                    recentLoading && recent.length === 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[...Array(4)].map((_, i) => <RowSkeleton key={i} />)}
                        </div>
                    ) : recent.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <Users className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">Start typing a player&apos;s name to search.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground mb-3">Recently active players</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {recent.map(player => (
                                    <PlayerSearchResultCard key={player.id} player={player} />
                                ))}
                            </div>
                        </>
                    )
                ) : isLoading && players.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[...Array(4)].map((_, i) => <RowSkeleton key={i} />)}
                    </div>
                ) : players.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <Search className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No players found for &ldquo;{debounced}&rdquo;.</p>
                    </div>
                ) : (
                    <>
                        <p className="sr-only">{players.length} player{players.length === 1 ? "" : "s"} found.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {players.map(player => (
                                <PlayerSearchResultCard key={player.id} player={player} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
