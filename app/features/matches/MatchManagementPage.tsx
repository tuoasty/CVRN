"use client";

import { useEffect, useMemo, useState } from "react";
import CreateMatchesPanel from "@/app/features/matches/CreateMatchesPanel";
import AdminScheduleRowsSkeleton from "@/app/features/matches/AdminScheduleRowsSkeleton";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import { useDefaultWeekForSeason, useSeasonPlayoffSchedule, useWeekMatchCounts, useWeekSchedule } from "@/app/hooks/useMatches";
import { useTeamsByIds } from "@/app/hooks/useTeams";
import { useStandings } from "@/app/hooks/useStandings";
import { useAllMediaPosts } from "@/app/hooks/useMediaPosts";
import { useAdminContextStore } from "@/app/stores/adminContextStore";
import { useAdminReady } from "@/app/admin/AdminReadyContext";
import { useHasGroup } from "@/app/admin/AdminRoleProvider";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { buildAdminMatchHref } from "@/app/utils/matchDetailHref";
import { buildMatchMediaTitle } from "@/app/utils/matchLabel";
import { getRegionTimezone } from "@/app/utils/timezoneOptions";
import { buildScheduleView } from "@/app/features/matches/schedule/buildScheduleView";
import { ScheduleControls } from "@/app/features/matches/schedule/ScheduleControls";
import { ScheduleList } from "@/app/features/matches/schedule/ScheduleList";
import { AdminRowActions } from "@/app/features/matches/schedule/AdminRowActions";
import type { ScheduleKind } from "@/app/features/matches/schedule/types";
import type { MediaPost } from "@/server/domains/media";
import type { MatchWithDetails } from "@/server/domains/match";
import type { StandingMethod } from "@/shared/types/standing";

const EMPTY_SEEDS: Record<string, number> = {};

