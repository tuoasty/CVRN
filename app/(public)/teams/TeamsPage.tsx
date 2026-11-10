"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PublicTeamCard from "@/app/(public)/teams/PublicTeamCard";
import { InlineSwitch } from "@/app/components/filters/InlineSwitch";
import SearchBox from "@/app/features/information/SearchBox";
import { buildTeamsGrid, type TeamsSort } from "@/app/features/teams/model/buildTeamsGrid";
import { seasonStrengths } from "@/app/features/teams/model/strength";
import type { SeasonRosterEntry, TeamStrength, TeamWithRegion } from "@/server/domains/team";
import type { Region } from "@/shared/types/db";
import type { SeasonWithPlayoffConfig } from "@/server/domains/season";

type Props = {
    season: SeasonWithPlayoffConfig;
    region: Region;
    teams: TeamWithRegion[];
    strengths: TeamStrength[];
    rosters: SeasonRosterEntry[];
};

function writeUrl(sort: TeamsSort, query: string) {
    const params = new URLSearchParams(window.location.search);
    if (sort === "az") params.set("sort", "az");
    else params.delete("sort");
    const q = query.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

function CenteredLine({ children }: { children: string }) {
    return (
        <div className="grid min-h-[208px] place-items-center">
            <p className="text-sm text-muted-foreground">{children}</p>
        </div>
    );
}

export default function TeamsPage({ season, region, teams, strengths, rosters }: Props) {
    const searchParams = useSearchParams();
    const [sort, setSort] = useState<TeamsSort>(searchParams.get("sort") === "az" ? "az" : "strength");
    const [query, setQuery] = useState(searchParams.get("q") ?? "");

    const strengthMap = useMemo(
        () => seasonStrengths(strengths, season.id, teams.map((t) => t.id)),
        [strengths, season.id, teams],
    );

    const grid = useMemo(
        () => buildTeamsGrid({ teams, strengths: strengthMap, rosters, sort, query }),
        [teams, strengthMap, rosters, sort, query],
    );

    const handleSort = (next: TeamsSort) => {
        setSort(next);
        writeUrl(next, query);
    };

    const handleQuery = (next: string) => {
        setQuery(next);
        writeUrl(sort, next);
    };

    const subtitle = `${season.name} · ${region.name}${teams.length > 0 ? ` · ${teams.length} teams` : ""}`;

    return (
        <div className="page-wide py-6">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Teams</h1>
                    <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
                </div>
                {teams.length > 0 && (
                    <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 sm:w-auto">
                        <InlineSwitch
                            label="Sort teams"
                            value={grid.effectiveSort}
                            onChange={handleSort}
                            options={[
                                {
                                    value: "strength",
                                    label: "Strength",
                                    disabled: !grid.strengthAvailable,
                                    tooltip: "Computed team strength based on point margins, adjusted for opponent strength",
                                },
                                { value: "az", label: "A to Z" },
                            ]}
                        />
                        <SearchBox
                            value={query}
                            onChange={handleQuery}
                            placeholder="Search teams or players"
                            className="w-full rounded-[2px] sm:w-[260px]"
                        />
                    </div>
                )}
            </div>

            <div className="mt-8">
                {teams.length === 0 ? (
                    <CenteredLine>No teams found for this season</CenteredLine>
                ) : grid.tiles.length === 0 ? (
                    <CenteredLine>No teams match that search.</CenteredLine>
                ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-x-8">
                        {grid.tiles.map((tile, index) => (
                            <PublicTeamCard
                                key={tile.team.id}
                                team={tile.team}
                                strength={tile.strength}
                                isPriority={index < 4}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
