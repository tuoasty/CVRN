"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, ImageOff } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { TeamWithRegion } from "@/server/domains/team";
import { useTeams } from "@/app/hooks/useTeams";
import { clientLogger } from "@/app/utils/clientLogger";
import { useRegions } from "@/app/hooks/useRegions";
import { useAdminContextStore } from "@/app/stores/adminContextStore";
import LoadingComponent from "@/app/components/ui/LoadingComponent";

export default function TeamsDataTable() {
    const { teams, isLoading, error } = useTeams();
    const { regions } = useRegions();
    const router = useRouter();
    const { selectedSeasonId, selectedRegionId } = useAdminContextStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [viewAllInRegion, setViewAllInRegion] = useState(false);
    const [isPending, startTransition] = useTransition();

    const selectedRegion = regions.find((r) => r.id === selectedRegionId);

    const filteredTeams = teams.filter((team) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            team.name?.toLowerCase().includes(searchLower) ||
            team.seasons?.regions?.code?.toLowerCase().includes(searchLower) ||
            team.seasons?.regions?.name?.toLowerCase().includes(searchLower) ||
            team.seasons?.name?.toLowerCase().includes(searchLower);

        const matchesFilter = viewAllInRegion
            ? team.seasons?.regions?.id === selectedRegionId
            : team.seasons?.id === selectedSeasonId;

        return matchesSearch && matchesFilter;
    });

    const handleTeamClick = (team: TeamWithRegion) => {
        if (!team.seasons?.regions?.code || !team.seasons?.slug) {
            clientLogger.warn("TeamsDataTable", "Cannot navigate - missing season or region data", { teamId: team.id });
            return;
        }

        const regionCode = encodeURIComponent(team.seasons.regions.code.toLowerCase());
        const seasonSlug = encodeURIComponent(team.seasons.slug.toLowerCase());
        const teamSlug = encodeURIComponent(team.slug.toLowerCase());

        startTransition(() => {
            router.push(`/admin/teams/${regionCode}/${seasonSlug}/${teamSlug}`);
        });
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
            <LoadingComponent isPending={isPending} />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-full sm:flex-1 sm:max-w-sm">
                    <Input
                        type="text"
                        placeholder="Search teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-sm"
                    />
                </div>

                {!viewAllInRegion ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-sm"
                        onClick={() => setViewAllInRegion(true)}
                        disabled={!selectedRegionId}
                    >
                        View all in {selectedRegion?.code ?? "region"}
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 border border-primary/20 text-sm">
                        <span className="font-medium">{selectedRegion?.code} — all seasons</span>
                        <button
                            onClick={() => setViewAllInRegion(false)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Exit view all"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                <div className="text-sm text-muted-foreground sm:ml-auto">
                    {filteredTeams.length} {filteredTeams.length === 1 ? "team" : "teams"}
                </div>
            </div>

            {!selectedSeasonId && !viewAllInRegion ? (
                <div className="panel p-6">
                    <p className="text-muted-foreground text-center">Select a season in the navbar</p>
                </div>
            ) : filteredTeams.length === 0 ? (
                <div className="panel p-6">
                    <p className="text-muted-foreground text-center">No teams found</p>
                </div>
            ) : (
                <div className="panel overflow-x-auto">
                    <table className="table-dense">
                        <thead>
                            <tr>
                                <th className="w-16">Logo</th>
                                <th>Team Name</th>
                                {viewAllInRegion && <th>Season</th>}
                                <th>Brick</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeams.map((team) => {
                                const hasRequiredData = team.seasons?.regions?.code && team.seasons?.slug;
                                const seasonName = team.seasons?.name || "Unknown Season";

                                return (
                                    <tr
                                        key={team.id}
                                        className={`cursor-pointer hover:bg-muted/50 transition-colors${!hasRequiredData ? " opacity-50" : ""}`}
                                        onClick={() => hasRequiredData && handleTeamClick(team)}
                                    >
                                        <td>
                                            {team.logo_url ? (
                                                <div className="relative w-10 h-10">
                                                    <Image
                                                        src={team.logo_url}
                                                        alt={team.name || ""}
                                                        fill
                                                        sizes="40px"
                                                        className="object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 flex items-center justify-center rounded-sm border border-dashed border-amber-500/60 bg-amber-500/10" title="No logo">
                                                    <ImageOff className="h-4 w-4 text-amber-500/70" />
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="font-medium">{team.name}</div>
                                            <div className="text-xs text-muted-foreground">{team.slug}</div>
                                        </td>
                                        {viewAllInRegion && (
                                            <td className="text-sm">{seasonName}</td>
                                        )}
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {team.brick_color && (
                                                    <div
                                                        className="w-4 h-4 rounded-sm border border-border"
                                                        style={{ backgroundColor: team.brick_color }}
                                                    />
                                                )}
                                                <span className="text-sm font-mono">{team.brick_number}</span>
                                            </div>
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
