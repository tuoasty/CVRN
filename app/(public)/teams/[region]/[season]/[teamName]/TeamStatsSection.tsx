"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LeaderboardTable from "@/app/features/leaderboard/LeaderboardTable";
import { useLeaderboardFilters } from "@/app/features/leaderboard/useLeaderboardFilters";
import { aggregateCareerRows } from "@/app/features/leaderboard/aggregateCareerRows";
import StatViewSelector from "@/app/features/player/StatViewSelector";
import { InlineSwitch } from "@/app/components/filters/InlineSwitch";
import { SectionHeading } from "@/app/(public)/home/sections/SectionHeading";
import type { PlayerLeaderboardRow } from "@/server/domains/player";

type Scope = "season" | "all";

function writeScope(scope: Scope) {
    const params = new URLSearchParams(window.location.search);
    if (scope === "all") params.set("stats", "all");
    else params.delete("stats");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

export default function TeamStatsSection({
    seasonRows,
    careerRows,
}: {
    seasonRows: PlayerLeaderboardRow[];
    careerRows: PlayerLeaderboardRow[];
}) {
    const searchParams = useSearchParams();
    const [scope, setScope] = useState<Scope>(searchParams.get("stats") === "all" ? "all" : "season");
    const { filters, setView, setSort } = useLeaderboardFilters();

    const allTimeRows = useMemo(() => aggregateCareerRows(careerRows, (r) => r.player_id), [careerRows]);

    const handleScope = (next: Scope) => {
        setScope(next);
        writeScope(next);
    };

    return (
        <section aria-label="Stats">
            <SectionHeading title="Stats">
                <InlineSwitch
                    label="Stats range"
                    value={scope}
                    onChange={handleScope}
                    options={[
                        { value: "season", label: "This season" },
                        { value: "all", label: "All time" },
                    ]}
                />
            </SectionHeading>
            <div className="mt-3 space-y-3">
                <StatViewSelector value={filters.view} onChange={setView} />
                <LeaderboardTable
                    rows={scope === "all" ? allTimeRows : seasonRows}
                    filters={filters}
                    onSort={setSort}
                    onClearSearch={() => {}}
                    emptyMessage="No player stats recorded for this team yet."
                    flow
                    showTeam={false}
                />
            </div>
        </section>
    );
}