export default function MatchManagementPage() {
    const { selectedSeasonId } = useAdminContextStore();
    const adminReady = useAdminReady();
    const { seasons } = useSeasons();
    const { regions } = useRegions();

    const season = seasons.find(s => s.id === selectedSeasonId);
    const region = regions.find(r => r.id === season?.region_id);
    const hasPlayoffs = !!season?.playoff_started;

    const [kind, setKind] = useState<ScheduleKind>("season");
    const [weekOverride, setWeekOverride] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const isAdmin = useHasGroup("admin");

    useEffect(() => {
        setWeekOverride(null);
        setCreating(false);
        setKind(hasPlayoffs ? "playoffs" : "season");
    }, [selectedSeasonId, hasPlayoffs]);

    const { defaultWeek } = useDefaultWeekForSeason(selectedSeasonId && weekOverride == null ? selectedSeasonId : null);
    const { weekCounts } = useWeekMatchCounts(selectedSeasonId);
    const weeks = useMemo(() => weekCounts.map(w => w.week).sort((a, b) => a - b), [weekCounts]);
    const week = weekOverride ?? defaultWeek ?? 1;

    const weekQuery = useWeekSchedule(kind === "season" ? selectedSeasonId : null, kind === "season" ? week : null);
    const playoffQuery = useSeasonPlayoffSchedule(kind === "playoffs" ? selectedSeasonId : null);
    const matches: MatchWithDetails[] = kind === "season" ? weekQuery.schedule : playoffQuery.schedule.matches;
    const seeds = kind === "playoffs" ? playoffQuery.schedule.seeds : EMPTY_SEEDS;
    const isLoading = kind === "season" ? weekQuery.isLoading : playoffQuery.isLoading;
    const reload = () => {
        if (kind === "season") weekQuery.mutate();
        else playoffQuery.mutate();
    };

    const teamIds = useMemo(() => {
        const ids = new Set<string>();
        for (const { match } of matches) {
            if (match.home_team_id) ids.add(match.home_team_id);
            if (match.away_team_id) ids.add(match.away_team_id);
        }
        return [...ids];
    }, [matches]);
    const { teams, isLoading: teamsLoading } = useTeamsByIds(teamIds);
    const { standings } = useStandings(selectedSeasonId ?? undefined, season?.region_id);

    const { posts } = useAllMediaPosts();
    const mediaByMatch = useMemo(() => {
        const map = new Map<string, { gfx: MediaPost | null; vod: MediaPost | null }>();
        for (const post of posts) {
            if (!post.match_id || (post.type !== "gfx" && post.type !== "video")) continue;
            const entry = map.get(post.match_id) ?? { gfx: null, vod: null };
            if (post.type === "gfx") entry.gfx ??= post;
            else entry.vod ??= post;
            map.set(post.match_id, entry);
        }
        return map;
    }, [posts]);

    const detailsById = useMemo(() => new Map(matches.map(m => [m.match.id, m])), [matches]);

    const view = useMemo(() => {
        const records = new Map<string, { wins: number; losses: number }>();
        for (const s of standings) {
            if (s.team_id) records.set(s.team_id, { wins: s.wins ?? 0, losses: s.losses ?? 0 });
        }
        return buildScheduleView({
            kind,
            matches,
            teams: new Map(teams.map(t => [t.id, t])),
            timeZone: getRegionTimezone(region?.code ?? ""),
            now: new Date(),
            standingMethod: (region?.standing_method ?? "lvr") as StandingMethod,
            seeds,
            records,
        });
    }, [kind, matches, teams, region?.code, region?.standing_method, seeds, standings]);

    const regionCode = region?.code ?? "";

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
                        {season && region ? (
                            <p className="mt-0.5 text-sm text-muted-foreground">{season.name} · {region.name}</p>
                        ) : (
                            <Skeleton className="mt-1.5 h-4 w-48 rounded-sm" />
                        )}
                    </div>
                    {isAdmin && kind === "season" && selectedSeasonId && (
                        creating ? (
                            <button
                                type="button"
                                onClick={() => setCreating(false)}
                                className="text-sm font-medium underline underline-offset-4 hover:decoration-2"
                            >
                                Back to schedule
                            </button>
                        ) : (
                            <Button variant="outline" onClick={() => setCreating(true)}>Create matches</Button>
                        )
                    )}
                </div>

                {!adminReady ? (
                    <div className="mt-6">
                        <AdminScheduleRowsSkeleton />
                    </div>
                ) : !selectedSeasonId ? (
                    <p className="mt-6 text-sm text-muted-foreground">Select a season in the navbar to manage matches</p>
                ) : (
                    <>
                        <div className="mt-5">
                            <ScheduleControls
                                kind={kind}
                                playoffsEnabled={hasPlayoffs}
                                weeks={weeks}
                                week={week}
                                onKindChange={next => {
                                    setKind(next);
                                    setCreating(false);
                                }}
                                onWeekChange={setWeekOverride}
                                stickyTop="top-[61px] lg:top-[53px]"
                            />
                        </div>
                        {isAdmin && creating && kind === "season" ? (
                            <div className="mt-6">
                                <CreateMatchesPanel
                                    seasonId={selectedSeasonId}
                                    week={week}
                                    onSuccess={() => {
                                        setCreating(false);
                                        weekQuery.mutate();
                                    }}
                                />
                            </div>
                        ) : (isLoading && matches.length === 0) || (teamsLoading && teams.length === 0) ? (
                            <div className="mt-6">
                                <AdminScheduleRowsSkeleton />
                            </div>
                        ) : (
                            <ScheduleList
                                view={view}
                                kind={kind}
                                hrefFor={row => (isAdmin ? buildAdminMatchHref(row.matchId) : null)}
                                renderActions={row => {
                                    const details = detailsById.get(row.matchId);
                                    if (!details) return null;
                                    return (
                                        <AdminRowActions
                                            row={row}
                                            details={details}
                                            seasonId={selectedSeasonId}
                                            regionCode={regionCode}
                                            kind={kind}
                                            media={mediaByMatch.get(row.matchId)}
                                            mediaTitle={buildMatchMediaTitle({
                                                homeTeamName: row.home.name,
                                                awayTeamName: row.away.name,
                                                matchType: row.match.match_type,
                                                week: row.match.week,
                                                matchCode: row.match.match_code,
                                                playoffRound: details.playoff_round ?? null,
                                            })}
                                            onChanged={reload}
                                        />
                                    );
                                }}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
