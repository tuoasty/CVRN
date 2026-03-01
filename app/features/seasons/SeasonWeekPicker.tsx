"use client";

import React, { useEffect } from "react";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";

interface SeasonWeekPickerProps {
    selectedSeasonId: string;
    selectedWeek: number;
    onSeasonChange: (seasonId: string) => void;
    onWeekChange: (week: number) => void;
}

export default function SeasonWeekPicker({
                                             selectedSeasonId,
                                             selectedWeek,
                                             onSeasonChange,
                                             onWeekChange,
                                         }: SeasonWeekPickerProps) {
    const { fetchAllSeasons, allSeasonsCache } = useSeasonsStore();
    const { fetchAllRegions, allRegionsCache } = useRegionsStore();

    useEffect(() => {
        fetchAllSeasons();
        fetchAllRegions();
    }, [fetchAllSeasons, fetchAllRegions]);

    const seasons = allSeasonsCache?.data || [];
    const regions = allRegionsCache?.data || [];

    const seasonsByRegion = seasons.reduce((acc, season) => {
        const regionId = season.region_id;
        if (!acc[regionId]) {
            acc[regionId] = [];
        }
        acc[regionId].push(season);
        return acc;
    }, {} as Record<string, typeof seasons>);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2">Season</label>
                <Select value={selectedSeasonId} onValueChange={onSeasonChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent>
                        {regions.map((region) => {
                            const regionSeasons = seasonsByRegion[region.id] || [];
                            if (regionSeasons.length === 0) return null;

                            return (
                                <React.Fragment key={region.id}>
                                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                        {region.code.toUpperCase()} - {region.name}
                                    </div>
                                    {regionSeasons.map((season) => (
                                        <SelectItem key={season.id} value={season.id}>
                                            {season.name}
                                        </SelectItem>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Week</label>
                <Select
                    value={selectedWeek.toString()}
                    onValueChange={v => onWeekChange(parseInt(v))}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => i + 1).map(w => (
                            <SelectItem key={w} value={w.toString()}>
                                Week {w}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}