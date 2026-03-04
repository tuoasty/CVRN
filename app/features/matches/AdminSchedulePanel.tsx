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
                    <div key={match.id} className="panel p-5">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-4 border-b border-border">
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
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <div className="flex justify-end items-center gap-3 pr-4">
                                    {homeTeam && (
                                        <>
                                            <span className="font-semibold text-right">
                                              {homeTeam.name}
                                            </span>
                                            {homeTeam.logo_url && (
                                                <div className="relative w-12 h-12">
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

                                <div className="text-center">
                                    <span className="text-2xl font-bold text-muted-foreground">
                                      VS
                                    </span>
                                </div>

                                <div className="flex justify-start items-center gap-3 pl-4">
                                    {awayTeam && (
                                        <>
                                            {awayTeam.logo_url && (
                                                <div className="relative w-12 h-12">
                                                    <Image
                                                        src={awayTeam.logo_url}
                                                        alt={awayTeam.name}
                                                        fill
                                                        sizes="48px"
                                                        className="object-contain"
                                                    />
                                                </div>
                                            )}
                                            <span className="font-semibold text-left">
                                              {awayTeam.name}
                                            </span>
                                        </>
                                    )}
                                </div>

                                {match.status === 'completed' && match.home_sets_won !== null && match.away_sets_won !== null && (
                                    <div className="col-span-3 space-y-4 pt-4 border-t border-border">
                                        <div className="panel bg-muted/30 p-4">
                                            <div className="grid grid-cols-3 gap-4 items-center">
                                                <div className="flex items-center gap-3 justify-end">
                                                    {homeTeam?.logo_url && (
                                                        <div className="relative w-10 h-10">
                                                            <Image
                                                                src={homeTeam.logo_url}
                                                                alt={homeTeam.name}
                                                                fill
                                                                sizes="40px"
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-semibold">{homeTeam?.name}</span>
                                                        {(match.home_sets_won ?? 0) > (match.away_sets_won ?? 0) && (
                                                            <span className="text-xs text-green-600 font-medium">WINNER</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-center gap-3">
                                                    <span className="text-3xl font-bold tabular-nums">{match.home_sets_won}</span>
                                                    <span className="text-lg text-muted-foreground">-</span>
                                                    <span className="text-3xl font-bold tabular-nums">{match.away_sets_won}</span>
                                                </div>

                                                <div className="flex items-center gap-3 justify-start">
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-sm font-semibold">{awayTeam?.name}</span>
                                                        {(match.away_sets_won ?? 0) > (match.home_sets_won ?? 0) && (
                                                            <span className="text-xs text-green-600 font-medium">WINNER</span>
                                                        )}
                                                    </div>
                                                    {awayTeam?.logo_url && (
                                                        <div className="relative w-10 h-10">
                                                            <Image
                                                                src={awayTeam.logo_url}
                                                                alt={awayTeam.name}
                                                                fill
                                                                sizes="40px"
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {sets.length > 0 && (
                                                <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border/50">
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Sets:</span>
                                                    <div className="flex gap-2">
                                                        {sets.map((set) => (
                                                            <div
                                                                key={set.set_number}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-sm bg-muted/50"
                                                            >
                                                                <span className={`text-xs font-semibold tabular-nums ${
                                                                    set.home_score > set.away_score ? 'text-foreground' : 'text-muted-foreground'
                                                                }`}>
                                                                    {set.home_score}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                                <span className={`text-xs font-semibold tabular-nums ${
                                                                    set.away_score > set.home_score ? 'text-foreground' : 'text-muted-foreground'
                                                                }`}>
                                                                    {set.away_score}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {(matchMvp || loserMvp) && (
                                            <div className="grid grid-cols-2 gap-3">
                                                {matchMvp && (
                                                    <div className="panel p-3">
                                                        <div className="flex items-center gap-3">
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
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">MATCH MVP</span>
                                                                </div>
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
                                                        <div className="flex items-center gap-3">
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
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">LOSER MVP</span>
                                                                </div>
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
                                )}
                            </div>

                            {officialsLoading ? (
                                <div className="flex items-center justify-center gap-2 py-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                    <span className="text-xs text-muted-foreground">Loading officials...</span>
                                </div>
                            ) : officials && (officials.referees.length > 0 || officials.media.length > 0) ? (
                                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                                    {officials.referees.length > 0 && (
                                        <div className="flex items-start gap-3">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide w-20 pt-1">
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
                                                        <span className="text-xs font-medium">
                                                            {official.display_name || official.username || "Unknown"}
                                                        </span>
                                                            {official.display_name && official.username && (
                                                                <span className="text-[10px] text-muted-foreground">
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
                                        <div className="flex items-start gap-3">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wide w-20 pt-1">
                                            Medias
                                        </span>
                                            <div className="flex gap-3 flex-wrap flex-1">
                                                {officials.media.map((official) => (
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
                                                        <span className="text-xs font-medium">
                                                            {official.display_name || official.username || "Unknown"}
                                                        </span>
                                                            {official.display_name && official.username && (
                                                                <span className="text-[10px] text-muted-foreground">
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