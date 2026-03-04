"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { TeamWithRegion } from "@/server/dto/team.dto";
import { useTeamsStore } from "@/app/stores/teamStore";
import { clientLogger } from "@/app/utils/clientLogger";

export default function TeamsDataTable() {
    const { allTeamsCache, loading, error, fetchAllTeams } = useTeamsStore();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        clientLogger.info('TeamsDataTable', 'Component mounted, fetching teams');
        fetchAllTeams();
    }, []);

    const teams = allTeamsCache?.data || [];

    const filteredTeams = teams.filter((team) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            team.name?.toLowerCase().includes(searchLower) ||
            team.seasons?.regions?.code?.toLowerCase().includes(searchLower) ||
            team.seasons?.regions?.name?.toLowerCase().includes(searchLower) ||
            team.seasons?.name?.toLowerCase().includes(searchLower)
        );
    });

    const handleTeamClick = (team: TeamWithRegion) => {
        if (!team.seasons?.regions?.code || !team.seasons?.slug) {
            clientLogger.warn('TeamsDataTable', 'Cannot navigate - missing season or region data', { teamId: team.id });
            return;
        }

        const regionCode = team.seasons.regions.code.toLowerCase();
        const seasonSlug = team.seasons.slug.toLowerCase();
        const teamSlug = team.slug.toLowerCase();

        router.push(`/admin/teams/${regionCode}/${seasonSlug}/${teamSlug}`);
    };

    if (loading) {
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
            <div className="flex items-center justify-between">
                <div className="flex-1 max-w-sm">
                    <Input
                        type="text"
                        placeholder="Search teams, regions, seasons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-sm"
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    {filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'}
                </div>
            </div>

            {filteredTeams.length === 0 ? (
                <div className="panel p-6">
                    <p className="text-muted-foreground text-center">No teams found</p>
                </div>
            ) : (
                <div className="panel overflow-hidden">
                    <table className="table-dense">
                        <thead>
                        <tr>
                            <th className="w-16">Logo</th>
                            <th>Team Name</th>
                            <th>Region</th>
                            <th>Season</th>
                            <th>Brick</th>
                            <th className="w-24">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredTeams.map((team) => {
                            const hasRequiredData = team.seasons?.regions?.code && team.seasons?.slug;
                            const regionCode = team.seasons?.regions?.code?.toUpperCase() || "??";
                            const regionName = team.seasons?.regions?.name || "Unknown";
                            const seasonName = team.seasons?.name || "Unknown Season";

                            return (
                                <tr key={team.id} className={!hasRequiredData ? 'opacity-50' : ''}>
                                    <td>
                                        {team.logo_url && (
                                            <div className="relative w-10 h-10">
                                                <Image
                                                    src={team.logo_url}
                                                    alt={team.name || ""}
                                                    fill
                                                    sizes="40px"
                                                    className="object-contain"
                                                />
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="font-medium">{team.name}</div>
                                        <div className="text-xs text-muted-foreground">{team.slug}</div>
                                    </td>
                                    <td>
                                        <div className="font-mono text-xs font-semibold">{regionCode}</div>
                                        <div className="text-xs text-muted-foreground">{regionName}</div>
                                    </td>
                                    <td className="text-sm">{seasonName}</td>
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
                                    <td>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-sm"
                                            onClick={() => handleTeamClick(team)}
                                            disabled={!hasRequiredData}
                                        >
                                            View
                                        </Button>
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