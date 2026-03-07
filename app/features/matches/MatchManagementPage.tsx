"use client";

import React, { useState, useEffect } from "react";
import SeasonWeekPicker from "@/app/features/seasons/SeasonWeekPicker";
import CreateMatchesPanel from "@/app/features/matches/CreateMatchesPanel";
import AdminSchedulePanel from "@/app/features/matches/AdminSchedulePanel";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { PlayoffRound } from "@/server/dto/playoff.dto";

export default function MatchManagementPage() {
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [selectedWeek, setSelectedWeek] = useState<number>(1);
    const [selectedRound, setSelectedRound] = useState<PlayoffRound>("play_in");
    const [matchType, setMatchType] = useState<"season" | "playoff">("season");
    const [regionCode, setRegionCode] = useState<string>("");
    const [activeTab, setActiveTab] = useState("schedule");

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
        <div className="admin-section">
            <div className="admin-header">
                <div>
                    <h1>Match Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Schedule and manage matches by season and week
                    </p>
                </div>
            </div>

            <div className="panel p-6 max-w-2xl">
                <SeasonWeekPicker
                    selectedSeasonId={selectedSeasonId}
                    selectedWeek={selectedWeek}
                    selectedMatchType={matchType}
                    selectedRound={selectedRound}
                    onSeasonChange={setSelectedSeasonId}
                    onWeekChange={setSelectedWeek}
                    onMatchTypeChange={setMatchType}
                    onRoundChange={setSelectedRound}
                />
            </div>

            {selectedSeasonId ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="rounded-sm">
                        <TabsTrigger value="schedule" className="rounded-sm">
                            Current Schedule
                        </TabsTrigger>
                        {matchType === "season" && (
                            <TabsTrigger value="create" className="rounded-sm">
                                Create Matches
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="schedule" className="mt-6">
                        <AdminSchedulePanel
                            seasonId={selectedSeasonId}
                            week={matchType === "season" ? selectedWeek : undefined}
                            round={matchType === "playoff" ? selectedRound : undefined}
                            matchType={matchType}
                            regionCode={regionCode}
                        />
                    </TabsContent>

                    {matchType === "season" && (
                        <TabsContent value="create" className="mt-6">
                            <CreateMatchesPanel
                                seasonId={selectedSeasonId}
                                week={selectedWeek}
                                onSuccess={() => setActiveTab("schedule")}
                            />
                        </TabsContent>
                    )}
                </Tabs>
            ) : (
                <div className="panel p-8">
                    <p className="text-muted-foreground text-center">
                        Select a season to manage matches
                    </p>
                </div>
            )}
        </div>
    );
}