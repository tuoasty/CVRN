"use client";

import React, { useState, useEffect } from "react";
import { usePlayoffStore } from "@/app/stores/playoffStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { toast } from "@/app/utils/toast";
import { PlayoffBracket } from "@/shared/types/db";
import { PlayoffBracketDisplay } from "./PlayoffBracketDisplay";
import { Loader2 } from "lucide-react";
import { useAdminReady } from "@/app/admin/AdminReadyContext";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function PlayoffManagementPage() {
    const [selectedRegionId, setSelectedRegionId] = useState<string>("");
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [brackets, setBrackets] = useState<PlayoffBracket[]>([]);
    const [loadingBrackets, setLoadingBrackets] = useState(false);
    const ready = useAdminReady();

    const { generateBracket, fetchBrackets, loading } = usePlayoffStore();
    const { allRegionsCache } = useRegionsStore();
    const { allSeasonsCache } = useSeasonsStore();

    const regions = allRegionsCache?.data || [];
    const allSeasons = allSeasonsCache?.data || [];

    const filteredSeasons = selectedRegionId
        ? allSeasons.filter((s) => s.region_id === selectedRegionId)
        : [];

    useEffect(() => {
        if (!selectedSeasonId) {
            setBrackets([]);
            return;
        }

        setLoadingBrackets(true);
        fetchBrackets(selectedSeasonId)
            .then(setBrackets)
            .catch((error) => {
                toast.error("Failed to load brackets", error.message);
            })
            .finally(() => setLoadingBrackets(false));
    }, [selectedSeasonId, fetchBrackets]);

    const handleGenerateBracket = async () => {
        if (!selectedSeasonId) {
            toast.error("No season selected");
            return;
        }

        const success = await generateBracket({ seasonId: selectedSeasonId });

        if (success) {
            toast.success("Playoff bracket generated successfully");
            setLoadingBrackets(true);
            const updatedBrackets = await fetchBrackets(selectedSeasonId);
            setBrackets(updatedBrackets);
            setLoadingBrackets(false);
        }
    };

    const selectedSeason = allSeasons.find(s => s.id === selectedSeasonId);
    const hasPlayoffStarted = selectedSeason?.playoff_started || false;

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="admin-header">
                    <div>
                        <h1>Playoff Brackets</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Generate and manage playoff brackets
                        </p>
                    </div>
                </div>

                <div className="panel p-6 max-w-2xl mb-6">
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

                    {ready && selectedSeasonId && !hasPlayoffStarted && (
                        <div className="mt-4">
                            <Button
                                onClick={handleGenerateBracket}
                                disabled={loading}
                                className="w-full rounded-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    "Generate Playoff Bracket"
                                )}
                            </Button>
                        </div>
                    )}
                </div>

                {loadingBrackets ? (
                    <div className="panel p-12">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Loading bracket...</p>
                        </div>
                    </div>
                ) : selectedSeasonId && brackets.length > 0 ? (
                    <PlayoffBracketDisplay brackets={brackets} seasonId={selectedSeasonId} />
                ) : selectedSeasonId && !loading ? (
                    <div className="panel p-12">
                        <p className="text-sm text-muted-foreground text-center">
                            {hasPlayoffStarted ? "No brackets found" : "Click 'Generate Playoff Bracket' to create the bracket structure"}
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}