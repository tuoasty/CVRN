"use client";

import React, { useEffect, useState } from "react";
import { useMatchesStore } from "@/app/stores/matchStore";
import { useTeamsStore } from "@/app/stores/teamStore";
import { clientLogger } from "@/app/utils/clientLogger";
import Image from "next/image";
import { TeamWithRegion } from "@/server/dto/team.dto";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";
import { getRegionTimezone, formatDateInTimezone, timezoneOptions } from "@/app/utils/timezoneOptions";
import MatchOfficialSection from "@/app/features/officials/MatchOfficialSection";
import {useOfficialStore} from "@/app/stores/officialStore";

interface SchedulePanelProps {
    seasonId: string;
    week: number;
    regionCode?: string;
}

export default function AdminSchedulePanel({ seasonId, week, regionCode }: SchedulePanelProps) {
    const { fetchMatchesForWeek, matchesForWeekCache, loading } = useMatchesStore();
    const { fetchMatchOfficials, matchOfficialsCache } = useOfficialStore();
    const { fetchTeamsByIds } = useTeamsStore();

    const [teams, setTeams] = useState<Map<string, TeamWithRegion>>(new Map());
    const [matchOfficials, setMatchOfficials] = useState<Map<string, {
        referees: Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }>;
        media: Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }>;
    }>>(new Map());

    const [editingMatch, setEditingMatch] = useState<string | null>(null);
    const [editSchedule, setEditSchedule] = useState<{
        date: string;
        time: string;
        timezone: string;
    } | null>(null);

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

            const officialsMap = new Map<string, {
                referees: Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }>;
                media: Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }>;
            }>();

            for (const match of cached.data) {
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
                    officialsMap.set(match.id, { referees, media });
                }
            }

            setMatchOfficials(officialsMap);

            clientLogger.info("SchedulePanel", "Schedule loaded", {
                matchCount: cached.data.length,
                teamCount: fetchedTeams.length
            });
        }
    };

    const handleUpdateSchedule = async (matchId: string) => {
        if (!editSchedule?.date || !editSchedule?.time || !editSchedule?.timezone) {
            alert("Please fill in all schedule fields");
            return;
        }

        const { updateMatchSchedule } = useMatchesStore.getState();

        clientLogger.info("SchedulePanel", "Updating match schedule", { matchId });

        const success = await updateMatchSchedule({
            matchId,
            scheduledDate: editSchedule.date,
            scheduledTime: editSchedule.time,
            timezone: editSchedule.timezone,
        });

        if (success) {
            clientLogger.info("SchedulePanel", "Schedule updated successfully", { matchId });
            setEditingMatch(null);
            setEditSchedule(null);
            await loadSchedule();
        } else {
            alert("Failed to update schedule");
        }
    };

    const handleClearSchedule = async (matchId: string) => {
        const { updateMatchSchedule } = useMatchesStore.getState();

        clientLogger.info("SchedulePanel", "Clearing match schedule", { matchId });

        const success = await updateMatchSchedule({
            matchId,
            scheduledDate: null,
            scheduledTime: null,
            timezone: null,
        });

        if (success) {
            clientLogger.info("SchedulePanel", "Schedule cleared successfully", { matchId });
            await loadSchedule();
        } else {
            alert("Failed to clear schedule");
        }
    };

    const openEditDialog = (matchId: string, scheduledAt: string | null) => {
        setEditingMatch(matchId);

        if (scheduledAt) {
            const tz = regionCode ? getRegionTimezone(regionCode) : "Asia/Singapore";
            const date = new Date(scheduledAt);

            const localDateString = date.toLocaleString('en-US', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const parts = localDateString.match(/(\d{2})\/(\d{2})\/(\d{4}),\s(\d{2}):(\d{2})/);

            if (parts) {
                const [, month, day, year, hours, minutes] = parts;

                setEditSchedule({
                    date: `${year}-${month}-${day}`,
                    time: `${hours}:${minutes}`,
                    timezone: tz
                });
            } else {
                setEditSchedule({
                    date: "",
                    time: "",
                    timezone: tz
                });
            }
        } else {
            setEditSchedule({
                date: "",
                time: "",
                timezone: regionCode ? getRegionTimezone(regionCode) : ""
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

    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

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

                            {matchOfficials.get(match.id) && (
                                <div className="space-y-1">
                                    {matchOfficials.get(match.id)!.referees.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground w-16">Referees:</span>
                                            <div className="flex gap-1">
                                                {matchOfficials.get(match.id)!.referees.map((official) => (
                                                    <div
                                                        key={official.id}
                                                        className="relative w-6 h-6 rounded-full overflow-hidden"
                                                        title={official.display_name || official.username || ""}
                                                    >
                                                        {official.avatar_url && (
                                                            <Image
                                                                src={official.avatar_url}
                                                                alt={official.username || "Official"}
                                                                fill
                                                                sizes="24px"
                                                                className="object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {matchOfficials.get(match.id)!.media.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground w-16">Media:</span>
                                            <div className="flex gap-1">
                                                {matchOfficials.get(match.id)!.media.map((official) => (
                                                    <div
                                                        key={official.id}
                                                        className="relative w-6 h-6 rounded-full overflow-hidden"
                                                        title={official.display_name || official.username || ""}
                                                    >
                                                        {official.avatar_url && (
                                                            <Image
                                                                src={official.avatar_url}
                                                                alt={official.username || "Official"}
                                                                fill
                                                                sizes="24px"
                                                                className="object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <div className="text-sm text-muted-foreground">
                                    {regionTimezone
                                        ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                                        : match.scheduled_at
                                            ? new Date(match.scheduled_at).toLocaleString()
                                            : "Time TBD"
                                    }
                                </div>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditDialog(match.id, match.scheduled_at)}
                                        >
                                            Manage
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Manage Match</DialogTitle>
                                        </DialogHeader>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Timezone</label>
                                                <Select
                                                    value={editSchedule?.timezone || "Asia/Singapore"}
                                                    onValueChange={v => setEditSchedule(prev => ({
                                                        date: prev?.date || "",
                                                        time: prev?.time || "",
                                                        timezone: v
                                                    }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select timezone" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {timezoneOptions.map(tz => (
                                                            <SelectItem key={tz.value} value={tz.value}>
                                                                {tz.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Date</label>
                                                <Input
                                                    type="date"
                                                    value={editSchedule?.date || ""}
                                                    onChange={e => setEditSchedule(prev => ({
                                                        date: e.target.value,
                                                        time: prev?.time || "",
                                                        timezone: prev?.timezone || ""
                                                    }))}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-2">Time</label>
                                                <Input
                                                    type="time"
                                                    value={editSchedule?.time || ""}
                                                    onChange={e => setEditSchedule(prev => ({
                                                        date: prev?.date || "",
                                                        time: e.target.value,
                                                        timezone: prev?.timezone || ""
                                                    }))}
                                                />
                                            </div>

                                            <div className="border-t pt-4 mt-4">
                                                <h3 className="text-sm font-semibold mb-4">Officials</h3>
                                                <div className="space-y-4">
                                                    <MatchOfficialSection
                                                        matchId={match.id}
                                                        officialType="referee"
                                                        title="Referees"
                                                    />
                                                    <MatchOfficialSection
                                                        matchId={match.id}
                                                        officialType="media"
                                                        title="Media"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => editingMatch && handleUpdateSchedule(editingMatch)}
                                                    disabled={!editSchedule?.date || !editSchedule?.time || !editSchedule?.timezone}
                                                    className="flex-1"
                                                >
                                                    Update Schedule
                                                </Button>

                                                {match.scheduled_at && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleClearSchedule(match.id)}
                                                    >
                                                        Clear
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}