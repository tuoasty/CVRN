"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStandingsStore } from "@/app/stores/standingStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { StandingsTable } from "@/app/features/standings/StandingsTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "@/app/utils/toast";
import { StandingWithInfo } from "@/server/dto/standing.dto";
import { useAdminReady } from "@/app/admin/AdminReadyContext";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Trophy } from "lucide-react";

export default function StandingsManagementPage() {
    const [selectedRegionId, setSelectedRegionId] = useState<string>("");
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [standings, setStandings] = useState<StandingWithInfo[]>([]);

    const { fetchStandings, loading: standingsLoading } = useStandingsStore();
    const { allRegionsCache } = useRegionsStore();
    const { allSeasonsCache } = useSeasonsStore();
    const ready = useAdminReady();

    const regions = allRegionsCache?.data || [];
    const allSeasons = allSeasonsCache?.data || [];

    const filteredSeasons = selectedRegionId
        ? allSeasons.filter((s) => s.region_id === selectedRegionId)
        : [];

    const selectedSeason = filteredSeasons.find((s) => s.id === selectedSeasonId) ?? null;
    const selectedRegion = regions.find((r) => r.id === selectedRegionId);

    const stats = useMemo(() => {
        if (standings.length === 0) return { totalTeams: 0, avgLvr: 0, topLvr: 0 };

        const totalTeams = standings.length;
        const avgLvr = standings.reduce((sum, s) => sum + (s.total_lvr || 0), 0) / totalTeams;
        const topLvr = Math.max(...standings.map(s => s.total_lvr || 0));

        return { totalTeams, avgLvr, topLvr };
    }, [standings]);

    useEffect(() => {
        if (!selectedRegionId || !selectedSeasonId) {
            setStandings([]);
            return;
        }

        fetchStandings({
            seasonId: selectedSeasonId,
            regionId: selectedRegionId,
        })
            .then(setStandings)
            .catch((error) => {
                toast.error("Failed to load standings", error.message);
            });
    }, [selectedRegionId, selectedSeasonId, fetchStandings]);

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <Trophy className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Standings
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {selectedRegion && selectedSeason
                                ? `${selectedRegion.name} • ${selectedSeason.name}`
                                : "Select a region and season to view standings"
                            }
                        </p>
                    </div>
                    {standings.length > 0 && (
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Teams</div>
                                <div className="text-lg font-bold text-primary tabular-nums">{stats.totalTeams}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg LVR</div>
                                <div className="text-lg font-bold tabular-nums">{(100 + stats.avgLvr).toFixed(1)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Top LVR</div>
                                <div className="text-lg font-bold text-primary tabular-nums">{(100 + stats.topLvr).toFixed(1)}</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Region</label>
                            {ready ? (
                                <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                                    <SelectTrigger className="rounded-sm w-full h-10">
                                        <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regions.map((region) => (
                                            <SelectItem key={region.id} value={region.id}>
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Skeleton className="h-10 w-full rounded-sm" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Season</label>
                            {ready ? (
                                <Select
                                    value={selectedSeasonId}
                                    onValueChange={setSelectedSeasonId}
                                    disabled={!selectedRegionId}
                                >
                                    <SelectTrigger className="rounded-sm w-full h-10">
                                        <SelectValue placeholder={selectedRegionId ? "Select season" : "Select region first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredSeasons.map((season) => (
                                            <SelectItem key={season.id} value={season.id}>
                                                {season.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Skeleton className="h-10 w-full rounded-sm" />
                            )}
                        </div>
                    </div>
                </div>

                {selectedRegionId && selectedSeasonId ? (
                    <StandingsTable
                        standings={standings}
                        isLoading={standingsLoading}
                        qualifiedTeams={selectedSeason?.playoff_configs?.qualified_teams}
                        playinTeams={selectedSeason?.playoff_configs?.playin_teams}
                    />
                ) : (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Select a region and season to view standings
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}