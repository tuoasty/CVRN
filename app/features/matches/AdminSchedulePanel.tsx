"use client";

import React, { useEffect, useState } from "react";
import { useMatchesStore } from "@/app/stores/matchStore";
import { useTeamsStore } from "@/app/stores/teamStore";
import { usePlayerStore } from "@/app/stores/playerStore";
import { clientLogger } from "@/app/utils/clientLogger";
import Image from "next/image";
import { TeamWithRegion } from "@/server/dto/team.dto";
import { Player } from "@/shared/types/db";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import ManageMatchDialog from "@/app/features/matches/ManageMatchDialog";
import CompleteMatchDialog from "@/app/features/matches/CompleteMatchDialog";
import UpdateMatchDialog from "@/app/features/matches/UpdateMatchDialog";
import { Badge } from "@/app/components/ui/badge";
import { MatchWithDetails } from "@/server/dto/match.dto";
import { PlayoffRound } from "@/server/dto/playoff.dto";
import DeleteMatchDialog from "@/app/features/matches/DeleteMatchDialog";
import { AlertTriangle } from "lucide-react";

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

export default function AdminSchedulePanel({ seasonId, week, round, matchType, regionCode }: SchedulePanelProps) {
    const { fetchWeekSchedule, fetchPlayoffSchedule, weekScheduleCache, playoffScheduleCache, loading } = useMatchesStore();
    const { fetchTeamsByIds } = useTeamsStore();
    const { fetchPlayersByIds } = usePlayerStore();

    const [teams, setTeams] = useState<Map<string, TeamWithRegion>>(new Map());
    const [players, setPlayers] = useState<Map<string, Player>>(new Map());
    const [loaded, setLoaded] = useState(false);

    const schedule: MatchWithDetails[] = matchType === "season" && week !== undefined
        ? weekScheduleCache.get(`${seasonId}-${week}`)?.data ?? []
        : matchType === "playoff" && round
            ? playoffScheduleCache.get(`${seasonId}-${round}`)?.data ?? []
            : [];

    useEffect(() => {
        if (seasonId && ((matchType === "season" && week !== undefined) || (matchType === "playoff" && round))) {
            loadSchedule();
        }
    }, [seasonId, week, round, matchType]);

    const loadSchedule = async () => {
        setLoaded(false);

        try {
            if (matchType === "season" && week !== undefined) {
                await fetchWeekSchedule(seasonId, week);
                const cached = weekScheduleCache.get(`${seasonId}-${week}`);
                if (cached) {
                    processScheduleData(cached.data);
                }
            } else if (matchType === "playoff" && round) {
                await fetchPlayoffSchedule(seasonId, round);
                const cached = playoffScheduleCache.get(`${seasonId}-${round}`);
                if (cached) {
                    processScheduleData(cached.data);
                }
            }
        } catch (error) {
            clientLogger.error("SchedulePanel", "Error loading schedule", { error });
        } finally {
            setLoaded(true);
        }
    };

    const processScheduleData = async (data: MatchWithDetails[]) => {
        const teamIds = new Set<string>();
        const playerIds = new Set<string>();

        data.forEach(({ match }) => {
            if (match.home_team_id) teamIds.add(match.home_team_id);
            if (match.away_team_id) teamIds.add(match.away_team_id);
            if (match.match_mvp_player_id) playerIds.add(match.match_mvp_player_id);
            if (match.loser_mvp_player_id) playerIds.add(match.loser_mvp_player_id);
        });

        const [fetchedTeams, fetchedPlayers] = await Promise.all([
            fetchTeamsByIds(Array.from(teamIds)),
            playerIds.size > 0 ? fetchPlayersByIds(Array.from(playerIds)) : Promise.resolve([]),
        ]);

        setTeams(new Map(fetchedTeams.map(t => [t.id, t])));
        setPlayers(new Map(fetchedPlayers.map(p => [p.id, p])));
    };

    if (!seasonId) {
        return (
            <div className="text-sm text-gray-500">
                Select a season and {matchType === "season" ? "week" : "round"} to view schedule
            </div>
        );
    }

    if (loading || !loaded) {
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
        <div className="space-y-3">
            {schedule.map(({ match, sets, officials }, index) => {
                const homeTeam = match.home_team_id ? teams.get(match.home_team_id) : undefined;
                const awayTeam = match.away_team_id ? teams.get(match.away_team_id) : undefined;
                const matchMvp = match.match_mvp_player_id ? players.get(match.match_mvp_player_id) : null;
                const loserMvp = match.loser_mvp_player_id ? players.get(match.loser_mvp_player_id) : null;
                const statusConfig = getStatusConfig(match.status);
                const referees = officials.filter(o => o.official_type === "referee");
                const media = officials.filter(o => o.official_type === "media");

                return (
                    <div key={match.id} className="panel p-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                                <div className="flex items-center gap-2">
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Match {index + 1}
    </span>
                                    {match.is_forfeit ? (
                                        <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider bg-red-600/10 text-red-600 border-red-600/20">
                                            Forfeit
                                        </Badge>
                                    ) : (
                                        <Badge variant={statusConfig.variant} className={`rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider ${statusConfig.className || ''}`}>
                                            {statusConfig.label}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2">
                                        BO{match.best_of}
                                    </Badge>
                                    {match.match_type === "playoffs" && (
                                        <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2 bg-purple-600/10 text-purple-600 border-purple-600/20">
                                            Playoff
                                        </Badge>
                                    )}
                                    {match.status === 'scheduled' && (referees.length === 0 || media.length === 0) && (
                                        <span className="inline-flex" title="Missing required officials">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {regionTimezone
                                            ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                                            : match.scheduled_at
                                                ? new Date(match.scheduled_at).toLocaleString()
                                                : "Time TBD"
                                        }
                                    </span>
                                    <div className="flex gap-1">
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
                                                homeTeamId={match.home_team_id!}
                                                awayTeamId={match.away_team_id!}
                                                homeTeamName={homeTeam.name}
                                                awayTeamName={awayTeam.name}
                                                bestOf={match.best_of}
                                                onSuccess={loadSchedule}
                                            />
                                        )}
                                        {match.status === 'completed' && homeTeam && awayTeam && (
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
                                                onSuccess={loadSchedule}
                                            />
                                        )}
                                        {match.match_type === "season" && (
                                            <DeleteMatchDialog
                                                matchId={match.id}
                                                onSuccess={loadSchedule}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Team matchup - vertical stacking within each column */}
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 py-2">
                                {/* Home Team */}
                                <div className="flex flex-col items-end gap-1">
                                    {/* Empty space for symmetry */}
                                    <div className="min-h-[20px]"></div>

                                    {/* Team name and logo */}
                                    <div className="flex items-center gap-2 justify-end w-full">
            <span className={`font-semibold text-xs sm:text-sm text-right truncate ${(match.home_sets_won ?? 0) > (match.away_sets_won ?? 0) ? "text-foreground" : "text-muted-foreground"}`}>
                {homeTeam?.name || "TBD"}
            </span>
                                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                                            {homeTeam?.is_bye ? (
                                                <div className="w-full h-full rounded-sm bg-orange-600/10 border border-orange-600/20 flex items-center justify-center">
                                                    <span className="text-[10px] sm:text-xs text-orange-600 font-bold">BYE</span>
                                                </div>
                                            ) : homeTeam?.logo_url ? (
                                                <Image
                                                    src={homeTeam.logo_url}
                                                    alt={homeTeam.name}
                                                    fill
                                                    sizes="40px"
                                                    className="object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
                                                    <span className="text-xs text-muted-foreground font-bold">?</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* LVR below */}
                                    <div className="min-h-[20px] flex justify-end">
                                        {match.status === "completed" && match.home_team_lvr !== null && match.home_team_lvr !== undefined && (
                                            <Badge variant="outline" className={`h-4 px-1.5 text-[9px] font-semibold tabular-nums ${match.home_team_lvr >= 0 ? 'bg-green-600/10 text-green-600 border-green-600/20' : 'bg-red-600/10 text-red-600 border-red-600/20'}`}>
                                                {match.home_team_lvr >= 0 ? '+' : ''}{match.home_team_lvr.toFixed(1)} LVR
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Score/VS - Centered */}
                                {match.status === 'completed' && match.home_sets_won !== null && match.away_sets_won !== null ? (
                                    <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2">
                                        <span className={`text-lg sm:text-xl font-bold tabular-nums ${(match.home_sets_won ?? 0) > (match.away_sets_won ?? 0) ? "text-foreground" : "text-muted-foreground"}`}>{match.home_sets_won}</span>
                                        <span className="text-xs sm:text-sm text-muted-foreground/50 font-medium">-</span>
                                        <span className={`text-lg sm:text-xl font-bold tabular-nums ${(match.away_sets_won ?? 0) > (match.home_sets_won ?? 0) ? "text-foreground" : "text-muted-foreground"}`}>{match.away_sets_won}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center px-1 sm:px-2">
                                        <span className="text-sm sm:text-base font-bold text-muted-foreground/50">VS</span>
                                    </div>
                                )}

                                {/* Away Team */}
                                <div className="flex flex-col items-start gap-1">
                                    {/* Empty space for symmetry */}
                                    <div className="min-h-[20px]"></div>

                                    {/* Team name and logo */}
                                    <div className="flex items-center gap-2 justify-start w-full">
                                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                                            {awayTeam?.is_bye ? (
                                                <div className="w-full h-full rounded-sm bg-orange-600/10 border border-orange-600/20 flex items-center justify-center">
                                                    <span className="text-[10px] sm:text-xs text-orange-600 font-bold">BYE</span>
                                                </div>
                                            ) : awayTeam?.logo_url ? (
                                                <Image
                                                    src={awayTeam.logo_url}
                                                    alt={awayTeam.name}
                                                    fill
                                                    sizes="40px"
                                                    className="object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
                                                    <span className="text-xs text-muted-foreground font-bold">?</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`font-semibold text-xs sm:text-sm text-left truncate ${(match.away_sets_won ?? 0) > (match.home_sets_won ?? 0) ? "text-foreground" : "text-muted-foreground"}`}>
                {awayTeam?.name || "TBD"}
            </span>
                                    </div>

                                    {/* LVR below */}
                                    <div className="min-h-[20px] flex justify-start">
                                        {match.status === "completed" && match.away_team_lvr !== null && match.away_team_lvr !== undefined && (
                                            <Badge variant="outline" className={`h-4 px-1.5 text-[9px] font-semibold tabular-nums ${match.away_team_lvr >= 0 ? 'bg-green-600/10 text-green-600 border-green-600/20' : 'bg-red-600/10 text-red-600 border-red-600/20'}`}>
                                                {match.away_team_lvr >= 0 ? '+' : ''}{match.away_team_lvr.toFixed(1)} LVR
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {match.status === 'completed' && sets.length > 0 && (
                                <div className="flex items-center justify-center gap-1 py-1.5">
                                    {sets.map((set) => (
                                        <div key={set.set_number} className="flex items-center gap-0.5 px-2 py-0.5 rounded-sm bg-muted/50 border border-border/50">
                                            <span className={`text-xs font-semibold tabular-nums ${set.home_score > set.away_score ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {set.home_score}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">-</span>
                                            <span className={`text-xs font-semibold tabular-nums ${set.away_score > set.home_score ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {set.away_score}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {match.status === 'completed' && (matchMvp || loserMvp) && (
                                <div className="flex items-center gap-2 py-1.5 border-y border-border/50">
                                    {matchMvp && (
                                        <div className="flex items-center gap-2 flex-1">
                                            {matchMvp.avatar_url && (
                                                <div className="relative w-7 h-7 rounded-full overflow-hidden border border-primary/30 shrink-0">
                                                    <Image src={matchMvp.avatar_url} alt={matchMvp.username || "Player"} fill sizes="28px" className="object-cover" />
                                                </div>
                                            )}
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] uppercase tracking-wider text-primary font-semibold">Match MVP</span>
                                                <span className="text-xs font-semibold truncate">{matchMvp.display_name || matchMvp.username || "Unknown"}</span>
                                            </div>
                                        </div>
                                    )}
                                    {loserMvp && (
                                        <div className="flex items-center gap-2 flex-1 justify-end">
                                            <div className="flex flex-col items-end min-w-0">
                                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Loser MVP</span>
                                                <span className="text-xs font-semibold truncate">{loserMvp.display_name || loserMvp.username || "Unknown"}</span>
                                            </div>
                                            {loserMvp.avatar_url && (
                                                <div className="relative w-7 h-7 rounded-full overflow-hidden border border-border shrink-0">
                                                    <Image src={loserMvp.avatar_url} alt={loserMvp.username || "Player"} fill sizes="28px" className="object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(referees.length > 0 || media.length > 0) && (
                                <div className="flex items-center gap-4 pt-2 border-t border-border text-xs">
                                    {referees.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                                                Refs
                                            </span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {referees.map((official) => (
                                                    <div key={official.id} className="flex items-center gap-1">
                                                        {official.avatar_url && (
                                                            <div className="relative w-5 h-5 rounded-full overflow-hidden border border-border">
                                                                <Image src={official.avatar_url} alt={official.username || "Official"} fill sizes="20px" className="object-cover" />
                                                            </div>
                                                        )}
                                                        <span className="text-xs">{official.display_name || official.username || "Unknown"}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {media.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                                                Media
                                            </span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {media.map((official) => (
                                                    <div key={official.id} className="flex items-center gap-1">
                                                        {official.avatar_url && (
                                                            <div className="relative w-5 h-5 rounded-full overflow-hidden border border-border">
                                                                <Image src={official.avatar_url} alt={official.username || "Official"} fill sizes="20px" className="object-cover" />
                                                            </div>
                                                        )}
                                                        <span className="text-xs">{official.display_name || official.username || "Unknown"}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}