"use client";

import {useMemo} from "react";
import Link from "next/link";
import {ArrowRight, Trophy} from "lucide-react";
import {PublicPageHeader} from "@/app/components/public/PublicPageHeader";
import LeaderboardFilterBar from "@/app/features/leaderboard/LeaderboardFilterBar";
import LeaderboardTable from "@/app/features/leaderboard/LeaderboardTable";
import {
    matchesPlayerQuery,
    useLeaderboardFilters,
} from "@/app/features/leaderboard/useLeaderboardFilters";
import type {PlayerLeaderboardRow} from "@/server/domains/player";
import type {SeasonWithPlayoffConfig} from "@/server/domains/season";
import type {Region} from "@/shared/types/db";

type Props = {
    rows: PlayerLeaderboardRow[];
    season: SeasonWithPlayoffConfig;
    region: Region;
};

/**
 * Presentational only. Rows are fetched and cached on the server by the route above;
 * view, sort and search are the only state here, and all three are pure client work
 * over a fixed row set.
 */
export default function SeasonLeaderboardPage({rows, season, region}: Props) {
    const {filters, setView, setSort, setQuery} = useLeaderboardFilters();

    const shownCount = useMemo(
        () => rows.filter(r => matchesPlayerQuery(r, filters.q)).length,
        [rows, filters.q]
    );

    return (
        <div className="page-bleed py-6 space-y-6">
            <PublicPageHeader
                icon={Trophy}
                title="Leaderboard"
                subtitle={`${region.code.toUpperCase()} · ${season.name}`}
                actions={
                    // The all-time board has no navbar entry: it answers a follow-up to
                    // this page rather than a question of its own, and it is reached from
                    // here. The route stays directly linkable for sharing.
                    <Link
                        href="/leaderboard"
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-border text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        See all-time
                        <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                }
            />

            <LeaderboardFilterBar
                view={filters.view}
                query={filters.q}
                onViewChange={setView}
                onQueryChange={setQuery}
                totalCount={rows.length}
                shownCount={shownCount}
            />

            <LeaderboardTable
                rows={rows}
                filters={filters}
                onSort={setSort}
                onClearSearch={() => setQuery("")}
                emptyMessage="No player stats recorded for this season yet."
            />
        </div>
    );
}
