"use client";

import React, { useState, useEffect } from "react";
import { useMatchesStore } from "@/app/stores/matchStore";
import { createMatchesAction } from "@/app/actions/match.actions";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import { Team } from "@/shared/types/db";
import { clientLogger } from "@/app/utils/clientLogger";
import Image from "next/image";
import { Input } from "@/app/components/ui/input";
import { timezoneOptions } from "@/app/utils/timezoneOptions";
import { X } from "lucide-react";

interface MatchPair {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    schedule?: {
        date: string;
        time: string;
        timezone: string;
    }
}

interface CreateMatchesPanelProps {
    seasonId: string;
    week: number;
    onSuccess?: () => void;
}

export default function CreateMatchesPanel({ seasonId, week, onSuccess }: CreateMatchesPanelProps) {
    const { fetchAvailableTeams, availableTeamsCache, fetchMatchesForWeek, matchesForWeekCache, loading } = useMatchesStore();

    const [matchPairs, setMatchPairs] = useState<MatchPair[]>([]);
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [defaultSchedule, setDefaultSchedule] = useState<{
        date: string;
        time: string;
        timezone: string;
    }>({
        date: "",
        time: "",
        timezone: "Asia/Singapore"
    });

    useEffect(() => {
        if (seasonId) {
            loadAvailableTeams();
            setMatchPairs([]);
        }
    }, [seasonId, week]);

    const loadAvailableTeams = async () => {
        if (!seasonId) return;

        await fetchAvailableTeams(seasonId, week);
        const cacheKey = `${seasonId}-${week}`;
        const cached = availableTeamsCache.get(cacheKey);

        if (cached) {
            const usedTeamIds = new Set(
                matchPairs.flatMap(m => [m.homeTeamId, m.awayTeamId]).filter(Boolean)
            );
            const filtered = cached.data.filter(t => !usedTeamIds.has(t.id));
            setAvailableTeams(filtered);
            clientLogger.info("CreateMatchesPanel", "Available teams loaded", { count: filtered.length });
        }
    };

    const addMatchPair = () => {
        setMatchPairs([
            ...matchPairs,
            { id: crypto.randomUUID(), homeTeamId: "", awayTeamId: "" }
        ]);
    };

    const updateMatchPair = (id: string, field: "homeTeamId" | "awayTeamId", value: string) => {
        setMatchPairs(prev =>
            prev.map(m => (m.id === id ? { ...m, [field]: value } : m))
        );

        setTimeout(() => {
            const cacheKey = `${seasonId}-${week}`;
            const cached = availableTeamsCache.get(cacheKey);

            if (cached) {
                const updatedPairs = matchPairs.map(m =>
                    m.id === id ? { ...m, [field]: value } : m
                );

                const usedTeamIds = new Set(
                    updatedPairs.flatMap(m => [m.homeTeamId, m.awayTeamId]).filter(Boolean)
                );

                const filtered = cached.data.filter(t => !usedTeamIds.has(t.id));
                setAvailableTeams(filtered);
            }
        }, 0);
    };

    const removeMatchPair = (id: string) => {
        setMatchPairs(prev => {
            const updated = prev.filter(m => m.id !== id);

            setTimeout(() => {
                const cacheKey = `${seasonId}-${week}`;
                const cached = availableTeamsCache.get(cacheKey);

                if (cached) {
                    const usedTeamIds = new Set(
                        updated.flatMap(m => [m.homeTeamId, m.awayTeamId]).filter(Boolean)
                    );

                    const filtered = cached.data.filter(t => !usedTeamIds.has(t.id));
                    setAvailableTeams(filtered);
                    clientLogger.info("CreateMatchesPanel", "Available teams reloaded after removal", {
                        count: filtered.length,
                        removedPairId: id
                    });
                }
            }, 0);

            return updated;
        });
    };

    const handleSubmit = async () => {
        const validPairs = matchPairs.filter(m => m.homeTeamId && m.awayTeamId);

        if (validPairs.length === 0) {
            clientLogger.warn("CreateMatchesPanel", "No valid match pairs");
            return;
        }

        setSubmitting(true);

        try {
            const result = await createMatchesAction({
                seasonId,
                week,
                defaultScheduledDate: defaultSchedule?.date,
                defaultScheduledTime: defaultSchedule?.time,
                defaultTimezone: defaultSchedule?.timezone,
                matches: validPairs.map(m => ({
                    homeId: m.homeTeamId,
                    awayId: m.awayTeamId,
                    scheduledDate: m.schedule?.date,
                    scheduledTime: m.schedule?.time,
                    timezone: m.schedule?.timezone,
                }))
            });

            if (!result.ok) {
                clientLogger.error("CreateMatchesPanel", "Failed to create matches", result.error);
                alert(`Error: ${result.error.message}`);
                return;
            }

            clientLogger.info("CreateMatchesPanel", "Matches created successfully", { count: result.value.length });

            setMatchPairs([]);
            setDefaultSchedule({
                date: "",
                time: "",
                timezone: "Asia/Singapore"
            });

            const cacheKey = `${seasonId}-${week}`;
            availableTeamsCache.delete(cacheKey);
            matchesForWeekCache.delete(cacheKey);

            await fetchAvailableTeams(seasonId, week);
            await fetchMatchesForWeek(seasonId, week);

            const cached = availableTeamsCache.get(cacheKey);
            if (cached) {
                setAvailableTeams(cached.data);
            }

            alert(`${result.value.length} matches created successfully`);

            if (onSuccess) {
                setTimeout(() => {
                    onSuccess();
                }, 500);
            }

        } catch (error) {
            clientLogger.error("CreateMatchesPanel", "Exception creating matches", { error });
            alert("Failed to create matches");
        } finally {
            setSubmitting(false);
        }
    };

    const updateMatchSchedule = (id: string, field: "date" | "time" | "timezone", value: string) => {
        setMatchPairs(prev =>
            prev.map(m => {
                if (m.id === id) {
                    return {
                        ...m,
                        schedule: {
                            date: field === "date" ? value : m.schedule?.date || "",
                            time: field === "time" ? value : m.schedule?.time || "",
                            timezone: field === "timezone" ? value : m.schedule?.timezone || "Asia/Singapore",
                        }
                    };
                }
                return m;
            })
        );
    };

    const clearMatchSchedule = (id: string) => {
        setMatchPairs(prev =>
            prev.map(m => m.id === id ? { ...m, schedule: undefined } : m)
        );
    };

    const canAddMore = availableTeams.length >= 2;

    return (
        <div className="space-y-6">
            <div className="panel p-5">
                <div className="space-y-4">
                    <div>
                        <h3>Default Schedule</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Set a default date and time for all matches in this week (optional)
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="default-timezone">Timezone</Label>
                            <Select
                                value={defaultSchedule?.timezone || "Asia/Singapore"}
                                onValueChange={v => setDefaultSchedule(prev => ({
                                    date: prev?.date || "",
                                    time: prev?.time || "",
                                    timezone: v
                                }))}
                            >
                                <SelectTrigger id="default-timezone" className="rounded-sm">
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
                        <div className="space-y-2">
                            <Label htmlFor="default-date">Date</Label>
                            <Input
                                id="default-date"
                                type="date"
                                value={defaultSchedule?.date || ""}
                                onChange={e => setDefaultSchedule(prev => ({
                                    date: e.target.value,
                                    time: prev?.time || "",
                                    timezone: prev?.timezone || "Asia/Singapore"
                                }))}
                                className="rounded-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="default-time">Time</Label>
                            <Input
                                id="default-time"
                                type="time"
                                value={defaultSchedule?.time || ""}
                                onChange={e => setDefaultSchedule(prev => ({
                                    date: prev?.date || "",
                                    time: e.target.value,
                                    timezone: prev?.timezone || "Asia/Singapore"
                                }))}
                                className="rounded-sm"
                            />
                        </div>
                    </div>

                    {defaultSchedule.date && defaultSchedule.time && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDefaultSchedule({
                                date: "",
                                time: "",
                                timezone: "Asia/Singapore"
                            })}
                            className="rounded-sm"
                        >
                            Clear Default Schedule
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3>Match Pairs</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {matchPairs.length} {matchPairs.length === 1 ? 'match' : 'matches'} configured
                        </p>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || matchPairs.length === 0 || matchPairs.some(m => !m.homeTeamId || !m.awayTeamId)}
                        className="rounded-sm"
                    >
                        {submitting ? "Creating..." : `Create ${matchPairs.filter(m => m.homeTeamId && m.awayTeamId).length} Matches`}
                    </Button>
                </div>

                {!canAddMore && matchPairs.length === 0 && (
                    <div className="panel p-6">
                        <p className="text-muted-foreground text-center">
                            Not enough teams available for this week (need at least 2)
                        </p>
                    </div>
                )}

                {matchPairs.map((pair, index) => (
                    <div key={pair.id} className="panel p-5">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-semibold">Match {index + 1}</h4>
                                    {pair.homeTeamId && pair.awayTeamId && (() => {
                                        const cacheKey = `${seasonId}-${week}`;
                                        const cached = availableTeamsCache.get(cacheKey);
                                        const homeTeam = cached?.data.find(t => t.id === pair.homeTeamId);
                                        const awayTeam = cached?.data.find(t => t.id === pair.awayTeamId);

                                        return (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                {homeTeam?.logo_url && (
                                                    <div className="relative w-5 h-5">
                                                        <Image
                                                            src={homeTeam.logo_url}
                                                            alt={homeTeam.name}
                                                            fill
                                                            sizes="20px"
                                                            className="object-contain"
                                                        />
                                                    </div>
                                                )}
                                                <span className="font-medium">{homeTeam?.name}</span>
                                                <span>vs</span>
                                                <span className="font-medium">{awayTeam?.name}</span>
                                                {awayTeam?.logo_url && (
                                                    <div className="relative w-5 h-5">
                                                        <Image
                                                            src={awayTeam.logo_url}
                                                            alt={awayTeam.name}
                                                            fill
                                                            sizes="20px"
                                                            className="object-contain"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMatchPair(pair.id)}
                                    className="rounded-sm"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Home Team</Label>
                                    <Select
                                        value={pair.homeTeamId}
                                        onValueChange={v => updateMatchPair(pair.id, "homeTeamId", v)}
                                    >
                                        <SelectTrigger className="rounded-sm">
                                            <SelectValue placeholder="Select home team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pair.homeTeamId && !availableTeams.find(t => t.id === pair.homeTeamId) && (
                                                (() => {
                                                    const cacheKey = `${seasonId}-${week}`;
                                                    const cached = availableTeamsCache.get(cacheKey);
                                                    const selectedTeam = cached?.data.find(t => t.id === pair.homeTeamId);
                                                    return selectedTeam ? (
                                                        <SelectItem key={selectedTeam.id} value={selectedTeam.id}>
                                                            <div className="flex items-center gap-2">
                                                                {selectedTeam.logo_url && (
                                                                    <div className="relative w-4 h-4">
                                                                        <Image
                                                                            src={selectedTeam.logo_url}
                                                                            alt={selectedTeam.name}
                                                                            fill
                                                                            sizes="16px"
                                                                            className="object-contain"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <span>{selectedTeam.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ) : null;
                                                })()
                                            )}
                                            {availableTeams
                                                .filter(t => t.id !== pair.awayTeamId)
                                                .map(t => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        <div className="flex items-center gap-2">
                                                            {t.logo_url && (
                                                                <div className="relative w-4 h-4">
                                                                    <Image
                                                                        src={t.logo_url}
                                                                        alt={t.name}
                                                                        fill
                                                                        sizes="16px"
                                                                        className="object-contain"
                                                                    />
                                                                </div>
                                                            )}
                                                            <span>{t.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Away Team</Label>
                                    <Select
                                        value={pair.awayTeamId}
                                        onValueChange={v => updateMatchPair(pair.id, "awayTeamId", v)}
                                    >
                                        <SelectTrigger className="rounded-sm">
                                            <SelectValue placeholder="Select away team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pair.awayTeamId && !availableTeams.find(t => t.id === pair.awayTeamId) && (
                                                (() => {
                                                    const cacheKey = `${seasonId}-${week}`;
                                                    const cached = availableTeamsCache.get(cacheKey);
                                                    const selectedTeam = cached?.data.find(t => t.id === pair.awayTeamId);
                                                    return selectedTeam ? (
                                                        <SelectItem key={selectedTeam.id} value={selectedTeam.id}>
                                                            <div className="flex items-center gap-2">
                                                                {selectedTeam.logo_url && (
                                                                    <div className="relative w-4 h-4">
                                                                        <Image
                                                                            src={selectedTeam.logo_url}
                                                                            alt={selectedTeam.name}
                                                                            fill
                                                                            sizes="16px"
                                                                            className="object-contain"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <span>{selectedTeam.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ) : null;
                                                })()
                                            )}
                                            {availableTeams
                                                .filter(t => t.id !== pair.homeTeamId)
                                                .map(t => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        <div className="flex items-center gap-2">
                                                            {t.logo_url && (
                                                                <div className="relative w-4 h-4">
                                                                    <Image
                                                                        src={t.logo_url}
                                                                        alt={t.name}
                                                                        fill
                                                                        sizes="16px"
                                                                        className="object-contain"
                                                                    />
                                                                </div>
                                                            )}
                                                            <span>{t.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-sm">Individual Schedule Override</Label>
                                    {pair.schedule && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => clearMatchSchedule(pair.id)}
                                            className="rounded-sm"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Override default schedule for this specific match
                                </p>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Timezone</Label>
                                        <Select
                                            value={pair.schedule?.timezone || "Asia/Singapore"}
                                            onValueChange={v => updateMatchSchedule(pair.id, "timezone", v)}
                                        >
                                            <SelectTrigger className="rounded-sm h-9">
                                                <SelectValue />
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
                                    <div className="space-y-1">
                                        <Label className="text-xs">Date</Label>
                                        <Input
                                            type="date"
                                            value={pair.schedule?.date || ""}
                                            onChange={e => updateMatchSchedule(pair.id, "date", e.target.value)}
                                            className="rounded-sm h-9"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Time</Label>
                                        <Input
                                            type="time"
                                            value={pair.schedule?.time || ""}
                                            onChange={e => updateMatchSchedule(pair.id, "time", e.target.value)}
                                            className="rounded-sm h-9"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <Button
                    onClick={addMatchPair}
                    disabled={!canAddMore || loading}
                    variant="outline"
                    className="w-full rounded-sm"
                >
                    + Add New Match
                </Button>
            </div>
        </div>
    );
}