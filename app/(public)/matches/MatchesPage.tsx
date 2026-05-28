"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { useWeekSchedule, usePlayoffSchedule, useAvailablePlayoffRounds, useDefaultWeekForSeason, usePlayoffRoundCounts, useWeekMatchCounts } from "@/app/hooks/useMatches";
import { useTeamsByIds } from "@/app/hooks/useTeams";
import { usePlayersByIds } from "@/app/hooks/usePlayers";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import { useStandings } from "@/app/hooks/useStandings";
import { Skeleton } from "@/app/components/ui/skeleton";
import { CalendarDays, Check } from "lucide-react";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";
import PublicMatchCard from "@/app/(public)/matches/PublicMatchCard";
import { buildPublicMatchHref } from "@/app/utils/matchDetailHref";
import { MatchWithDetails } from "@/server/domains/match";
import { TeamWithRegion } from "@/server/domains/team";
import { Player } from "@/shared/types/db";
import type { PlayoffRound } from "@/server/domains/playoff";
import { cn } from "@/lib/utils";

const ROUND_LABELS: Record<string, string> = {
    play_in: "Play-in",
    round_of_16: "R16",
    quarterfinal: "QF",
    semifinal: "SF",
    third_place: "3rd Place",
    final: "Grand Final",
};

const ROUND_ORDER: Record<string, number> = {
    play_in: 1,
    round_of_16: 2,
    quarterfinal: 3,
    semifinal: 4,
    third_place: 5,
    final: 6,
};

function matchCodeSortKey(code: string | null | undefined): number {
    if (!code) return Infinity;
    const week = code.match(/^W(\d+)-M(\d+)$/i);
    if (week) return parseInt(week[1]) * 1000 + parseInt(week[2]);
    const suffix = code.match(/-(\d+)$/);
    if (suffix) return parseInt(suffix[1]);
    return Infinity;
}

