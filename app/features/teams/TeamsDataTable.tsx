"use client";

import React, {useEffect, useState, useTransition} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { TeamWithRegion } from "@/server/dto/team.dto";
import { useTeamsStore } from "@/app/stores/teamStore";
import { clientLogger } from "@/app/utils/clientLogger";
import { useRegionsStore } from "@/app/stores/regionStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import LoadingComponent from "@/app/components/ui/LoadingComponent";

export default function TeamsDataTable() {
    const { allTeamsCache, loading, error, fetchAllTeams } = useTeamsStore();
    const { allRegionsCache, fetchAllRegions } = useRegionsStore();
    const { allSeasonsCache, fetchAllSeasons } = useSeasonsStore();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [selectedSeason, setSelectedSeason] = useState<string>("all");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        clientLogger.info('TeamsDataTable', 'Component mounted, fetching teams');
        fetchAllTeams();
        fetchAllRegions();
        fetchAllSeasons();
    }, []);

    const teams = allTeamsCache?.data || [];
    const regions = allRegionsCache?.data || [];
    const seasons = allSeasonsCache?.data || [];

    const filteredTeams = teams.filter((team) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            team.name?.toLowerCase().includes(searchLower) ||
            team.seasons?.regions?.code?.toLowerCase().includes(searchLower) ||
            team.seasons?.regions?.name?.toLowerCase().includes(searchLower) ||
            team.seasons?.name?.toLowerCase().includes(searchLower);

        const matchesRegion = selectedRegion === "all" || team.seasons?.regions?.id === selectedRegion;
        const matchesSeason = selectedSeason === "all" || team.seasons?.id === selectedSeason;

        return matchesSearch && matchesRegion && matchesSeason;
    });

    const availableSeasons = selectedRegion === "all"
        ? []
        : seasons.filter(s => s.region_id === selectedRegion);

    const handleTeamClick = (team: TeamWithRegion) => {
        if (!team.seasons?.regions?.code || !team.seasons?.slug) {
            clientLogger.warn('TeamsDataTable', 'Cannot navigate - missing season or region data', { teamId: team.id });
            return;
        }

        const regionCode = encodeURIComponent(team.seasons.regions.code.toLowerCase());
        const seasonSlug = encodeURIComponent(team.seasons.slug.toLowerCase());
        const teamSlug = encodeURIComponent(team.slug.toLowerCase());

        startTransition(() => {
            router.push(`/admin/teams/${regionCode}/${seasonSlug}/${teamSlug}`);
        })
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
            <LoadingComponent isPending={isPending}/>
            <div className="flex items-center gap-3">
                <div className="flex-1 max-w-sm">
                    <Input
                        type="text"
                        placeholder="Search teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-sm"
                    />
                </div>

                <Select value={selectedRegion} onValueChange={(value) => {
                    setSelectedRegion(value);
                    setSelectedSeason("all");
                }}>
                    <SelectTrigger className="w-[300px] rounded-sm">
                        <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {regions.map((region) => (
                            <SelectItem key={region.id} value={region.id}>
                                {region.code.toUpperCase()} - {region.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedSeason}
                    onValueChange={setSelectedSeason}
                    disabled={selectedRegion === "all"}
                >
                    <SelectTrigger className="w-[200px] rounded-sm">
                        <SelectValue placeholder={selectedRegion === "all" ? "Select region first" : "All Seasons"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Seasons</SelectItem>
                        {availableSeasons.map((season) => (
                            <SelectItem key={season.id} value={season.id}>
                                {season.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground ml-auto">
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