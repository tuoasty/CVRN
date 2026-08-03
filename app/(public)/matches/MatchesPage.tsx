"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";
import PublicMatchCard from "@/app/(public)/matches/PublicMatchCard";
import { buildPublicMatchHref } from "@/app/utils/matchDetailHref";
import { MatchWithDetails } from "@/server/domains/match";
import { TeamWithRegion } from "@/server/domains/team";
import { Player, Region } from "@/shared/types/db";
import type { PlayoffRound } from "@/server/domains/playoff";
import type { SeasonWithPlayoffConfig } from "@/server/domains/season";
import type { StandingWithInfo } from "@/server/domains/standing";
import { StandingMethod } from "@/shared/types/standing";
import { MatchTypeTabs, WeekSelector, PlayoffStepper } from "@/app/features/matches/ScheduleSelectors";

function matchCodeSortKey(code: string | null | undefined): number {
    if (!code) return Infinity;
    const week = code.match(/^W(\d+)-M(\d+)$/i);
    if (week) return parseInt(week[1]) * 1000 + parseInt(week[2]);
    const suffix = code.match(/-(\d+)$/);
    if (suffix) return parseInt(suffix[1]);
    return Infinity;
}

type Pending = { tab?: "season" | "playoffs"; week?: number; round?: PlayoffRound };

type Props = {
    season: SeasonWithPlayoffConfig;
    region: Region;
    activeTab: "season" | "playoffs";
    effectiveWeek: number;
    effectiveRound: PlayoffRound;
    sortedRounds: PlayoffRound[];
    roundCounts: { round: string; count: number }[];
    weekCounts: { week: number; total: number; completed: number }[];
    schedule: MatchWithDetails[];
    teams: TeamWithRegion[];
    players: Player[];
    standings: StandingWithInfo[];
};

export default function MatchesPage({
    season,
    region,
    activeTab,
    effectiveWeek,
    effectiveRound,
    sortedRounds,
    roundCounts,
    weekCounts,
    schedule,
    teams,
    players,
    standings,
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [pending, setPending] = useState<Pending | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!isPending) setPending(null);
    }, [isPending]);

    const displayTab = pending?.tab ?? activeTab;
    const displayWeek = pending?.week ?? effectiveWeek;
    const displayRound = pending?.round ?? effectiveRound;

    const regionCode = region.code;
    const hasPlayoffs = season.playoff_started;

    const recordByTeamId = useMemo(() => {
        const map = new Map<string, { wins: number; losses: number }>();
        for (const s of standings) {
            if (s.team_id) map.set(s.team_id, { wins: s.wins ?? 0, losses: s.losses ?? 0 });
        }
        return map;
    }, [standings]);

    const teamsMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
    const playersMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

    const roundCountMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const { round, count } of roundCounts) m.set(round, count);
        return m;
    }, [roundCounts]);

    const availableWeeks = useMemo(
        () => weekCounts.map(w => w.week).sort((a, b) => a - b),
        [weekCounts]
    );

    const matchesBase = `/${region.code.toLowerCase()}/${season.slug}/matches`;

    function setTab(tab: "season" | "playoffs") {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === "season") {
            params.delete("tab");
            params.delete("round");
        } else {
            params.set("tab", "playoffs");
            params.delete("week");
        }
        setPending({ tab });
        startTransition(() => router.replace(`${matchesBase}?${params.toString()}`));
    }

    function setWeek(week: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("week", week.toString());
        params.delete("tab");
        setPending({ week, tab: "season" });
        startTransition(() => router.replace(`${matchesBase}?${params.toString()}`));
    }

    function setRound(round: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("round", round);
        params.set("tab", "playoffs");
        setPending({ round: round as PlayoffRound, tab: "playoffs" });
        startTransition(() => router.replace(`${matchesBase}?${params.toString()}`));
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
                        activeTab={displayTab}
                        playoffsEnabled={!!hasPlayoffs}
                        onTabChange={setTab}
                    />

                    {}
                    {displayTab === "season" ? (
                        <WeekSelector
                            effectiveWeek={displayWeek}
                            weeks={availableWeeks}
                            onWeekChange={setWeek}
                        />
                    ) : (
                        <PlayoffStepper
                            rounds={sortedRounds}
                            effectiveRound={displayRound}
                            roundCountMap={roundCountMap}
                            onRoundChange={setRound}
                        />
                    )}

                    {}
                    <div
                        className={cn(
                            "transition-opacity duration-150",
                            isPending && "opacity-50 pointer-events-none"
                        )}
                        aria-busy={isPending}
                    >
                        <MatchList
                            sorted={sorted}
                            teams={teamsMap}
                            players={playersMap}
                            recordByTeamId={recordByTeamId}
                            regionCode={regionCode}
                            seasonSlug={season.slug}
                            standingMethod={region.standing_method as StandingMethod}
                            emptyMessage={
                                displayTab === "season"
                                    ? "No matches scheduled for this week"
                                    : "No matches in this playoff round"
                            }
                        />
                    </div>
                </div>
        </div>
    );
}

interface MatchListProps {
    sorted: MatchWithDetails[];
    teams: Map<string, TeamWithRegion>;
    players: Map<string, Player>;
    recordByTeamId: Map<string, { wins: number; losses: number }>;
    regionCode?: string;
    seasonSlug?: string;
    standingMethod?: StandingMethod;
    emptyMessage: string;
}

function MatchList({ sorted, teams, players, recordByTeamId, regionCode, seasonSlug, standingMethod, emptyMessage }: MatchListProps) {
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
                        standingMethod={standingMethod}
                    />
                );
            })}
        </div>
    );
}
