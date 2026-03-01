"use client";

import React, { useEffect, useState } from "react";
import { useMatchesStore } from "@/app/stores/matchStore";
import { useTeamsStore } from "@/app/stores/teamStore";
import { clientLogger } from "@/app/utils/clientLogger";
import Image from "next/image";
import { TeamWithRegion } from "@/server/dto/team.dto";

interface SchedulePanelProps {
    seasonId: string;
    week: number;
}

export default function SchedulePanel({ seasonId, week }: SchedulePanelProps) {
    const { fetchMatchesForWeek, matchesForWeekCache, loading } = useMatchesStore();
    const { fetchTeamsByIds } = useTeamsStore();

    const [teams, setTeams] = useState<Map<string, TeamWithRegion>>(new Map());

    useEffect(() => {
        if (seasonId) {
            loadSchedule();
        }
    }, [seasonId, week]);

    const loadSchedule = async () => {
        await fetchMatchesForWeek(seasonId, week);

        const cacheKey = `${seasonId}-${week}`;
        const cached = matchesForWeekCache.get(cacheKey);

        if (cached) {
            const teamIds = new Set<string>();
            cached.data.forEach(match => {
                teamIds.add(match.home_team_id);
                teamIds.add(match.away_team_id);
            });

            const fetchedTeams = await fetchTeamsByIds(Array.from(teamIds));
            const teamsMap = new Map(fetchedTeams.map(t => [t.id, t]));
            setTeams(teamsMap);

            clientLogger.info("SchedulePanel", "Schedule loaded", {
                matchCount: cached.data.length,
                teamCount: fetchedTeams.length
            });
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

    if (loading) {
        return <div className="text-sm text-gray-500">Loading schedule...</div>;
    }

    if (matches.length === 0) {
        return (
            <div className="text-sm text-gray-500">
                No matches scheduled for this week
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Current Schedule</h2>

            {matches.map((match, index) => {
                const homeTeam = teams.get(match.home_team_id);
                const awayTeam = teams.get(match.away_team_id);

                return (
                    <div key={match.id} className="border p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Match {index + 1}
                                </span>

                                <div className="flex items-center gap-3">
                                    {homeTeam && (
                                        <div className="flex items-center gap-2">
                                            {homeTeam.logo_url && (
                                                <div className="relative w-8 h-8">
                                                    <Image
                                                        src={homeTeam.logo_url}
                                                        alt={homeTeam.name}
                                                        fill
                                                        sizes="32px"
                                                        className="object-contain"
                                                    />
                                                </div>
                                            )}
                                            <span className="font-medium">{homeTeam.name}</span>
                                        </div>
                                    )}

                                    <span className="text-muted-foreground">vs</span>

                                    {awayTeam && (
                                        <div className="flex items-center gap-2">
                                            {awayTeam.logo_url && (
                                                <div className="relative w-8 h-8">
                                                    <Image
                                                        src={awayTeam.logo_url}
                                                        alt={awayTeam.name}
                                                        fill
                                                        sizes="32px"
                                                        className="object-contain"
                                                    />
                                                </div>
                                            )}
                                            <span className="font-medium">{awayTeam.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                {match.scheduled_at
                                    ? new Date(match.scheduled_at).toLocaleString()
                                    : "Time TBD"
                                }
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}