"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";
import { TeamWithRegion } from "@/server/domains/team";
import { useTeams } from "@/app/hooks/useTeams";
import { clientLogger } from "@/app/utils/clientLogger";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { isSeasonActive } from "@/server/domains/season/helpers/isSeasonActive";
import UploadTeamLogoDialog from "@/app/features/teams/UploadTeamLogoDialog";
import { useHasGroup } from "@/app/admin/AdminRoleProvider";
import TeamsFilterBar from "@/app/features/teams/TeamsFilterBar";
import { buildTeamsQuery, useTeamsFilters } from "@/app/features/teams/useTeamsFilters";
import {
    isSpecificSeason,
    REGION_ALL,
    SEASON_INACTIVE,
    selectTeams,
} from "@/app/features/teams/selectTeams";

export default function TeamsDataTable() {
    const { teams, isLoading, error } = useTeams();
    const { regions } = useRegions();
    const { seasons } = useSeasons();
    const router = useRouter();
    const canOpenTeam = useHasGroup("admin");

    const { filters, setRegion, setSeason, setQuery, reset } = useTeamsFilters(regions, seasons);

    const filteredTeams = useMemo(
        () => selectTeams({ teams, seasons, filters }),
        [teams, seasons, filters]
    );

    const showRegionColumn = filters.region === REGION_ALL;
    const showSeasonColumn = !isSpecificSeason(filters.season);

    const hasConcludedSeasonsInScope = useMemo(() => {
        if (filters.season !== SEASON_INACTIVE) return true;
        const region =
            filters.region === REGION_ALL
                ? null
                : regions.find((r) => r.code.toLowerCase() === filters.region);
        return seasons.some(
            (season) =>
                !isSeasonActive(season) && (!region || season.region_id === region.id)
        );
    }, [filters.season, filters.region, regions, seasons]);

    const handleTeamClick = (team: TeamWithRegion) => {
        if (!team.seasons?.regions?.code || !team.seasons?.slug) {
            clientLogger.warn("TeamsDataTable", "Cannot navigate - missing season or region data", {
                teamId: team.id,
            });
            return;
        }

        const regionCode = encodeURIComponent(team.seasons.regions.code.toLowerCase());
        const seasonSlug = encodeURIComponent(team.seasons.slug.toLowerCase());
        const teamSlug = encodeURIComponent(team.slug.toLowerCase());

        const listQuery = buildTeamsQuery(filters);
        const href = `/admin/teams/${regionCode}/${seasonSlug}/${teamSlug}`;

        router.push(listQuery ? `${href}?${listQuery}` : href);
    };

    if (isLoading) {
        return (
            <div className="panel p-6">
                <p className="text-muted-foreground">Loading teams...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel p-6">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <TeamsFilterBar
                filters={filters}
                regions={regions}
                seasons={seasons}
                resultCount={filteredTeams.length}
                onRegionChange={setRegion}
                onSeasonChange={setSeason}
                onQueryChange={setQuery}
            />

            {filteredTeams.length === 0 ? (
                <EmptyState
                    query={filters.q}
                    hasConcludedSeasonsInScope={hasConcludedSeasonsInScope}
                    onReset={reset}
                />
            ) : (
                <div className="panel overflow-x-auto">
                    <table className="table-dense">
                        <thead>
                            <tr>
                                <th className="w-10">Logo</th>
                                <th>Team Name</th>
                                {showRegionColumn && <th className="w-16">Region</th>}
                                {showSeasonColumn && <th>Season</th>}
                                <th>Color</th>
                                <th className="w-20 text-right">Players</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeams.map((team) => {
                                const hasRequiredData = canOpenTeam && team.seasons?.regions?.code && team.seasons?.slug;
                                const seasonName = team.seasons?.name || "Unknown Season";

                                return (
                                    <tr
                                        key={team.id}
                                        className={`${hasRequiredData ? "cursor-pointer hover:bg-muted/50" : ""} transition-colors${canOpenTeam && !hasRequiredData ? " opacity-50" : ""}`}
                                        onClick={() => hasRequiredData && handleTeamClick(team)}
                                    >
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <UploadTeamLogoDialog
                                                teamId={team.id}
                                                teamName={team.name || ""}
                                                currentLogoUrl={team.logo_url}
                                                trigger={
                                                    <button className="group relative block w-8 h-8 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                                        {team.logo_url ? (
                                                            <div className="relative w-8 h-8">
                                                                <Image
                                                                    src={team.logo_url}
                                                                    alt={team.name || ""}
                                                                    fill
                                                                    sizes="32px"
                                                                    className="object-contain transition-opacity group-hover:opacity-60"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-sm border border-dashed border-secondary/60 bg-secondary/10 group-hover:border-primary/50 transition-colors" title="Upload logo">
                                                                <ImageOff className="h-3.5 w-3.5 text-secondary/70" />
                                                            </div>
                                                        )}
                                                    </button>
                                                }
                                            />
                                        </td>
                                        <td>
                                            <span className="font-medium">{team.name}</span>
                                        </td>
                                        {showRegionColumn && (
                                            <td>
                                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide">
                                                    {team.seasons?.regions?.code ?? "—"}
                                                </span>
                                            </td>
                                        )}
                                        {showSeasonColumn && (
                                            <td className="text-sm text-muted-foreground">{seasonName}</td>
                                        )}
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {team.brick_color ? (
                                                    <>
                                                        <div
                                                            className="w-3.5 h-3.5 rounded-sm border border-border shrink-0"
                                                            style={{ backgroundColor: team.brick_color }}
                                                        />
                                                        <span className="text-xs font-mono text-muted-foreground">
                                                            {team.brick_color}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <span className="text-sm font-mono tabular-nums">
                                                {team.playerCount ?? "—"}<span className="text-muted-foreground">/{team.seasons?.max_players ?? 18}</span>
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function EmptyState({
    query,
    hasConcludedSeasonsInScope,
    onReset,
}: {
    query: string;
    hasConcludedSeasonsInScope: boolean;
    onReset: () => void;
}) {
    let message: string;
    if (!hasConcludedSeasonsInScope) {
        message = "No concluded seasons yet.";
    } else if (query.trim()) {
        message = `No team named "${query.trim()}" in this season.`;
    } else {
        message = "No teams match these filters.";
    }

    return (
        <div className="panel p-6 flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-center">{message}</p>
            <button
                type="button"
                onClick={onReset}
                className="text-xs font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm px-1"
            >
                Reset filters
            </button>
        </div>
    );
}
