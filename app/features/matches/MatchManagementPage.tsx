"use client";

import React, { useState } from "react";
import SeasonWeekPicker from "@/app/features/seasons/SeasonWeekPicker";
import CreateMatchesPanel from "@/app/features/matches/CreateMatchesPanel";
export default function MatchManagementPage() {
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [selectedWeek, setSelectedWeek] = useState<number>(1);

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
                <CreateMatchesPanel
                    seasonId={selectedSeasonId}
                    week={selectedWeek}
                />
            )}
        </div>
    );
}