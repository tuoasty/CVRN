"use client";

import LeaderboardTable from "@/app/features/leaderboard/LeaderboardTable";
import { useLeaderboardFilters } from "@/app/features/leaderboard/useLeaderboardFilters";
import StatViewSelector from "@/app/features/player/StatViewSelector";
import type { PlayerLeaderboardRow } from "@/server/domains/player";

export default function TeamStatsSection({ rows }: { rows: PlayerLeaderboardRow[] }) {
    const { filters, setView, setSort } = useLeaderboardFilters();

    return (
        <div className="space-y-3">
            <StatViewSelector value={filters.view} onChange={setView} />
            <LeaderboardTable
                rows={rows}
                filters={filters}
                onSort={setSort}
                onClearSearch={() => {}}
                emptyMessage="No player stats recorded for this team yet."
                flow
                showTeam={false}
            />
        </div>
    );
}