export default function MatchesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { selectedSeasonId } = usePublicContextStore();
    const { seasons } = useSeasons();
    const { regions } = useRegions();

    // URL state
    const tabParam = searchParams.get("tab");
    const activeTab = tabParam === "playoffs" ? "playoffs" : "season";
    const weekParam = searchParams.get("week");
    const rawRound = searchParams.get("round");
    const roundParam: PlayoffRound | null = rawRound && Object.keys(ROUND_LABELS).includes(rawRound)
        ? rawRound as PlayoffRound
        : null;

    const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
    const selectedRegion = regions.find(r => r.id === selectedSeason?.region_id);
    const regionCode = selectedRegion?.code;
    const maxWeeks = selectedSeason?.weeks || 10;
    const hasPlayoffs = selectedSeason?.playoff_started;

    // Default week query (used when no ?week in URL)
    const { defaultWeek, isLoading: defaultWeekLoading } = useDefaultWeekForSeason(
        activeTab === "season" && !weekParam ? (selectedSeasonId || null) : null
    );
    const parsedWeek = weekParam ? parseInt(weekParam, 10) : NaN;
    const effectiveWeek = Number.isFinite(parsedWeek) ? parsedWeek : (defaultWeek ?? 1);

    const { rounds: availableRounds } = useAvailablePlayoffRounds(
        hasPlayoffs ? (selectedSeasonId || null) : null
    );
    const { roundCounts } = usePlayoffRoundCounts(
        hasPlayoffs ? (selectedSeasonId || null) : null
    );

    const sortedRounds = useMemo(
        () => [...availableRounds].sort((a, b) => (ROUND_ORDER[a] ?? 999) - (ROUND_ORDER[b] ?? 999)),
        [availableRounds]
    );

    // Default round = first available
    const effectiveRound: PlayoffRound = (roundParam && sortedRounds.includes(roundParam))
        ? roundParam
        : (sortedRounds[0] as PlayoffRound) ?? "play_in";

    // Schedule fetches
    const weekArg = activeTab === "season"
        ? (weekParam ? effectiveWeek : (defaultWeekLoading ? null : effectiveWeek))
        : null;
    const { schedule: weekSchedule, isLoading: loadingWeek } = useWeekSchedule(
        activeTab === "season" ? (selectedSeasonId || null) : null,
        weekArg
    );
    const { schedule: playoffSchedule, isLoading: loadingPlayoff } = usePlayoffSchedule(
        activeTab === "playoffs" ? (selectedSeasonId || null) : null,
        activeTab === "playoffs" ? effectiveRound : null
    );

    const schedule = activeTab === "season" ? weekSchedule : playoffSchedule;
    const loading = activeTab === "season" ? loadingWeek : loadingPlayoff;

    // Standings for W-L records
    const { standings } = useStandings(selectedSeasonId || undefined, selectedRegion?.id || undefined);
    const recordByTeamId = useMemo(() => {
        const map = new Map<string, { wins: number; losses: number }>();
        for (const s of standings) {
            if (s.team_id) map.set(s.team_id, { wins: s.wins ?? 0, losses: s.losses ?? 0 });
        }
        return map;
    }, [standings]);

    // Team/player fetches
    const teamIds = useMemo(() => {
        const ids = new Set<string>();
        schedule.forEach(({ match }) => {
            if (match.home_team_id) ids.add(match.home_team_id);
            if (match.away_team_id) ids.add(match.away_team_id);
        });
        return Array.from(ids);
    }, [schedule]);

    const playerIds = useMemo(() => {
        const ids = new Set<string>();
        schedule.forEach(({ match }) => {
            if (match.match_mvp_player_id) ids.add(match.match_mvp_player_id);
            if (match.loser_mvp_player_id) ids.add(match.loser_mvp_player_id);
        });
        return Array.from(ids);
    }, [schedule]);

    const { teams: fetchedTeams } = useTeamsByIds(teamIds);
    const { players: fetchedPlayers } = usePlayersByIds(playerIds);
    const teams = useMemo(() => new Map(fetchedTeams.map(t => [t.id, t])), [fetchedTeams]);
    const players = useMemo(() => new Map(fetchedPlayers.map(p => [p.id, p])), [fetchedPlayers]);

    const roundCountMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const { round, count } of roundCounts) m.set(round, count);
        return m;
    }, [roundCounts]);

    const { weekCounts } = useWeekMatchCounts(selectedSeasonId || null);
    const weekCountMap = useMemo(() => {
        const m = new Map<number, number>();
        for (const { week, count } of weekCounts) m.set(week, count);
        return m;
    }, [weekCounts]);

    // URL writers
    function setTab(tab: "season" | "playoffs") {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === "season") {
            params.delete("tab");
            params.delete("round");
        } else {
            params.set("tab", "playoffs");
            params.delete("week");
        }
        router.replace(`/matches?${params.toString()}`);
    }

    function setWeek(week: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("week", week.toString());
        params.delete("tab");
        router.replace(`/matches?${params.toString()}`);
    }

    function setRound(round: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("round", round);
        params.set("tab", "playoffs");
        router.replace(`/matches?${params.toString()}`);
    }

    const subtitle = seasons.length === 0
        ? undefined
        : selectedSeason
            ? `${selectedSeason.name}${selectedRegion ? ` · ${selectedRegion.name}` : ""}`
            : "";

    const sorted = useMemo(
        () => [...schedule].sort((a, b) => matchCodeSortKey(a.match.match_code) - matchCodeSortKey(b.match.match_code)),
        [schedule]
    );

    return (
        <div className="page-wide space-y-6 py-6">
            <PublicPageHeader icon={CalendarDays} title="Matches" subtitle={subtitle} />

            {selectedSeasonId ? (
                <div className="space-y-4">
                    {/* Full-width 50/50 tab */}
                    <div className="grid grid-cols-2 border border-border rounded-sm overflow-hidden">
                        <button
                            onClick={() => setTab("season")}
                            className={cn(
                                "py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-r border-border",
                                activeTab === "season"
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            Regular Season
                        </button>
                        <button
                            onClick={() => hasPlayoffs && setTab("playoffs")}
                            disabled={!hasPlayoffs}
                            className={cn(
                                "py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                                activeTab === "playoffs"
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                                !hasPlayoffs && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            Playoffs
                        </button>
                    </div>

                    {/* Selector */}
                    {activeTab === "season" ? (
                        <WeekSelector
                            effectiveWeek={effectiveWeek}
                            maxWeeks={maxWeeks}
                            weekCountMap={weekCountMap}
                            onWeekChange={setWeek}
                        />
                    ) : (
                        <PlayoffStepper
                            rounds={sortedRounds}
                            effectiveRound={effectiveRound}
                            roundCountMap={roundCountMap}
                            onRoundChange={setRound}
                        />
                    )}

                    {/* Match list */}
                    <MatchList
                        sorted={sorted}
                        teams={teams}
                        players={players}
                        recordByTeamId={recordByTeamId}
                        regionCode={regionCode}
                        seasonSlug={selectedSeason?.slug}
                        loading={loading}
                        emptyMessage={
                            activeTab === "season"
                                ? "No matches scheduled for this week"
                                : "No matches in this playoff round"
                        }
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full rounded-sm" />
                    <Skeleton className="h-[52px] w-full rounded-sm" />
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-48 w-full rounded-sm" />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Week Selector ─────────────────────────────────────────────────────────────

interface WeekSelectorProps {
    effectiveWeek: number;
    maxWeeks: number;
    weekCountMap: Map<number, number>;
    onWeekChange: (week: number) => void;
}

function WeekSelector({ effectiveWeek, maxWeeks, weekCountMap, onWeekChange }: WeekSelectorProps) {
    const weeks = Array.from({ length: maxWeeks }, (_, i) => i + 1);
    return (
        <div className="flex border border-border rounded-sm overflow-hidden">
            {weeks.map(w => {
                const isActive = w === effectiveWeek;
                const count = weekCountMap.get(w);
                return (
                    <button
                        key={w}
                        onClick={() => onWeekChange(w)}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 px-2 py-2.5 border-r border-border last:border-r-0 transition-colors",
                            isActive
                                ? "bg-primary/20 text-primary"
                                : w < effectiveWeek
                                    ? "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                    >
                        <span className="flex items-center gap-1">
                            <Check className="w-3 h-3 shrink-0" />
                            <span className="text-xs font-semibold uppercase tracking-wider">WEEK {w}</span>
                        </span>
                        {count !== undefined && (
                            <span className={cn(
                                "text-[10px] font-normal mt-0.5",
                                isActive ? "text-primary/60" : "text-muted-foreground/50"
                            )}>
                                {count} match{count !== 1 ? "es" : ""}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Playoff Stepper ───────────────────────────────────────────────────────────

interface PlayoffStepperProps {
    rounds: string[];
    effectiveRound: string;
    roundCountMap: Map<string, number>;
    onRoundChange: (round: string) => void;
}

function PlayoffStepper({ rounds, effectiveRound, roundCountMap, onRoundChange }: PlayoffStepperProps) {
    const activeIdx = rounds.indexOf(effectiveRound);
    return (
        <div className="flex overflow-x-auto gap-0 scrollbar-hide border border-border rounded-sm">
            {rounds.map((round, idx) => {
                const isCompleted = idx < activeIdx;
                const isActive = round === effectiveRound;
                const count = roundCountMap.get(round);
                return (
                    <button
                        key={round}
                        onClick={() => onRoundChange(round)}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 px-2 py-2.5 text-xs font-semibold border-r border-border last:border-r-0 transition-colors",
                            isActive
                                ? "bg-primary/20 text-primary"
                                : isCompleted
                                    ? "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                    >
                        <span className="flex items-center gap-1">
                            <Check className="w-3 h-3 shrink-0" />
                            {ROUND_LABELS[round] || round}
                        </span>
                        {count !== undefined && (
                            <span className={cn(
                                "text-[10px] font-normal mt-0.5",
                                isActive ? "text-primary/60" : "text-muted-foreground/50"
                            )}>
                                {count} match{count !== 1 ? "es" : ""}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Match List ────────────────────────────────────────────────────────────────

interface MatchListProps {
    sorted: MatchWithDetails[];
    teams: Map<string, TeamWithRegion>;
    players: Map<string, Player>;
    recordByTeamId: Map<string, { wins: number; losses: number }>;
    regionCode?: string;
    seasonSlug?: string;
    loading: boolean;
    emptyMessage: string;
}

function MatchList({ sorted, teams, players, recordByTeamId, regionCode, seasonSlug, loading, emptyMessage }: MatchListProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-48 rounded-sm" />
                ))}
            </div>
        );
    }

    if (sorted.length === 0) {
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
            {sorted.map(({ match, sets, officials }, index) => {
                const homeTeam = match.home_team_id ? teams.get(match.home_team_id) : undefined;
                const awayTeam = match.away_team_id ? teams.get(match.away_team_id) : undefined;
                const matchMvp = match.match_mvp_player_id ? players.get(match.match_mvp_player_id) : null;
                const loserMvp = match.loser_mvp_player_id ? players.get(match.loser_mvp_player_id) : null;
                const homeRecord = match.home_team_id ? recordByTeamId.get(match.home_team_id) : undefined;
                const awayRecord = match.away_team_id ? recordByTeamId.get(match.away_team_id) : undefined;

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
                        href={buildPublicMatchHref({
                            matchCode: match.match_code,
                            homeTeamName: homeTeam?.name,
                            awayTeamName: awayTeam?.name,
                            regionCode,
                            seasonSlug,
                        })}
                        homeRecord={homeRecord}
                        awayRecord={awayRecord}
                        isPriority={index < 2}
                    />
                );
            })}
        </div>
    );
}
