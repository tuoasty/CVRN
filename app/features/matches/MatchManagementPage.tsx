"use client";

import React, { useState, useEffect } from "react";
import SeasonWeekPicker from "@/app/features/seasons/SeasonWeekPicker";
import CreateMatchesPanel from "@/app/features/matches/CreateMatchesPanel";
import SchedulePanel from "@/app/features/matches/SchedulePanel";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useRegionsStore } from "@/app/stores/regionStore";

export default function MatchManagementPage() {
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [selectedWeek, setSelectedWeek] = useState<number>(1);
    const [regionCode, setRegionCode] = useState<string>("");

    const { allSeasonsCache } = useSeasonsStore();
    const { allRegionsCache } = useRegionsStore();

    useEffect(() => {
        if (selectedSeasonId && allSeasonsCache?.data && allRegionsCache?.data) {
            const season = allSeasonsCache.data.find(s => s.id === selectedSeasonId);
            if (season) {
                const region = allRegionsCache.data.find(r => r.id === season.region_id);
                if (region) {
                    setRegionCode(region.code);
                }
            }
        }
    }, [selectedSeasonId, allSeasonsCache, allRegionsCache]);

    return (
        <div className="container mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold">Match Management</h1>

            <SeasonWeekPicker
                selectedSeasonId={selectedSeasonId}
                selectedWeek={selectedWeek}
                onSeasonChange={setSelectedSeasonId}
                onWeekChange={setSelectedWeek}
            />

            {selectedSeasonId && (
                <>
                    <SchedulePanel
                        seasonId={selectedSeasonId}
                        week={selectedWeek}
                        regionCode={regionCode}
                    />

                    <CreateMatchesPanel
                        seasonId={selectedSeasonId}
                        week={selectedWeek}
                    />
                </>
            )}
        </div>
    );
}