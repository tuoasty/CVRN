"use client";

import { useEffect, useState, useMemo } from "react";
import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { useWeekSchedule, usePlayoffSchedule, useAvailablePlayoffRounds } from "@/app/hooks/useMatches";
import { useTeamsByIds } from "@/app/hooks/useTeams";
import { usePlayersByIds } from "@/app/hooks/usePlayers";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Skeleton } from "@/app/components/ui/skeleton";
import { CalendarDays, Trophy } from "lucide-react";
import SeasonSelectionMiddleware from "@/app/components/ui/SeasonSelectorMiddleware";
import PublicMatchCard from "@/app/(public)/matches/PublicMatchCard";
import { MatchWithDetails } from "@/server/dto/match.dto";
import { TeamWithRegion } from "@/server/dto/team.dto";
import { Player } from "@/shared/types/db";
import { PlayoffRound } from "@/server/dto/playoff.dto";

const ROUND_LABELS: Record<string, string> = {
    play_in: "Play-in",
    round_of_16: "Round of 16",
    quarterfinal: "Quarterfinals",
    semifinal: "Semifinals",
    third_place: "3rd Place",
    final: "Finals",
};

const ROUND_ORDER: Record<string, number> = {
    play_in: 1,
    round_of_16: 2,
    quarterfinal: 3,
    semifinal: 4,
    third_place: 5,
    final: 6,
};

