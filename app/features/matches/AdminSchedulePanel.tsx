"use client";

import React, {useEffect, useState} from "react";
import {useMatchesStore} from "@/app/stores/matchStore";
import {useTeamsStore} from "@/app/stores/teamStore";
import {clientLogger} from "@/app/utils/clientLogger";
import Image from "next/image";
import {TeamWithRegion} from "@/server/dto/team.dto";
import {formatDateInTimezone, getRegionTimezone} from "@/app/utils/timezoneOptions";
import {useOfficialStore} from "@/app/stores/officialStore";
import ManageMatchDialog from "@/app/features/matches/ManageMatchDialog";
import CompleteMatchDialog from "@/app/features/matches/CompleteMatchDialog";
import { Badge } from "@/app/components/ui/badge";
import {usePlayerStore} from "@/app/stores/playerStore";
import {MatchSet, Player} from "@/shared/types/db";
import UpdateMatchDialog from "@/app/features/matches/UpdateMatchDialog";

interface SchedulePanelProps {
    seasonId: string;
    week: number;
    regionCode?: string;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'pending':
            return { label: 'Pending', variant: 'secondary' as const };
        case 'scheduled':
            return { label: 'Scheduled', variant: 'default' as const };
        case 'completed':
            return { label: 'Completed', variant: 'default' as const, className: 'bg-green-600/10 text-green-600 border-green-600/20' };
        default:
            return { label: 'Unknown', variant: 'secondary' as const };
    }
};

