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

/** The selector value a user just clicked, held until the server render catches up. */
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
    standings: StandingWithInfo[];
};

/**
 * Presentational plus URL state. Every piece of data is resolved and cached by the route
 * above; this component previously fetched all of it through nine SWR hooks, which meant
 * nine uncacheable server-action POSTs on every view.
 *
 * Still a client component because the tab/week/round selectors write to the URL. Those
 * writes trigger a server round trip, and the skeleton for it lives in the route's
 * `loading.tsx` rather than in local state.
 */
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
    standings,
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    /**
     * Optimistic selector state.
     *
     * Switching week/round only changes `searchParams`, which re-renders this route's
     * server component without remounting the segment — so `loading.tsx` never fires and
     * React holds the old UI until the new payload lands. Without this the click has no
     * visible effect for the length of a server round trip.
     *
     * `pending` carries the value the user just clicked so the selector can reflect it
     * immediately, while the list dims to mark the content behind it as stale. It clears
     * as soon as the transition settles, at which point the props already hold the same
     * value — so the swap is invisible.
     */
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

    // URL writers. Each marks its optimistic value before navigating so the selector
    // updates on click rather than a round trip later.
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

                    {/* Selector */}
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

                    {/* Match list. Dimmed while a switch is in flight — the rows below are
                        still the previous week's until the server render lands. */}
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

// ─── Match List ────────────────────────────────────────────────────────────────

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
