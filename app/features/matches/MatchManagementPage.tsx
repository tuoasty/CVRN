"use client";

import React, { useState, useEffect } from "react";
import SeasonWeekPicker from "@/app/features/seasons/SeasonWeekPicker";
import CreateMatchesPanel from "@/app/features/matches/CreateMatchesPanel";
import AdminSchedulePanel from "@/app/features/matches/AdminSchedulePanel";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { PlayoffRound } from "@/server/dto/playoff.dto";
import { Calendar } from "lucide-react";

export default function MatchManagementPage() {
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
    const [selectedWeek, setSelectedWeek] = useState<number>(1);
    const [selectedRound, setSelectedRound] = useState<PlayoffRound>("play_in");
    const [matchType, setMatchType] = useState<"season" | "playoff">("season");
    const [regionCode, setRegionCode] = useState<string>("");
    const [activeTab, setActiveTab] = useState("schedule");

    const { seasons } = useSeasons();
    const { regions } = useRegions();

    useEffect(() => {
        if (selectedSeasonId && seasons.length > 0 && regions.length > 0) {
            const season = seasons.find(s => s.id === selectedSeasonId);
            if (season) {
                const region = regions.find(r => r.id === season.region_id);
                if (region) {
                    setRegionCode(region.code);
                }
            }
        }
    }, [selectedSeasonId, seasons, regions]);

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <Calendar className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Match Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Schedule and manage matches by season and week
                        </p>
                    </div>
                </div>

                <div className="panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
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
                        <TabsList className="rounded-sm bg-muted/50 p-1">
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
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Select a season to manage matches
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}