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
import {useDataFreshness} from "@/app/hooks/useDataFreshness";
import FreshnessBanner from "@/app/components/public/FreshnessBanner";
import type {PlayerLeaderboardRow} from "@/server/domains/player";

type Props = {

    rows: PlayerLeaderboardRow[];
    statsVersion: number;
};

export default function AllTimeLeaderboardPage({rows, statsVersion}: Props) {
    const {filters, setView, setSort, setRegion, setQuery, toggleSeason, clearSeasons} =
        useLeaderboardFilters();
    const {stale, refresh} = useDataFreshness({tag: "stats", baseline: statsVersion});

    const lastContext = useLastSeasonContext();

    const cohorts = useMemo(() => deriveSeasonCohorts(rows), [rows]);

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

            <FreshnessBanner
                stale={stale}
                onRefresh={refresh}
                message="Updated stats have been published."
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

                showRegion={filters.region === REGION_ALL}
                emptyMessage="No career stats recorded yet."
            />
        </div>
    );
}
