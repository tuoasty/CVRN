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
import { Region } from "@/shared/types/db";
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
    weekCounts: { week: number; total: number; completed: number }[];
    schedule: MatchWithDetails[];
    teams: TeamWithRegion[];
    standings: StandingWithInfo[];
};

export default function MatchesPage({
    season,
    region,
    activeTab,
    effectiveWeek,
    effectiveRound,
    sortedRounds,
    weekCounts,
    schedule,
    teams,
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

    const availableWeeks = useMemo(
        () => weekCounts.map(w => w.week).sort((a, b) => a - b),
        [weekCounts]
    );

    const matchesBase = `/${region.code.toLowerCase()}/${season.slug}/matches`;

    function setTab(tab: "season" | "playoffs") {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === "season") {
            params.set("tab", "season");
            params.delete("round");
            if (!params.get("week")) params.set("week", String(effectiveWeek));
        } else {
            params.set("tab", "playoffs");
            params.delete("week");
            if (!params.get("round")) params.set("round", effectiveRound);
        }
        setPending({ tab });
        startTransition(() => router.replace(`${matchesBase}?${params.toString()}`));
    }

    function setWeek(week: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", "season");
        params.set("week", week.toString());
        params.delete("round");
        setPending({ week, tab: "season" });
        startTransition(() => router.replace(`${matchesBase}?${params.toString()}`));
    }

    function setRound(round: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", "playoffs");
        params.set("round", round);
        params.delete("week");
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
    recordByTeamId: Map<string, { wins: number; losses: number }>;
    regionCode?: string;
    seasonSlug?: string;
    standingMethod?: StandingMethod;
    emptyMessage: string;
}

function MatchList({ sorted, teams, recordByTeamId, regionCode, seasonSlug, standingMethod, emptyMessage }: MatchListProps) {
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
                const homeRecord = match.home_team_id ? recordByTeamId.get(match.home_team_id) : undefined;
                const awayRecord = match.away_team_id ? recordByTeamId.get(match.away_team_id) : undefined;

                return (
                    <PublicMatchCard
                        key={match.id}
                        matchDetails={{ match, sets, officials }}
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
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
