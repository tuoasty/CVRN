"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWeekSchedule, usePlayoffSchedule } from "@/app/hooks/useMatches";
import { useTeamsByIds } from "@/app/hooks/useTeams";
import { useAllMediaPosts } from "@/app/hooks/useMediaPosts";
import Image from "next/image";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { buildMatchMediaTitle } from "@/app/utils/matchLabel";
import ManageMatchDialog from "@/app/features/matches/ManageMatchDialog";
import CompleteMatchDialog from "@/app/features/matches/CompleteMatchDialog";
import UpdateMatchDialog from "@/app/features/matches/UpdateMatchDialog";
import MatchMediaSlotButton from "@/app/features/media/MatchMediaSlotButton";
import { Badge } from "@/app/components/ui/badge";
import { MatchWithDetails } from "@/server/domains/match";
import { PlayoffRound } from "@/server/domains/playoff";
import type { MediaPost } from "@/server/domains/media";
import type { TeamWithRegion } from "@/server/domains/team";
import DeleteMatchDialog from "@/app/features/matches/DeleteMatchDialog";

interface SchedulePanelProps {
    seasonId: string;
    week?: number;
    round?: PlayoffRound;
    matchType: "season" | "playoff";
    regionCode?: string;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'pending':
            return {
                label: 'Pending',
                variant: 'secondary' as const,
                className: 'bg-amber-600/10 text-amber-600 border-amber-600/20'
            };
        case 'scheduled':
            return {
                label: 'Scheduled',
                variant: 'default' as const,
                className: 'bg-blue-600/10 text-blue-600 border-blue-600/20'
            };
        case 'completed':
            return {
                label: 'Completed',
                variant: 'default' as const,
                className: 'bg-green-600/10 text-green-600 border-green-600/20'
            };
        default:
            return { label: 'Unknown', variant: 'secondary' as const };
    }
};

/**
 * One row per match. This is a working surface, not a summary: MVPs, officials and LVR live
 * on the match detail page, so the row carries only what an admin acts on — who is playing,
 * the result, and the controls.
 */
