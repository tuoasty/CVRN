"use client";

import { useMemo } from "react";
import LeaderboardFilterBar from "@/app/features/leaderboard/LeaderboardFilterBar";
import LeaderboardTable from "@/app/features/leaderboard/LeaderboardTable";
import { matchesPlayerQuery, useLeaderboardFilters } from "@/app/features/leaderboard/useLeaderboardFilters";
import type { PlayerLeaderboardRow } from "@/server/domains/player";

export default function TeamStatsSection({ rows }: { rows: PlayerLeaderboardRow[] }) {
    const { filters, setView, setSort, setQuery } = useLeaderboardFilters();

    const shownCount = useMemo(
        () => rows.filter(r => matchesPlayerQuery(r, filters.q)).length,
        [rows, filters.q],
    );

    return (
        <div className="space-y-3">
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
                emptyMessage="No player stats recorded for this team yet."
            />
        </div>
    );
}
