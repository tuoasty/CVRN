"use client";

import {Trophy} from "lucide-react";
import {PublicPageHeader} from "@/app/components/public/PublicPageHeader";
import LeaderboardFilterBar from "@/app/features/leaderboard/LeaderboardFilterBar";
import LeaderboardTable from "@/app/features/leaderboard/LeaderboardTable";
import {useLeaderboardFilters} from "@/app/features/leaderboard/useLeaderboardFilters";
import type {PlayerLeaderboardRow} from "@/server/domains/player";
import type {SeasonWithPlayoffConfig} from "@/server/domains/season";
import type {Region} from "@/shared/types/db";

type Props = {
    rows: PlayerLeaderboardRow[];
    season: SeasonWithPlayoffConfig;
    region: Region;
};

/**
 * Presentational only. Rows are fetched and cached on the server by the route above; view
 * and sort are the only state here, and both are pure client work over a fixed row set.
 */
export default function LeaderboardPage({rows, season, region}: Props) {
    const {filters, setView, setSort} = useLeaderboardFilters();

    return (
        <div className="page-bleed py-6 space-y-6">
            <PublicPageHeader
                icon={Trophy}
                title="Leaderboard"
                subtitle={`${region.code.toUpperCase()} · ${season.name}`}
            />

            <LeaderboardFilterBar
                view={filters.view}
                resultCount={rows.length}
                onViewChange={setView}
            />

            <LeaderboardTable rows={rows} filters={filters} onSort={setSort} />
        </div>
    );
}
