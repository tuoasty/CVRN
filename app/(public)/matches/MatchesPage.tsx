"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildPublicMatchHref } from "@/app/utils/matchDetailHref";
import { getRegionTimezone } from "@/app/utils/timezoneOptions";
import type { MatchWithDetails } from "@/server/domains/match";
import type { TeamWithRegion } from "@/server/domains/team";
import type { Region } from "@/shared/types/db";
import type { SeasonWithPlayoffConfig } from "@/server/domains/season";
import type { StandingWithInfo } from "@/server/domains/standing";
import type { StandingMethod } from "@/shared/types/standing";
import { buildScheduleView } from "@/app/features/matches/schedule/buildScheduleView";
import { ScheduleControls } from "@/app/features/matches/schedule/ScheduleControls";
import { ScheduleList } from "@/app/features/matches/schedule/ScheduleList";
import type { ScheduleKind } from "@/app/features/matches/schedule/types";

type Props = {
    season: SeasonWithPlayoffConfig;
    region: Region;
    activeTab: ScheduleKind;
    effectiveWeek: number;
    weeks: number[];
    matches: MatchWithDetails[];
    seeds: Record<string, number>;
    teams: TeamWithRegion[];
    standings: StandingWithInfo[];
};

export default function MatchesPage({ season, region, activeTab, effectiveWeek, weeks, matches, seeds, teams, standings }: Props) {
    const router = useRouter();
    const regionSlug = region.code.toLowerCase();
    const matchesBase = `/${regionSlug}/${season.slug}/matches`;

    const view = useMemo(() => {
        const records = new Map<string, { wins: number; losses: number }>();
        for (const s of standings) {
            if (s.team_id) records.set(s.team_id, { wins: s.wins ?? 0, losses: s.losses ?? 0 });
        }
        return buildScheduleView({
            kind: activeTab,
            matches,
            teams: new Map(teams.map(t => [t.id, t])),
            timeZone: getRegionTimezone(region.code),
            now: new Date(),
            standingMethod: region.standing_method as StandingMethod,
            seeds,
            records,
        });
    }, [activeTab, matches, teams, region.code, region.standing_method, seeds, standings]);

    const go = (tab: ScheduleKind, week?: number) => {
        const params = new URLSearchParams({ tab });
        if (tab === "season") params.set("week", String(week ?? effectiveWeek));
        router.replace(`${matchesBase}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="page-wide py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">{season.name} · {region.name}</p>
                </div>
                {season.playoff_started && (
                    <Link
                        href={`/${regionSlug}/${season.slug}/playoffs`}
                        className="text-sm font-medium underline underline-offset-4 hover:decoration-2"
                    >
                        Bracket
                    </Link>
                )}
            </div>

            <div className="mt-5">
                <ScheduleControls
                    kind={activeTab}
                    playoffsEnabled={!!season.playoff_started}
                    weeks={weeks}
                    week={effectiveWeek}
                    onKindChange={tab => go(tab)}
                    onWeekChange={week => go("season", week)}
                />
            </div>

            <ScheduleList
                view={view}
                kind={activeTab}
                hrefFor={row =>
                    buildPublicMatchHref({
                        matchCode: row.match.match_code,
                        homeTeamName: row.home.name,
                        awayTeamName: row.away.name,
                        regionCode: region.code,
                        seasonSlug: season.slug,
                    })
                }
            />
        </div>
    );
}
