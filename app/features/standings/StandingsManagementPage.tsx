"use client";

import React, { useState, useEffect } from "react";
import { useStandingsStore } from "@/app/stores/standingStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { StandingsTable } from "@/app/features/standings/StandingsTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "@/app/utils/toast";
import { StandingWithInfo } from "@/server/dto/standing.dto";
import { useAdminReady } from "@/app/admin/AdminReadyContext";
import { Skeleton } from "@/app/components/ui/skeleton";

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
                <div className="admin-header">
                    <div>
                        <h1>Standings</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            View team standings by region and season
                        </p>
                    </div>
                </div>

                <div className="panel p-6 max-w-2xl">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Region</label>
                            {ready ? (
                                <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                                    <SelectTrigger className="rounded-sm w-full">
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
                                <Skeleton className="h-9 w-full rounded-sm" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Season</label>
                            {ready ? (
                                <Select
                                    value={selectedSeasonId}
                                    onValueChange={setSelectedSeasonId}
                                    disabled={!selectedRegionId}
                                >
                                    <SelectTrigger className="rounded-sm w-full">
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
                                <Skeleton className="h-9 w-full rounded-sm" />
                            )}
                        </div>
                    </div>
                </div>

                {selectedRegionId && selectedSeasonId ? (
                    <StandingsTable
                        standings={standings}
                        isLoading={standingsLoading}
                    />
                ) : (
                    <div className="panel p-12">
                        <p className="text-sm text-muted-foreground text-center">
                            Select a region and season to view standings
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}