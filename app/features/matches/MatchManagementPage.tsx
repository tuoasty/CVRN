"use client";

import React, { useEffect, useMemo, useState } from "react";
import CreateMatchesPanel from "@/app/features/matches/CreateMatchesPanel";
import AdminSchedulePanel from "@/app/features/matches/AdminSchedulePanel";
import { MatchTypeTabs, WeekSelector, PlayoffStepper } from "@/app/features/matches/ScheduleSelectors";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import {
    useAvailablePlayoffRounds,
    useDefaultWeekForSeason,
    usePlayoffRoundCounts,
    useWeekMatchCounts,
} from "@/app/hooks/useMatches";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { PlayoffRound } from "@/server/domains/playoff";
import { isPlayoffRound, sortRounds } from "@/app/utils/playoffRounds";
import { Calendar } from "lucide-react";
import { AdminPageHeader } from "@/app/components/admin/AdminPageHeader";
import { useAdminContextStore } from "@/app/stores/adminContextStore";
import { useAdminReady } from "@/app/admin/AdminReadyContext";
import AdminScheduleRowsSkeleton from "@/app/features/matches/AdminScheduleRowsSkeleton";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function MatchManagementPage() {
    const { selectedSeasonId } = useAdminContextStore();
    // The store is empty until AdminStoreInitializer resolves regions + seasons, so gating on
    // `selectedSeasonId` alone flashes the "select a season" panel — a wrong answer, not a wait.
    const adminReady = useAdminReady();
    const [matchType, setMatchType] = useState<"season" | "playoffs">("season");
    const [activeTab, setActiveTab] = useState("schedule");

    // Null means "no explicit pick yet" — fall back to the season's default.
    // Both reset when the navbar switches seasons.
    const [weekOverride, setWeekOverride] = useState<number | null>(null);
    const [roundOverride, setRoundOverride] = useState<PlayoffRound | null>(null);
    useEffect(() => {
        setWeekOverride(null);
        setRoundOverride(null);
        setMatchType("season");
    }, [selectedSeasonId]);

    const { seasons } = useSeasons();
    const { regions } = useRegions();

    const seasonIdValue = selectedSeasonId ?? "";
    const season = seasons.find(s => s.id === selectedSeasonId);
    const hasPlayoffs = !!season?.playoff_started;

    const regionCode = useMemo(() => {
        if (!season || regions.length === 0) return "";
        return regions.find(r => r.id === season.region_id)?.code ?? "";
    }, [season, regions]);

    const { defaultWeek } = useDefaultWeekForSeason(
        selectedSeasonId && !weekOverride ? selectedSeasonId : null
    );
    const { weekCounts } = useWeekMatchCounts(selectedSeasonId);
    const availableWeeks = useMemo(
        () => weekCounts.map(w => w.week).sort((a, b) => a - b),
        [weekCounts]
    );
    const effectiveWeek = weekOverride ?? defaultWeek ?? 1;

    const { rounds: availableRounds } = useAvailablePlayoffRounds(hasPlayoffs ? selectedSeasonId : null);
    const { roundCounts } = usePlayoffRoundCounts(hasPlayoffs ? selectedSeasonId : null);
    const sortedRounds = useMemo(
        () => sortRounds(availableRounds.filter(isPlayoffRound)),
        [availableRounds]
    );
    const effectiveRound: PlayoffRound =
        roundOverride && sortedRounds.includes(roundOverride)
            ? roundOverride
            : sortedRounds[0] ?? "play_in";

    const roundCountMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const { round, count } of roundCounts) m.set(round, count);
        return m;
    }, [roundCounts]);

    // The create-matches flow is season-only; leaving it selected while
    // switching to playoffs would strand the user on a hidden tab.
    const handleMatchTypeChange = (tab: "season" | "playoffs") => {
        setMatchType(tab);
        if (tab === "playoffs") setActiveTab("schedule");
    };

    return (
        <div className="admin-container">
            <div className="admin-section">
                <AdminPageHeader
                    icon={Calendar}
                    title="Match Management"
                    description="Schedule and manage matches by season and week"
                />

                {!adminReady ? (
                    <>
                        <div className="space-y-4">
                            <Skeleton className="h-[38px] w-full rounded-sm" />
                            <Skeleton className="h-11 sm:h-[38px] w-full rounded-sm" />
                        </div>
                        <div className="w-full">
                            <Skeleton className="h-10 w-72 rounded-sm" />
                            <div className="mt-6">
                                <AdminScheduleRowsSkeleton />
                            </div>
                        </div>
                    </>
                ) : seasonIdValue ? (
                    <>
                        <div className="space-y-4">
                            <MatchTypeTabs
                                activeTab={matchType}
                                playoffsEnabled={hasPlayoffs}
                                onTabChange={handleMatchTypeChange}
                            />

                            {matchType === "season" ? (
                                <WeekSelector
                                    effectiveWeek={effectiveWeek}
                                    weeks={availableWeeks}
                                    onWeekChange={setWeekOverride}
                                />
                            ) : (
                                <PlayoffStepper
                                    rounds={sortedRounds}
                                    effectiveRound={effectiveRound}
                                    roundCountMap={roundCountMap}
                                    onRoundChange={r => setRoundOverride(r as PlayoffRound)}
                                />
                            )}
                        </div>

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
                                    week={matchType === "season" ? effectiveWeek : undefined}
                                    round={matchType === "playoffs" ? effectiveRound : undefined}
                                    matchType={matchType === "season" ? "season" : "playoff"}
                                    regionCode={regionCode}
                                />
                            </TabsContent>

                            {matchType === "season" && (
                                <TabsContent value="create" className="mt-6">
                                    <CreateMatchesPanel
                                        seasonId={seasonIdValue}
                                        week={effectiveWeek}
                                        onSuccess={() => setActiveTab("schedule")}
                                    />
                                </TabsContent>
                            )}
                        </Tabs>
                    </>
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
