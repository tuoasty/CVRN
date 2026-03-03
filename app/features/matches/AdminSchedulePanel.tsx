"use client";

import React, {useEffect, useState} from "react";
import {useMatchesStore} from "@/app/stores/matchStore";
import {useTeamsStore} from "@/app/stores/teamStore";
import {clientLogger} from "@/app/utils/clientLogger";
import Image from "next/image";
import {TeamWithRegion} from "@/server/dto/team.dto";
import {Button} from "@/app/components/ui/button";
import {Input} from "@/app/components/ui/input";
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
import {getRegionTimezone, formatDateInTimezone, timezoneOptions} from "@/app/utils/timezoneOptions";
import MatchOfficialSection from "@/app/features/officials/MatchOfficialSection";
import {useOfficialStore} from "@/app/stores/officialStore";

interface SchedulePanelProps {
    seasonId: string;
    week: number;
    regionCode?: string;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'pending':
            return {label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-200'};
        case 'scheduled':
            return {label: 'Scheduled', color: 'bg-blue-100 text-blue-800 border-blue-200'};
        case 'completed':
            return {label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200'};
        default:
            return {label: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200'};
    }
};

export default function AdminSchedulePanel({seasonId, week, regionCode}: SchedulePanelProps) {
    const {fetchMatchesForWeek, matchesForWeekCache, loading} = useMatchesStore();
    const {fetchMatchOfficials, matchOfficialsCache} = useOfficialStore();
    const {fetchTeamsByIds} = useTeamsStore();

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

    const [editingMatch, setEditingMatch] = useState<string | null>(null);
    const [editSchedule, setEditSchedule] = useState<{
        date: string;
        time: string;
        timezone: string;
    } | null>(null);

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
                cached.data.forEach(match => {
                    teamIds.add(match.home_team_id);
                    teamIds.add(match.away_team_id);
                });

                const fetchedTeams = await fetchTeamsByIds(Array.from(teamIds));

                if (abortController.signal.aborted) {
                    clientLogger.info("SchedulePanel", "Request aborted after teams fetch", {seasonId, week});
                    return;
                }

                const teamsMap = new Map(fetchedTeams.map(t => [t.id, t]));
                setTeams(teamsMap);
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

                if (abortController.signal.aborted) {
                    clientLogger.info("SchedulePanel", "Request aborted before setting officials", {seasonId, week});
                    return;
                }

                const officialsMap = new Map(
                    officialsResults.map(result => [result.matchId, {referees: result.referees, media: result.media}])
                );

                setMatchOfficials(officialsMap);
                setOfficialsLoading(false);

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

    const handleUpdateSchedule = async (matchId: string) => {
        if (!editSchedule?.date || !editSchedule?.time || !editSchedule?.timezone) {
            alert("Please fill in all schedule fields");
            return;
        }

        const {updateMatchSchedule} = useMatchesStore.getState();

        clientLogger.info("SchedulePanel", "Updating match schedule", {matchId});

        const success = await updateMatchSchedule({
            matchId,
            scheduledDate: editSchedule.date,
            scheduledTime: editSchedule.time,
            timezone: editSchedule.timezone,
        });

        if (success) {
            clientLogger.info("SchedulePanel", "Schedule updated successfully", {matchId});
            setEditingMatch(null);
            setEditSchedule(null);
            await loadSchedule();
        } else {
            alert("Failed to update schedule");
        }
    };

    const handleClearSchedule = async (matchId: string) => {
        const {updateMatchSchedule} = useMatchesStore.getState();

        clientLogger.info("SchedulePanel", "Clearing match schedule", {matchId});

        const success = await updateMatchSchedule({
            matchId,
            scheduledDate: null,
            scheduledTime: null,
            timezone: null,
        });

        if (success) {
            clientLogger.info("SchedulePanel", "Schedule cleared successfully", {matchId});
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

    if (loading || !teamsLoaded) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
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
                const officials = matchOfficials.get(match.id);

                return (
                    <div key={match.id} className="border p-6 rounded-lg">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            Match {index + 1}
                                        </span>
                                                                            <span
                                                                                className={`text-xs font-medium px-2 py-1 rounded-md border ${getStatusConfig(match.status).color}`}>
                                            {getStatusConfig(match.status).label}
                                        </span>
                                                                            {match.status === 'scheduled' && officials && (officials.referees.length === 0 || officials.media.length === 0) && (
                                                                                <span className="text-amber-600" title="Missing required officials">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                                                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path
                                                        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                                </svg>
                                            </span>
                                        )}
                                    </div>

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

                                {officialsLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                                        <span className="text-xs text-muted-foreground">Loading officials...</span>
                                    </div>
                                ) : officials && (officials.referees.length > 0 || officials.media.length > 0) ? (
                                    <div className="flex flex-col gap-2">
                                        {officials.referees.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground w-16">Referees:</span>
                                                <div className="flex gap-2 flex-wrap">
                                                    {officials.referees.map((official) => (
                                                        <div
                                                            key={official.id}
                                                            className="flex items-center gap-1.5"
                                                        >
                                                            {official.avatar_url && (
                                                                <div
                                                                    className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                                                                    <Image
                                                                        src={official.avatar_url}
                                                                        alt={official.username || "Official"}
                                                                        fill
                                                                        sizes="20px"
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
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground w-16">Media:</span>
                                                <div className="flex gap-2 flex-wrap">
                                                    {officials.media.map((official) => (
                                                        <div
                                                            key={official.id}
                                                            className="flex items-center gap-1.5"
                                                        >
                                                            {official.avatar_url && (
                                                                <div
                                                                    className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                                                                    <Image
                                                                        src={official.avatar_url}
                                                                        alt={official.username || "Official"}
                                                                        fill
                                                                        sizes="20px"
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                            <span className="text-xs">
                                                            {official.display_name || official.username || "Unknown"}
                                                        </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                <div className="flex items-center gap-3">
                                    {officialsLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                                        </div>
                                    ) : (
                                        <>
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
                                                            <label
                                                                className="block text-sm font-medium mb-2">Timezone</label>
                                                            <Select
                                                                value={editSchedule?.timezone || "Asia/Singapore"}
                                                                onValueChange={v => setEditSchedule(prev => ({
                                                                    date: prev?.date || "",
                                                                    time: prev?.time || "",
                                                                    timezone: v
                                                                }))}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select timezone"/>
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
                                                            <label
                                                                className="block text-sm font-medium mb-2">Date</label>
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
                                                            <label
                                                                className="block text-sm font-medium mb-2">Time</label>
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
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}