export default function AdminSchedulePanel({seasonId, week, regionCode}: SchedulePanelProps) {
    const {fetchMatchesForWeek, matchesForWeekCache, fetchMatchSets, matchSetsCache, loading} = useMatchesStore();
    const {fetchMatchOfficials, matchOfficialsCache} = useOfficialStore();
    const {fetchTeamsByIds} = useTeamsStore();
    const {fetchPlayersByIds} = usePlayerStore();
    const [matchSets, setMatchSets] = useState<Map<string, MatchSet[]>>(new Map());
    const [players, setPlayers] = useState<Map<string, Player>>(new Map());

    const [teams, setTeams] = useState<Map<string, TeamWithRegion>>(new Map());
    const [matchOfficials, setMatchOfficials] = useState<Map<string, {
        referees: Array<{
            id: string;
            username: string | null;
            display_name: string | null;
            avatar_url: string | null
        }>;
        media: Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }>;
    }>>(new Map());
    const [teamsLoaded, setTeamsLoaded] = useState(false);
    const [officialsLoading, setOfficialsLoading] = useState(false);

    const [loadingAbortController, setLoadingAbortController] = useState<AbortController | null>(null);

    useEffect(() => {
        if (seasonId) {
            loadSchedule();
        }
    }, [seasonId, week]);

    const loadSchedule = async () => {
        if (loadingAbortController) {
            loadingAbortController.abort();
        }

        const abortController = new AbortController();
        setLoadingAbortController(abortController);

        setTeamsLoaded(false);
        setOfficialsLoading(true);

        try {
            await fetchMatchesForWeek(seasonId, week);

            if (abortController.signal.aborted) {
                clientLogger.info("SchedulePanel", "Request aborted", {seasonId, week});
                return;
            }

            const cacheKey = `${seasonId}-${week}`;
            const cached = matchesForWeekCache.get(cacheKey);

            if (cached) {
                const teamIds = new Set<string>();
                const playerIds = new Set<string>();

                cached.data.forEach(match => {
                    teamIds.add(match.home_team_id);
                    teamIds.add(match.away_team_id);

                    if (match.match_mvp_player_id) {
                        playerIds.add(match.match_mvp_player_id);
                    }
                    if (match.loser_mvp_player_id) {
                        playerIds.add(match.loser_mvp_player_id);
                    }
                });

                const fetchedTeams = await fetchTeamsByIds(Array.from(teamIds));

                if (abortController.signal.aborted) {
                    clientLogger.info("SchedulePanel", "Request aborted after teams fetch", {seasonId, week});
                    return;
                }

                const teamsMap = new Map(fetchedTeams.map(t => [t.id, t]));
                setTeams(teamsMap);

                if (playerIds.size > 0) {
                    const fetchedPlayers = await fetchPlayersByIds(Array.from(playerIds));

                    if (abortController.signal.aborted) {
                        clientLogger.info("SchedulePanel", "Request aborted after players fetch", {seasonId, week});
                        return;
                    }

                    const playersMap = new Map(fetchedPlayers.map(p => [p.id, p]));
                    setPlayers(playersMap);

                    clientLogger.info("SchedulePanel", "Players loaded", {
                        playerCount: fetchedPlayers.length
                    });
                }

                setTeamsLoaded(true);

                clientLogger.info("SchedulePanel", "Teams loaded", {
                    matchCount: cached.data.length,
                    teamCount: fetchedTeams.length
                });

                const officialsResults = await Promise.all(
                    cached.data.map(async (match) => {
                        await fetchMatchOfficials(match.id);
                        const officialsCached = matchOfficialsCache.get(match.id);

                        if (officialsCached) {
                            const referees = officialsCached.data
                                .filter(mo => mo.official_type === "referee")
                                .map(mo => ({
                                    id: mo.official.id,
                                    username: mo.official.username,
                                    display_name: mo.official.display_name,
                                    avatar_url: mo.official.avatar_url
                                }));
                            const media = officialsCached.data
                                .filter(mo => mo.official_type === "media")
                                .map(mo => ({
                                    id: mo.official.id,
                                    username: mo.official.username,
                                    display_name: mo.official.display_name,
                                    avatar_url: mo.official.avatar_url
                                }));
                            return {matchId: match.id, referees, media};
                        }
                        return {matchId: match.id, referees: [], media: []};
                    })
                );

                const setsResults = await Promise.all(
                    cached.data
                        .filter(match => match.status === 'completed')
                        .map(async (match) => {
                            await fetchMatchSets(match.id);
                            const setsCached = matchSetsCache.get(match.id);
                            return {
                                matchId: match.id,
                                sets: setsCached?.data || []
                            };
                        })
                );


                if (abortController.signal.aborted) {
                    clientLogger.info("SchedulePanel", "Request aborted before setting officials", {seasonId, week});
                    return;
                }

                const officialsMap = new Map(
                    officialsResults.map(result => [result.matchId, {referees: result.referees, media: result.media}])
                );

                const setsMap = new Map(
                    setsResults.map(result => [result.matchId, result.sets])
                );

                setMatchOfficials(officialsMap);
                setOfficialsLoading(false);
                setMatchSets(setsMap);

                clientLogger.info("SchedulePanel", "Officials loaded", {
                    matchesWithOfficials: officialsResults.filter(r => r.referees.length > 0 || r.media.length > 0).length
                });
            }
        } catch (error) {
            if (!abortController.signal.aborted) {
                clientLogger.error("SchedulePanel", "Error loading schedule", {error});
            }
            setOfficialsLoading(false);
        } finally {
            setLoadingAbortController(null);
        }
    };

    if (!seasonId) {
        return (
            <div className="text-sm text-gray-500">
                Select a season and week to view schedule
            </div>
        );
    }

    const cacheKey = `${seasonId}-${week}`;
    const cached = matchesForWeekCache.get(cacheKey);
    const matches = cached?.data || [];

    if (loading || !teamsLoaded) {
        return (
            <div className="panel p-8">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (matches.length === 0) {
        return (
            <div className="panel p-8">
                <p className="text-muted-foreground text-center">
                    No matches scheduled for this week
                </p>
            </div>
        );
    }

    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    return (
        <div className="space-y-4">
            {matches.map((match, index) => {
                const homeTeam = teams.get(match.home_team_id);
                const awayTeam = teams.get(match.away_team_id);
                const officials = matchOfficials.get(match.id);
                const statusConfig = getStatusConfig(match.status);
                const matchMvp = match.match_mvp_player_id ? players.get(match.match_mvp_player_id) : null;
                const loserMvp = match.loser_mvp_player_id ? players.get(match.loser_mvp_player_id) : null;
                const sets = matchSets.get(match.id) || [];

                return (
                    <div key={match.id} className="panel p-4">
                        <div className="space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-muted-foreground">
                                        Match {index + 1}
                                    </span>
                                    <Badge
                                        variant={statusConfig.variant}
                                        className={`rounded-sm ${statusConfig.className || ''}`}
                                    >
                                        {statusConfig.label}
                                    </Badge>
                                    <Badge variant="outline" className="rounded-sm">
                                        BO{match.best_of}
                                    </Badge>
                                    {match.status === 'scheduled' && officials && (officials.referees.length === 0 || officials.media.length === 0) && (
                                        <span className="text-amber-600" title="Missing required officials">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                            </svg>
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-muted-foreground">
                                        {regionTimezone
                                            ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                                            : match.scheduled_at
                                                ? new Date(match.scheduled_at).toLocaleString()
                                                : "Time TBD"
                                        }
                                    </div>

                                    <div className="flex gap-2">
                                        <ManageMatchDialog
                                            matchId={match.id}
                                            scheduledAt={match.scheduled_at}
                                            regionCode={regionCode}
                                            match={match}
                                            onSuccess={loadSchedule}
                                        />

                                        {match.status === 'scheduled' && homeTeam && awayTeam && (
                                            <CompleteMatchDialog
                                                matchId={match.id}
                                                seasonId={seasonId}
                                                homeTeamId={match.home_team_id}
                                                awayTeamId={match.away_team_id}
                                                homeTeamName={homeTeam.name}
                                                awayTeamName={awayTeam.name}
                                                bestOf={match.best_of}
                                                onSuccess={loadSchedule}
                                            />
                                        )}

                                        {match.status === 'completed' && homeTeam && awayTeam && !officialsLoading && (
                                            <UpdateMatchDialog
                                                matchId={match.id}
                                                seasonId={seasonId}
                                                homeTeamId={match.home_team_id}
                                                awayTeamId={match.away_team_id}
                                                homeTeamName={homeTeam.name}
                                                awayTeamName={awayTeam.name}
                                                bestOf={match.best_of}
                                                currentSets={sets}
                                                currentMatchMvpId={match.match_mvp_player_id || ""}
                                                currentLoserMvpId={match.loser_mvp_player_id || ""}
                                                onSuccess={loadSchedule}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Team Matchup */}
                            <div className="space-y-3">
                                {/* Team Names and Score */}
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                                    {/* Home Team */}
                                    <div className="flex justify-end items-center gap-3">
                                        {homeTeam && (
                                            <>
                                                <div className="flex flex-col items-end gap-0.5 min-w-0">
                        <span className="font-semibold text-sm text-right truncate w-full">
                            {homeTeam.name}
                        </span>
                                                    {match.status === "completed" && (
                                                        <>
                                                            {/* Winner Badge */}
                                                            {(match.home_sets_won ?? 0) > (match.away_sets_won ?? 0) && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="h-5 px-2 text-[10px] font-semibold uppercase tracking-wider border-0 bg-green-600/10 text-green-600"
                                                                >
                                                                    Winner
                                                                </Badge>
                                                            )}

                                                            {/* Forfeit Badge (Home Lost by Forfeit) */}
                                                            {match.is_forfeit &&
                                                                (match.home_sets_won ?? 0) < (match.away_sets_won ?? 0) && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="h-5 px-2 text-[10px] font-semibold uppercase tracking-wider border-0 bg-red-600/10 text-red-600"
                                                                    >
                                                                        Forfeited
                                                                    </Badge>
                                                                )}
                                                        </>
                                                    )}
                                                </div>
                                                {homeTeam.logo_url && (
                                                    <div className="relative w-12 h-12 shrink-0">
                                                        <Image
                                                            src={homeTeam.logo_url}
                                                            alt={homeTeam.name}
                                                            fill
                                                            sizes="48px"
                                                            className="object-contain"
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Center Section - VS or Final Score */}
                                    {match.status === 'completed' && match.home_sets_won !== null && match.away_sets_won !== null ? (
                                        <div className="flex items-center gap-3 px-3">
                                            <span className="text-2xl font-bold tabular-nums">{match.home_sets_won}</span>
                                            <span className="text-lg text-muted-foreground/50 font-medium">-</span>
                                            <span className="text-2xl font-bold tabular-nums">{match.away_sets_won}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center px-3">
                <span className="text-lg font-bold text-muted-foreground/50">
                    VS
                </span>
                                        </div>
                                    )}

                                    {/* Away Team */}
                                    <div className="flex justify-start items-center gap-3">
                                        {awayTeam && (
                                            <>
                                                {awayTeam.logo_url && (
                                                    <div className="relative w-12 h-12 shrink-0">
                                                        <Image
                                                            src={awayTeam.logo_url}
                                                            alt={awayTeam.name}
                                                            fill
                                                            sizes="48px"
                                                            className="object-contain"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex flex-col items-start gap-0.5 min-w-0">
                        <span className="font-semibold text-sm text-left truncate w-full">
                            {awayTeam.name}
                        </span>
                                                    {match.status === "completed" && (
                                                        <>
                                                            {/* Winner Badge */}
                                                            {(match.away_sets_won ?? 0) > (match.home_sets_won ?? 0) && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="h-5 px-2 text-[10px] font-semibold uppercase tracking-wider border-0 bg-green-600/10 text-green-600"
                                                                >
                                                                    Winner
                                                                </Badge>
                                                            )}

                                                            {/* Forfeit Badge (Home Lost by Forfeit) */}
                                                            {match.is_forfeit &&
                                                                (match.away_sets_won ?? 0) < (match.home_sets_won ?? 0) && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="h-5 px-2 text-[10px] font-semibold uppercase tracking-wider border-0 bg-red-600/10 text-red-600"
                                                                    >
                                                                        Forfeited
                                                                    </Badge>
                                                                )}
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Set Breakdown - Below teams */}
                                {match.status === 'completed' && sets.length > 0 && (
                                    <div className="flex items-center justify-center gap-1.5 py-2">
                                        {sets.map((set) => (
                                            <div
                                                key={set.set_number}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-muted/50 border border-border/50"
                                            >
                    <span className={`text-xs font-semibold tabular-nums ${
                        set.home_score > set.away_score ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                        {set.home_score}
                    </span>
                                                <span className="text-[10px] text-muted-foreground">-</span>
                                                <span className={`text-xs font-semibold tabular-nums ${
                                                    set.away_score > set.home_score ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                        {set.away_score}
                    </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* MVP Section - Only for Completed Matches */}
                                {match.status === 'completed' && (matchMvp || loserMvp) && (
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {matchMvp && (
                                            <div className="panel p-3">
                                                <div className="flex items-center gap-2.5">
                                                    {matchMvp.avatar_url && (
                                                        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                                                            <Image
                                                                src={matchMvp.avatar_url}
                                                                alt={matchMvp.username || "Player"}
                                                                fill
                                                                sizes="40px"
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0">
                            <span className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-0.5">
                                Match MVP
                            </span>
                                                        <span className="text-sm font-semibold truncate">
                                {matchMvp.display_name || matchMvp.username || "Unknown"}
                            </span>
                                                        {matchMvp.display_name && matchMvp.username && (
                                                            <span className="text-xs text-muted-foreground truncate">
                                    @{matchMvp.username}
                                </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {loserMvp && (
                                            <div className="panel p-3">
                                                <div className="flex items-center gap-2.5">
                                                    {loserMvp.avatar_url && (
                                                        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-muted-foreground/20 shrink-0">
                                                            <Image
                                                                src={loserMvp.avatar_url}
                                                                alt={loserMvp.username || "Player"}
                                                                fill
                                                                sizes="40px"
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                                Loser MVP
                            </span>
                                                        <span className="text-sm font-semibold truncate">
                                {loserMvp.display_name || loserMvp.username || "Unknown"}
                            </span>
                                                        {loserMvp.display_name && loserMvp.username && (
                                                            <span className="text-xs text-muted-foreground truncate">
                                    @{loserMvp.username}
                                </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {officialsLoading ? (
                                <div className="flex items-center justify-center gap-2 py-2 border-t border-border">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                    <span className="text-xs text-muted-foreground">Loading officials...</span>
                                </div>
                            ) : officials && (officials.referees.length > 0 || officials.media.length > 0) ? (
                                <div className="flex flex-col gap-2.5 pt-3 border-t border-border">
                                    {officials.referees.length > 0 && (
                                        <div className="flex items-start gap-3">
                                            <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold w-20 pt-1.5">
                                                Referees
                                            </span>
                                            <div className="flex gap-3 flex-wrap flex-1">
                                                {officials.referees.map((official) => (
                                                    <div key={official.id} className="flex items-center gap-2">
                                                        {official.avatar_url && (
                                                            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border">
                                                                <Image
                                                                    src={official.avatar_url}
                                                                    alt={official.username || "Official"}
                                                                    fill
                                                                    sizes="24px"
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">
                                                                {official.display_name || official.username || "Unknown"}
                                                            </span>
                                                            {official.display_name && official.username && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    @{official.username}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {officials.media.length > 0 && (
                                        <div className="flex items-start gap-4">
                                            <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold w-20 pt-1.5">
                                                Media
                                            </span>
                                            <div className="flex gap-4 flex-wrap flex-1">
                                                {officials.media.map((official) => (
                                                    <div key={official.id} className="flex items-center gap-2.5">
                                                        {official.avatar_url && (
                                                            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-border">
                                                                <Image
                                                                    src={official.avatar_url}
                                                                    alt={official.username || "Official"}
                                                                    fill
                                                                    sizes="28px"
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">
                                                                {official.display_name || official.username || "Unknown"}
                                                            </span>
                                                            {official.display_name && official.username && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    @{official.username}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}