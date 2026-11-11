"use client";

import {useMemo} from "react";
import Link from "next/link";
import {ArrowRight, Loader2} from "lucide-react";
import {format} from "date-fns";
import {PublicPageHeader} from "@/app/components/public/PublicPageHeader";
import LeaderboardFilterBar, {LEADERBOARD_TABS_ID, LeaderboardCount} from "@/app/features/leaderboard/LeaderboardFilterBar";
import {viewPanelId, viewTabId} from "@/app/components/filters/ViewTabs";
import LeaderboardTable from "@/app/features/leaderboard/LeaderboardTable";
import {
    matchesPlayerQuery,
    matchesPosition,
    useLeaderboardFilters,
} from "@/app/features/leaderboard/useLeaderboardFilters";
import {useRangedLeaderboard} from "@/app/hooks/useRangedLeaderboard";
import {useDataFreshness} from "@/app/hooks/useDataFreshness";
import FreshnessBanner from "@/app/components/public/FreshnessBanner";
import type {PlayerLeaderboardRow} from "@/server/domains/player";
import type {SeasonWithPlayoffConfig} from "@/server/domains/season";
import type {Region} from "@/shared/types/db";

type Props = {
    rows: PlayerLeaderboardRow[];
    season: SeasonWithPlayoffConfig;
    region: Region;
    statsVersion: number;
};

export default function SeasonLeaderboardPage({rows, season, region, statsVersion}: Props) {
    const {filters, setView, setSort, setQuery, setRange, setPosition} = useLeaderboardFilters();
    const {stale, refresh} = useDataFreshness({tag: "stats", baseline: statsVersion});

    const {rows: rangedRows, isLoading: rangedLoading, active: rangeActive} =
        useRangedLeaderboard(season.id, region.id, filters.range);

    const activeRows = useMemo(
        () => (rangeActive ? (rangedRows ?? []) : rows),
        [rangeActive, rangedRows, rows]
    );

    const pool = useMemo(
        () => activeRows.filter(r => matchesPosition(r, filters.position)),
        [activeRows, filters.position]
    );

    const shownCount = useMemo(
        () => pool.filter(r => matchesPlayerQuery(r, filters.q)).length,
        [pool, filters.q]
    );

    const rangeLabel =
        rangeActive && filters.range.from && filters.range.to
            ? `${format(new Date(filters.range.from), "MMM d")} – ${format(new Date(new Date(filters.range.to).getTime() - 1), "MMM d")}`
            : null;

    const subtitle = `${region.code.toUpperCase()} · ${season.name}${rangeLabel ? ` · ${rangeLabel}` : ""}`;

    return (
        <div className="page-bleed py-6 space-y-6">
            <PublicPageHeader
                title="Leaderboard"
                subtitle={subtitle}
                actions={
                    <div className="flex flex-col-reverse items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                        <LeaderboardCount total={pool.length} shown={shownCount} />
                        <Link
                            href="/leaderboard"
                            className="inline-flex h-9 items-center gap-1.5 rounded-[2px] border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                        >
                            See all-time
                            <ArrowRight className="h-4 w-4" aria-hidden />
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
                position={filters.position}
                onPositionChange={setPosition}
                range={filters.range}
                onRangeChange={setRange}
            />

            <div
                id={viewPanelId(LEADERBOARD_TABS_ID)}
                role="tabpanel"
                aria-labelledby={viewTabId(LEADERBOARD_TABS_ID, filters.view)}
                className="relative"
            >
                {rangeActive && rangedLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
                    </div>
                )}
                <LeaderboardTable
                    rows={pool}
                    filters={filters}
                    onSort={setSort}
                    onClearSearch={() => setQuery("")}
                    emptyMessage={
                        rangeActive
                            ? "No player stats in the selected dates."
                            : "No player stats recorded for this season yet."
                    }
                />
            </div>
        </div>
    );
}
