"use client";

import React, { useMemo, useState } from "react";
import SeasonWeekPicker from "@/app/features/seasons/SeasonWeekPicker";
import CreateMatchesPanel from "@/app/features/matches/CreateMatchesPanel";
import AdminSchedulePanel from "@/app/features/matches/AdminSchedulePanel";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { PlayoffRound } from "@/server/domains/playoff";
import { Calendar } from "lucide-react";
import { AdminPageHeader } from "@/app/components/admin/AdminPageHeader";
import { useAdminContextStore } from "@/app/stores/adminContextStore";

export default function MatchManagementPage() {
    const { selectedSeasonId, setSelectedSeasonId } = useAdminContextStore();
    const [selectedWeek, setSelectedWeek] = useState<number>(1);
    const [selectedRound, setSelectedRound] = useState<PlayoffRound>("play_in");
    const [matchType, setMatchType] = useState<"season" | "playoff">("season");
    const [activeTab, setActiveTab] = useState("schedule");

    const { seasons } = useSeasons();
    const { regions } = useRegions();

    const regionCode = useMemo(() => {
        if (!selectedSeasonId || seasons.length === 0 || regions.length === 0) return "";
        const season = seasons.find((s) => s.id === selectedSeasonId);
        if (!season) return "";
        const region = regions.find((r) => r.id === season.region_id);
        return region?.code ?? "";
    }, [selectedSeasonId, seasons, regions]);

    const seasonIdValue = selectedSeasonId ?? "";

    return (
        <div className="admin-container">
            <div className="admin-section">
                <AdminPageHeader
                    icon={Calendar}
                    title="Match Management"
                    description="Schedule and manage matches by season and week"
                />

                <div className="panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                    <SeasonWeekPicker
                        hideSeason={true}
                        selectedSeasonId={seasonIdValue}
                        selectedWeek={selectedWeek}
                        selectedMatchType={matchType}
                        selectedRound={selectedRound}
                        onSeasonChange={setSelectedSeasonId}
                        onWeekChange={setSelectedWeek}
                        onMatchTypeChange={setMatchType}
                        onRoundChange={setSelectedRound}
                    />
                </div>

                {seasonIdValue ? (
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
                                seasonId={seasonIdValue}
                                week={matchType === "season" ? selectedWeek : undefined}
                                round={matchType === "playoff" ? selectedRound : undefined}
                                matchType={matchType}
                                regionCode={regionCode}
                            />
                        </TabsContent>

                        {matchType === "season" && (
                            <TabsContent value="create" className="mt-6">
                                <CreateMatchesPanel
                                    seasonId={seasonIdValue}
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
                                Select a season in the navbar to manage matches
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