export default function AdminSchedulePanel({ seasonId, week, round, matchType, regionCode }: SchedulePanelProps) {
    const router = useRouter();
    const { schedule: weekSchedule, isLoading: weekLoading, mutate: mutateWeek } = useWeekSchedule(
        matchType === "season" ? seasonId : null,
        matchType === "season" ? (week ?? null) : null
    );
    const { schedule: playoffScheduleData, isLoading: playoffLoading, mutate: mutatePlayoff } = usePlayoffSchedule(
        matchType === "playoff" ? seasonId : null,
        matchType === "playoff" ? (round ?? null) : null
    );

    const schedule: MatchWithDetails[] = matchType === "season" ? weekSchedule : playoffScheduleData;
    const loading = matchType === "season" ? weekLoading : playoffLoading;

    const reloadSchedule = () => {
        if (matchType === "season") mutateWeek();
        else mutatePlayoff();
    };

    const teamIds = useMemo(() => {
        const ids = new Set<string>();
        schedule.forEach(({ match }) => {
            if (match.home_team_id) ids.add(match.home_team_id);
            if (match.away_team_id) ids.add(match.away_team_id);
        });
        return Array.from(ids);
    }, [schedule]);

    const { teams: fetchedTeams } = useTeamsByIds(teamIds);
    const teams = useMemo(() => new Map(fetchedTeams.map(t => [t.id, t])), [fetchedTeams]);

    // The whole media list is already cached by SWR for /admin/media, so knowing the
    // attachment state of every row costs no extra request.
    const { posts: allMedia } = useAllMediaPosts();
    const mediaByMatch = useMemo(() => {
        const map = new Map<string, { gfx: MediaPost | null; vod: MediaPost | null }>();
        for (const post of allMedia) {
            if (!post.match_id) continue;
            if (post.type !== "gfx" && post.type !== "video") continue;
            const entry = map.get(post.match_id) ?? { gfx: null, vod: null };
            if (post.type === "gfx") entry.gfx ??= post;
            else entry.vod ??= post;
            map.set(post.match_id, entry);
        }
        return map;
    }, [allMedia]);

    if (!seasonId) {
        return (
            <div className="text-sm text-gray-500">
                Select a season and {matchType === "season" ? "week" : "round"} to view schedule
            </div>
        );
    }

    if (loading) {
        return (
            <div className="panel p-8">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            </div>
        );
    }

    if (schedule.length === 0) {
        return (
            <div className="panel p-8">
                <p className="text-muted-foreground text-center">
                    No matches {matchType === "playoff" ? "in this playoff round" : "scheduled for this week"}
                </p>
            </div>
        );
    }

    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    return (
        <div className="space-y-1.5">
            {schedule.map(({ match, sets }, index) => {
                const homeTeam = match.home_team_id ? teams.get(match.home_team_id) : undefined;
                const awayTeam = match.away_team_id ? teams.get(match.away_team_id) : undefined;
                const statusConfig = getStatusConfig(match.status);
                const media = mediaByMatch.get(match.id);
                const isCompleted = match.status === "completed";
                const homeWon = (match.home_sets_won ?? 0) > (match.away_sets_won ?? 0);
                const awayWon = (match.away_sets_won ?? 0) > (match.home_sets_won ?? 0);
                const mediaTitle = buildMatchMediaTitle({
                    homeTeamName: homeTeam?.name,
                    awayTeamName: awayTeam?.name,
                    matchType: match.match_type,
                    week: match.week,
                    matchCode: match.match_code,
                    playoffRound: match.match_type === "playoffs" ? round ?? null : null,
                });

                return (
                    <div
                        key={match.id}
                        onClick={() => router.push(`/admin/matches/${match.id}`)}
                        className="panel px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 cursor-pointer hover:border-primary/30 transition-colors
                                   lg:grid lg:grid-cols-[180px_minmax(0,1fr)_176px]
                                   xl:grid-cols-[180px_minmax(0,1fr)_240px_176px]"
                    >
                        {/* Schedule / details */}
                        <div className="w-[180px] shrink-0 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                                    M{index + 1}
                                </span>
                                {match.is_forfeit ? (
                                    <Badge variant="outline" className="rounded-sm text-[10px] h-4 px-1.5 font-semibold uppercase tracking-wider bg-red-600/10 text-red-600 border-red-600/20">
                                        Forfeit
                                    </Badge>
                                ) : (
                                    <Badge variant={statusConfig.variant} className={`rounded-sm text-[10px] h-4 px-1.5 font-semibold uppercase tracking-wider ${statusConfig.className || ''}`}>
                                        {statusConfig.label}
                                    </Badge>
                                )}
                                <Badge variant="outline" className="rounded-sm text-[10px] h-4 px-1.5">
                                    BO{match.best_of}
                                </Badge>
                                {match.match_type === "playoffs" && (
                                    <Badge variant="outline" className="rounded-sm text-[10px] h-4 px-1.5 bg-purple-600/10 text-purple-600 border-purple-600/20">
                                        Playoff
                                    </Badge>
                                )}
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                {regionTimezone
                                    ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                                    : match.scheduled_at
                                        ? new Date(match.scheduled_at).toLocaleString()
                                        : "Time TBD"
                                }
                            </span>
                        </div>

                        {/* Matchup — its own grid so the score lands at the same x on every row.
                            order-last below lg puts meta + controls on line 1 and the matchup on
                            line 2; in grid mode DOM order takes over again. */}
                        <div className="basis-full lg:basis-auto order-last lg:order-none min-w-0 grid grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] items-center gap-2">
                            <TeamSide team={homeTeam} won={isCompleted && homeWon} align="end" />
                            {isCompleted && match.home_sets_won !== null && match.away_sets_won !== null ? (
                                <span className="text-base font-bold tabular-nums text-center">
                                    <span className={homeWon ? "text-foreground" : "text-muted-foreground"}>{match.home_sets_won}</span>
                                    <span className="text-muted-foreground/50 px-1">–</span>
                                    <span className={awayWon ? "text-foreground" : "text-muted-foreground"}>{match.away_sets_won}</span>
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-muted-foreground/50 text-center">VS</span>
                            )}
                            <TeamSide team={awayTeam} won={isCompleted && awayWon} align="start" />
                        </div>

                        {/* Sets scored — fixed width so a 3-set row doesn't drag the controls left */}
                        <div className="hidden xl:flex items-center justify-start gap-1 w-[240px]">
                            {isCompleted && sets.map(set => (
                                <div key={set.set_number} className="flex items-center gap-0.5 px-1 py-0.5 rounded-sm bg-muted/50 border border-border/50">
                                    <span className={`text-[11px] font-semibold tabular-nums ${set.home_score > set.away_score ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {set.home_score}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">-</span>
                                    <span className={`text-[11px] font-semibold tabular-nums ${set.away_score > set.home_score ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {set.away_score}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Controls — five fixed slots. A scheduled row shows Complete where a
                            completed one shows Edit, and playoff rows have no Delete; empty slots
                            hold their width so the cluster never shifts between rows. */}
                        <div className="flex items-center justify-end gap-0.5 shrink-0 ml-auto lg:ml-0 lg:w-[176px]" onClick={(e) => e.stopPropagation()}>
                            <ManageMatchDialog
                                matchId={match.id}
                                scheduledAt={match.scheduled_at}
                                regionCode={regionCode}
                                match={match}
                                onSuccess={reloadSchedule}
                            />
                            {!(homeTeam && awayTeam && (match.status === 'scheduled' || isCompleted)) && (
                                <div className="h-10 w-10 sm:h-8 sm:w-8" aria-hidden />
                            )}
                            {match.status === 'scheduled' && homeTeam && awayTeam && (
                                <CompleteMatchDialog
                                    matchId={match.id}
                                    seasonId={seasonId}
                                    homeTeamId={match.home_team_id!}
                                    awayTeamId={match.away_team_id!}
                                    homeTeamName={homeTeam.name}
                                    awayTeamName={awayTeam.name}
                                    bestOf={match.best_of}
                                    onSuccess={reloadSchedule}
                                />
                            )}
                            {isCompleted && homeTeam && awayTeam && (
                                <UpdateMatchDialog
                                    matchId={match.id}
                                    seasonId={seasonId}
                                    homeTeamId={match.home_team_id!}
                                    awayTeamId={match.away_team_id!}
                                    homeTeamName={homeTeam.name}
                                    awayTeamName={awayTeam.name}
                                    bestOf={match.best_of}
                                    currentSets={sets}
                                    currentMatchMvpId={match.match_mvp_player_id || ""}
                                    currentLoserMvpId={match.loser_mvp_player_id || ""}
                                    onSuccess={reloadSchedule}
                                    currentIsForfeit={match.is_forfeit ?? false}
                                />
                            )}
                            <MatchMediaSlotButton matchId={match.id} slot="gfx" current={media?.gfx ?? null} defaultTitle={mediaTitle} />
                            <MatchMediaSlotButton matchId={match.id} slot="video" current={media?.vod ?? null} defaultTitle={mediaTitle} />
                            {match.match_type === "season" ? (
                                <DeleteMatchDialog
                                    matchId={match.id}
                                    onSuccess={reloadSchedule}
                                />
                            ) : (
                                <div className="h-10 w-10 sm:h-8 sm:w-8" aria-hidden />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/** Home mirrors inward (name then logo), away reads outward (logo then name). */
function TeamSide({ team, won, align }: { team?: TeamWithRegion; won: boolean; align: "start" | "end" }) {
    // min-w-0 is what lets truncate actually fire — a flex item defaults to min-width:auto
    // and would otherwise push the score column off its track.
    const name = (
        <span className={`text-sm truncate flex-1 min-w-0 ${align === "end" ? "text-right" : ""} ${
            won ? "font-bold text-foreground" : "font-semibold text-muted-foreground"
        }`}>
            {team?.name || "TBD"}
        </span>
    );
    return (
        <div className={`flex items-center gap-2 min-w-0 ${align === "end" ? "flex-row-reverse" : ""}`}>
            <div className="relative w-10 h-10 shrink-0">
                {team?.is_bye ? (
                    <div className="w-full h-full rounded-sm bg-orange-600/10 border border-orange-600/20 flex items-center justify-center">
                        <span className="text-[10px] text-orange-600 font-bold">BYE</span>
                    </div>
                ) : team?.logo_url ? (
                    <Image src={team.logo_url} alt={team.name} fill sizes="40px" className="object-contain" />
                ) : (
                    <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground font-bold">?</span>
                    </div>
                )}
            </div>
            {name}
        </div>
    );
}
