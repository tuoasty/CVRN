"use client";

import {useMemo} from "react";
import Link from "next/link";
import {ArrowLeft, Trophy} from "lucide-react";
import {PublicPageHeader} from "@/app/components/public/PublicPageHeader";
import LeaderboardFilterBar from "@/app/features/leaderboard/LeaderboardFilterBar";
import LeaderboardTable from "@/app/features/leaderboard/LeaderboardTable";
import {aggregateCareerRows} from "@/app/features/leaderboard/aggregateCareerRows";
import {deriveSeasonCohorts} from "@/app/features/leaderboard/seasonCohorts";
import {
    matchesPlayerQuery,
    REGION_ALL,
    useLeaderboardFilters,
} from "@/app/features/leaderboard/useLeaderboardFilters";
import {useLastSeasonContext} from "@/app/hooks/useLastSeasonContext";
import type {PlayerLeaderboardRow} from "@/server/domains/player";

type Props = {
    /** One row per (player, season, region) — every season in the league. */
    rows: PlayerLeaderboardRow[];
};

/**
 * Career totals, one row per (player, region), summed over the selected seasons.
 *
 * Three filters, applied at three different points, because they answer different
 * questions:
 *
 * - **Seasons** choose what gets SUMMED. They come first, before aggregation, because
 *   the whole point is that a two-season career is a different number from a four-season
 *   one. This is why the page is handed per-season rows rather than a pre-summed view.
 * - **Region** chooses the POOL. "The NA board" is its own ranking, so rank 1 under NA is
 *   the best NA player, not whichever NA player happens to place highest globally.
 * - **Search** only hides rows from a pool that has already been ranked, so a player's
 *   number stays the one he actually holds. Applied last, inside the table.
 */
export default function AllTimeLeaderboardPage({rows}: Props) {
    const {filters, setView, setSort, setRegion, setQuery, toggleSeason, clearSeasons} =
        useLeaderboardFilters();
    // Null on a first-ever visit (a shared link, say), so the fallback has to be a
    // destination that stands on its own rather than a broken season URL.
    const lastContext = useLastSeasonContext();

    const cohorts = useMemo(() => deriveSeasonCohorts(rows), [rows]);

    // A slug from a stale link that no longer exists is dropped rather than honoured,
    // which would otherwise empty the board with no explanation.
    const selectedSeasons = useMemo(
        () => filters.seasons.filter(slug => cohorts.some(c => c.slug === slug)),
        [filters.seasons, cohorts]
    );

    const careers = useMemo(() => {
        const scoped =
            selectedSeasons.length === 0
                ? rows
                : rows.filter(r => selectedSeasons.includes(r.season_slug));
        return aggregateCareerRows(scoped);
    }, [rows, selectedSeasons]);

    const pool = useMemo(
        () =>
            filters.region === REGION_ALL
                ? careers
                : careers.filter(r => r.region_code.toUpperCase() === filters.region),
        [careers, filters.region]
    );

    const shownCount = useMemo(
        () => pool.filter(r => matchesPlayerQuery(r, filters.q)).length,
        [pool, filters.q]
    );

    const scopeLabel =
        selectedSeasons.length === 0
            ? "every completed season"
            : selectedSeasons
                  .map(slug => cohorts.find(c => c.slug === slug)?.label ?? slug)
                  .join(" + ");
    const subtitle =
        filters.region === REGION_ALL
            ? `Career totals · ${scopeLabel}`
            : `${filters.region} · career totals · ${scopeLabel}`;

    return (
        <div className="page-bleed py-6 space-y-6">
            <PublicPageHeader
                icon={Trophy}
                title="All-Time Leaderboard"
                subtitle={subtitle}
                actions={
                    <Link
                        href={
                            lastContext
                                ? `/${lastContext.region}/${lastContext.season}/leaderboard`
                                : "/select?next=leaderboard"
                        }
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-border text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Season board
                    </Link>
                }
            />

            <LeaderboardFilterBar
                view={filters.view}
                query={filters.q}
                onViewChange={setView}
                onQueryChange={setQuery}
                totalCount={pool.length}
                shownCount={shownCount}
                region={filters.region}
                onRegionChange={setRegion}
                cohorts={cohorts}
                selectedSeasons={selectedSeasons}
                onToggleSeason={toggleSeason}
                onClearSeasons={clearSeasons}
            />

            <LeaderboardTable
                rows={pool}
                filters={filters}
                onSort={setSort}
                onClearSearch={() => setQuery("")}
                // A career is never merged across regions, so with "All" selected a player
                // who moved leagues holds one row per region and the column earns its place.
                showRegion={filters.region === REGION_ALL}
                emptyMessage="No career stats recorded yet."
            />
        </div>
    );
}
