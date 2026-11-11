"use client";

import {useMemo} from "react";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {PublicPageHeader} from "@/app/components/public/PublicPageHeader";
import LeaderboardFilterBar, {LEADERBOARD_TABS_ID, LeaderboardCount} from "@/app/features/leaderboard/LeaderboardFilterBar";
import {viewPanelId, viewTabId} from "@/app/components/filters/ViewTabs";
import LeaderboardTable from "@/app/features/leaderboard/LeaderboardTable";
import {aggregateCareerRows} from "@/app/features/leaderboard/aggregateCareerRows";
import {deriveSeasonCohorts} from "@/app/features/leaderboard/seasonCohorts";
import {
    matchesPlayerQuery,
    matchesPosition,
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
    const {filters, setView, setSort, setRegion, setPosition, setQuery, setSeasons} = useLeaderboardFilters();
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

    const pool = useMemo(() => {
        const byRegion =
            filters.region === REGION_ALL
                ? careers
                : careers.filter(r => r.region_code.toUpperCase() === filters.region);
        return byRegion.filter(r => matchesPosition(r, filters.position));
    }, [careers, filters.region, filters.position]);

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
                title="All-Time Leaderboard"
                subtitle={subtitle}
                actions={
                    <div className="flex flex-col-reverse items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                        <LeaderboardCount total={pool.length} shown={shownCount} />
                        <Link
                            href={
                                lastContext
                                    ? `/${lastContext.region}/${lastContext.season}/leaderboard`
                                    : "/select?next=leaderboard"
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-[2px] border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden />
                            Season board
                        </Link>
                    </div>
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
                region={filters.region}
                onRegionChange={setRegion}
                position={filters.position}
                onPositionChange={setPosition}
                cohorts={cohorts}
                selectedSeasons={selectedSeasons}
                onSeasonsChange={setSeasons}
            />

            <div
                id={viewPanelId(LEADERBOARD_TABS_ID)}
                role="tabpanel"
                aria-labelledby={viewTabId(LEADERBOARD_TABS_ID, filters.view)}
            >
                <LeaderboardTable
                    rows={pool}
                    filters={filters}
                    onSort={setSort}
                    onClearSearch={() => setQuery("")}

                    showRegion={filters.region === REGION_ALL}
                    emptyMessage="No career stats recorded yet."
                />
            </div>
        </div>
    );
}
