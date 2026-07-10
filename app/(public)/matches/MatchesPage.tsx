"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSeasonContext } from "@/app/(public)/[region]/[season]/context";
import { useWeekSchedule, usePlayoffSchedule, useAvailablePlayoffRounds, useDefaultWeekForSeason, usePlayoffRoundCounts, useWeekMatchCounts } from "@/app/hooks/useMatches";
import { useTeamsByIds } from "@/app/hooks/useTeams";
import { usePlayersByIds } from "@/app/hooks/usePlayers";
import { useStandings } from "@/app/hooks/useStandings";
import { Skeleton } from "@/app/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";
import PublicMatchCard from "@/app/(public)/matches/PublicMatchCard";
import { buildPublicMatchHref } from "@/app/utils/matchDetailHref";
import { MatchWithDetails } from "@/server/domains/match";
import { TeamWithRegion } from "@/server/domains/team";
import { Player } from "@/shared/types/db";
import type { PlayoffRound } from "@/server/domains/playoff";
import { isPlayoffRound, sortRounds } from "@/app/utils/playoffRounds";
import { MatchTypeTabs, WeekSelector, PlayoffStepper } from "@/app/features/matches/ScheduleSelectors";

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
    const { season, region } = useSeasonContext();

    // URL state
    const tabParam = searchParams.get("tab");
    const activeTab = tabParam === "playoffs" ? "playoffs" : "season";
    const weekParam = searchParams.get("week");
    const rawRound = searchParams.get("round");
    const roundParam: PlayoffRound | null = isPlayoffRound(rawRound) ? rawRound : null;

    const regionCode = region.code;
    const hasPlayoffs = season.playoff_started;

    // Default week query (used when no ?week in URL)
    const { defaultWeek, isLoading: defaultWeekLoading } = useDefaultWeekForSeason(
        activeTab === "season" && !weekParam ? season.id : null
    );
    const parsedWeek = weekParam ? parseInt(weekParam, 10) : NaN;
    const effectiveWeek = Number.isFinite(parsedWeek) ? parsedWeek : (defaultWeek ?? 1);

    const { rounds: availableRounds } = useAvailablePlayoffRounds(
        hasPlayoffs ? season.id : null
    );
    const { roundCounts } = usePlayoffRoundCounts(
        hasPlayoffs ? season.id : null
    );

    const sortedRounds = useMemo(
        () => sortRounds(availableRounds.filter(isPlayoffRound)),
        [availableRounds]
    );

    // Default round = first available
    const effectiveRound: PlayoffRound = (roundParam && sortedRounds.includes(roundParam))
        ? roundParam
        : sortedRounds[0] ?? "play_in";

    // Schedule fetches
    const weekArg = activeTab === "season"
        ? (weekParam ? effectiveWeek : (defaultWeekLoading ? null : effectiveWeek))
        : null;
    const { schedule: weekSchedule, isLoading: loadingWeek } = useWeekSchedule(
        activeTab === "season" ? season.id : null,
        weekArg
    );
    const { schedule: playoffSchedule, isLoading: loadingPlayoff } = usePlayoffSchedule(
        activeTab === "playoffs" ? season.id : null,
        activeTab === "playoffs" ? effectiveRound : null
    );

    const schedule = activeTab === "season" ? weekSchedule : playoffSchedule;
    const loading = activeTab === "season" ? loadingWeek : loadingPlayoff;

    // Standings for W-L records
    const { standings } = useStandings(season.id, region.id);
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

    const { weekCounts } = useWeekMatchCounts(season.id);
    const availableWeeks = useMemo(
        () => weekCounts.map(w => w.week).sort((a, b) => a - b),
        [weekCounts]
    );

    const matchesBase = `/${region.code.toLowerCase()}/${season.slug}/matches`;

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
        router.replace(`${matchesBase}?${params.toString()}`);
    }

    function setWeek(week: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("week", week.toString());
        params.delete("tab");
        router.replace(`${matchesBase}?${params.toString()}`);
    }

    function setRound(round: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("round", round);
        params.set("tab", "playoffs");
        router.replace(`${matchesBase}?${params.toString()}`);
    }

    const subtitle = `${season.name} · ${region.name}`;

    const sorted = useMemo(
        () => [...schedule].sort((a, b) => matchCodeSortKey(a.match.match_code) - matchCodeSortKey(b.match.match_code)),
        [schedule]
    );

    return (
        <div className="page-wide space-y-6 py-6">
            <PublicPageHeader icon={CalendarDays} title="Matches" subtitle={subtitle} />

            <div className="space-y-4">
                    <MatchTypeTabs
                        activeTab={activeTab}
                        playoffsEnabled={!!hasPlayoffs}
                        onTabChange={setTab}
                    />

                    {/* Selector */}
                    {activeTab === "season" ? (
                        <WeekSelector
                            effectiveWeek={effectiveWeek}
                            weeks={availableWeeks}
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
                        seasonSlug={season.slug}
                        loading={loading}
                        emptyMessage={
                            activeTab === "season"
                                ? "No matches scheduled for this week"
                                : "No matches in this playoff round"
                        }
                    />
                </div>
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
