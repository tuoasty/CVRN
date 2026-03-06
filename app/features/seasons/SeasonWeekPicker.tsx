"use client";

import React from "react";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import { Label } from "@/app/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import { useAdminReady } from "@/app/admin/AdminReadyContext";
import { Skeleton } from "@/app/components/ui/skeleton";

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
    const { allSeasonsCache } = useSeasonsStore();
    const { allRegionsCache } = useRegionsStore();
    const ready = useAdminReady();

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

    if (!ready) {
        return (
            <div className="space-y-5">
                <div>
                    <h3>Select Season and Week</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Choose which season and week to manage matches for
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <Label htmlFor="season">Season</Label>
                        <Skeleton className="h-9 w-full rounded-sm" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="week">Week</Label>
                        <Skeleton className="h-9 w-full rounded-sm" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h3>Select Season and Week</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Choose which season and week to manage matches for
                </p>
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                    <Label htmlFor="season">Season</Label>
                    <Select value={selectedSeasonId} onValueChange={onSeasonChange}>
                        <SelectTrigger id="season" className="rounded-sm w-full">
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

                <div className="space-y-2">
                    <Label htmlFor="week">Week</Label>
                    <Select
                        value={selectedWeek.toString()}
                        onValueChange={v => onWeekChange(parseInt(v))}
                    >
                        <SelectTrigger id="week" className="rounded-sm w-full">
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
        </div>
    );
}