export default function MatchesPage() {
    const { selectedSeasonId } = usePublicContextStore();
    const { seasons } = useSeasons();
    const { regions } = useRegions();

    const [activeTab, setActiveTab] = useState<"season" | "playoffs">("season");
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [selectedRound, setSelectedRound] = useState<PlayoffRound>("play_in");

    const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
    const selectedRegion = regions.find(r => r.id === selectedSeason?.region_id);
    const regionCode = selectedRegion?.code;
    const maxWeeks = selectedSeason?.weeks || 10;
    const hasPlayoffs = selectedSeason?.playoff_started;

    const { rounds: availableRounds } = useAvailablePlayoffRounds(hasPlayoffs ? (selectedSeasonId || null) : null);

    const { schedule: weekSchedule, isLoading: loadingWeek } = useWeekSchedule(
        activeTab === "season" ? (selectedSeasonId || null) : null,
        activeTab === "season" ? selectedWeek : null
    );

    const { schedule: playoffSchedule, isLoading: loadingPlayoff } = usePlayoffSchedule(
        activeTab === "playoffs" ? (selectedSeasonId || null) : null,
        activeTab === "playoffs" ? selectedRound : null
    );

    const schedule = activeTab === "season" ? weekSchedule : playoffSchedule;
    const loading = activeTab === "season" ? loadingWeek : loadingPlayoff;

    // Collect distinct team/player IDs from schedule
    const teamIdsToFetch = useMemo(() => {
        const ids = new Set<string>();
        schedule.forEach(({ match }) => {
            if (match.home_team_id) ids.add(match.home_team_id);
            if (match.away_team_id) ids.add(match.away_team_id);
        });
        return Array.from(ids);
    }, [schedule]);

    const playerIdsToFetch = useMemo(() => {
        const ids = new Set<string>();
        schedule.forEach(({ match }) => {
            if (match.match_mvp_player_id) ids.add(match.match_mvp_player_id);
            if (match.loser_mvp_player_id) ids.add(match.loser_mvp_player_id);
        });
        return Array.from(ids);
    }, [schedule]);

    const { teams: fetchedTeams } = useTeamsByIds(teamIdsToFetch);
    const { players: fetchedPlayers } = usePlayersByIds(playerIdsToFetch);

    const teams = useMemo(() => new Map(fetchedTeams.map(t => [t.id, t])), [fetchedTeams]);
    const players = useMemo(() => new Map(fetchedPlayers.map(p => [p.id, p])), [fetchedPlayers]);

    useEffect(() => {
        if (!selectedSeasonId) return;
        setSelectedWeek(1);

        if (hasPlayoffs && availableRounds.length > 0) {
            const sorted = [...availableRounds].sort((a, b) => (ROUND_ORDER[a] ?? 999) - (ROUND_ORDER[b] ?? 999));
            if (!sorted.includes(selectedRound)) {
                 setSelectedRound(sorted[0] as PlayoffRound);
            }
        }
    }, [selectedSeasonId, hasPlayoffs, availableRounds.length]);

    const completedCount = schedule.filter(m => m.match.status === "completed").length;

    return (
        <>
            <SeasonSelectionMiddleware />

            <div className="space-y-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                            <CalendarDays className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Matches
                            </h1>
                            {selectedSeason && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {selectedSeason.name}
                                    {selectedRegion && ` · ${selectedRegion.name}`}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {selectedSeasonId ? (
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "season" | "playoffs")}>
                        <TabsList className="rounded-sm bg-muted/50 p-1">
                            <TabsTrigger value="season" className="rounded-sm text-xs uppercase tracking-wider font-semibold">
                                Season
                            </TabsTrigger>
                            {hasPlayoffs && (
                                <TabsTrigger value="playoffs" className="rounded-sm text-xs uppercase tracking-wider font-semibold">
                                    Playoffs
                                </TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="season" className="mt-6">
                            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
                                <div className="panel p-4 space-y-3">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Week</p>
                                        <Select value={selectedWeek.toString()} onValueChange={v => setSelectedWeek(parseInt(v))}>
                                            <SelectTrigger className="rounded-sm h-9 text-sm w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-sm">
                                                {Array.from({ length: maxWeeks }, (_, i) => i + 1).map(week => (
                                                    <SelectItem key={week} value={week.toString()} className="rounded-sm">
                                                        Week {week}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {!loading && schedule.length > 0 && (
                                        <div className="pt-2 border-t border-border space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Matches</span>
                                                <span className="font-semibold tabular-nums">{schedule.length}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Completed</span>
                                                <span className="font-semibold tabular-nums text-green-600">{completedCount}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <MatchList
                                    schedule={schedule}
                                    teams={teams}
                                    players={players}
                                    regionCode={regionCode}
                                    loading={loading}
                                    emptyMessage="No matches scheduled for this week"
                                />
                            </div>
                        </TabsContent>

                        {hasPlayoffs && (
                            <TabsContent value="playoffs" className="mt-6">
                                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
                                    <div className="panel p-4 space-y-3">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Round</p>
                                            <Select value={selectedRound} onValueChange={v => setSelectedRound(v as PlayoffRound)}>
                                                <SelectTrigger className="rounded-sm h-9 text-sm w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-sm">
                                                    {availableRounds.map(round => (
                                                        <SelectItem key={round} value={round} className="rounded-sm">
                                                            {ROUND_LABELS[round] || round}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {!loading && schedule.length > 0 && (
                                            <div className="pt-2 border-t border-border space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Matches</span>
                                                    <span className="font-semibold tabular-nums">{schedule.length}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Completed</span>
                                                    <span className="font-semibold tabular-nums text-green-600">{completedCount}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <MatchList
                                        schedule={schedule}
                                        teams={teams}
                                        players={players}
                                        regionCode={regionCode}
                                        loading={loading}
                                        emptyMessage="No matches in this playoff round"
                                    />
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                ) : (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground">Select a season to view matches</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

interface MatchListProps {
    schedule: MatchWithDetails[];
    teams: Map<string, TeamWithRegion>;
    players: Map<string, Player>;
    regionCode?: string;
    loading: boolean;
    emptyMessage: string;
}

function MatchList({ schedule, teams, players, regionCode, loading, emptyMessage }: MatchListProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-36 rounded-sm" />
                ))}
            </div>
        );
    }

    if (schedule.length === 0) {
        return (
            <div className="panel p-12">
                <div className="text-center space-y-2">
                    <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {schedule.map(({ match, sets, officials }, index) => {
                const homeTeam = match.home_team_id ? teams.get(match.home_team_id) : undefined;
                const awayTeam = match.away_team_id ? teams.get(match.away_team_id) : undefined;
                const matchMvp = match.match_mvp_player_id ? players.get(match.match_mvp_player_id) : null;
                const loserMvp = match.loser_mvp_player_id ? players.get(match.loser_mvp_player_id) : null;

                return (
                    <PublicMatchCard
                        key={match.id}
                        matchDetails={{ match, sets, officials }}
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        matchMvp={matchMvp}
                        loserMvp={loserMvp}
                        regionCode={regionCode}
                        index={index}
                    />
                );
            })}
        </div>
    );
}