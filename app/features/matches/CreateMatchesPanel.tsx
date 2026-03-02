"use client";

import React, { useState, useEffect } from "react";
import { useMatchesStore } from "@/app/stores/matchStore";
import { createMatchesAction } from "@/app/actions/match.actions";
import { Button } from "@/app/components/ui/button";
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
import {timezoneOptions} from "@/app/utils/timezoneOptions";

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
}

export default function CreateMatchesPanel({ seasonId, week }: CreateMatchesPanelProps) {
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
            })

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
                            timezone: field === "timezone" ? value : m.schedule?.timezone || "",
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

    if (!seasonId) {
        return (
            <div className="text-sm text-gray-500">
                Select a season and week to create matches
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Match Pairs</h2>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting || matchPairs.length === 0 || matchPairs.some(m => !m.homeTeamId || !m.awayTeamId)}
                >
                    {submitting ? "Creating..." : "Create All Matches"}
                </Button>
            </div>

            <div className="border p-4 rounded-lg space-y-4 bg-muted/30">
                <h3 className="font-medium">Default Schedule (Optional)</h3>
                <p className="text-sm text-muted-foreground">
                    Set a default date and time for all matches in this week
                </p>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Timezone</label>
                        <Select
                            value={defaultSchedule?.timezone || ""}
                            onValueChange={v => setDefaultSchedule(prev => ({
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
                            value={defaultSchedule?.date || ""}
                            onChange={e => setDefaultSchedule(prev => ({
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
                            value={defaultSchedule?.time || ""}
                            onChange={e => setDefaultSchedule(prev => ({
                                date: prev?.date || "",
                                time: e.target.value,
                                timezone: prev?.timezone || ""
                            }))}
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
                    >
                        Clear Default Schedule
                    </Button>
                )}
            </div>

            {!canAddMore && matchPairs.length === 0 && (
                <p className="text-sm text-gray-500">
                    Not enough teams available for this week (need at least 2)
                </p>
            )}

            {matchPairs.map((pair, index) => (
                <div key={pair.id} className="border p-4 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h3 className="font-medium">Match {index + 1}</h3>
                            {pair.homeTeamId && pair.awayTeamId && (() => {
                                const cacheKey = `${seasonId}-${week}`;
                                const cached = availableTeamsCache.get(cacheKey);
                                const homeTeam = cached?.data.find(t => t.id === pair.homeTeamId);
                                const awayTeam = cached?.data.find(t => t.id === pair.awayTeamId);

                                return (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {homeTeam?.logo_url && (
                                            <div className="relative w-6 h-6">
                                                <Image
                                                    src={homeTeam.logo_url}
                                                    alt={homeTeam.name}
                                                    fill
                                                    sizes="24px"
                                                    className="object-contain"
                                                />
                                            </div>
                                        )}
                                        <span>vs</span>
                                        {awayTeam?.logo_url && (
                                            <div className="relative w-6 h-6">
                                                <Image
                                                    src={awayTeam.logo_url}
                                                    alt={awayTeam.name}
                                                    fill
                                                    sizes="24px"
                                                    className="object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeMatchPair(pair.id)}
                        >
                            Remove
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Home Team</label>
                            <Select
                                value={pair.homeTeamId}
                                onValueChange={v => updateMatchPair(pair.id, "homeTeamId", v)}
                            >
                                <SelectTrigger>
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
                                                            <div className="relative w-5 h-5">
                                                                <Image
                                                                    src={selectedTeam.logo_url}
                                                                    alt={selectedTeam.name}
                                                                    fill
                                                                    sizes="20px"
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
                                                        <div className="relative w-5 h-5">
                                                            <Image
                                                                src={t.logo_url}
                                                                alt={t.name}
                                                                fill
                                                                sizes="20px"
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

                        <div>
                            <label className="block text-sm font-medium mb-2">Away Team</label>
                            <Select
                                value={pair.awayTeamId}
                                onValueChange={v => updateMatchPair(pair.id, "awayTeamId", v)}
                            >
                                <SelectTrigger>
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
                                                            <div className="relative w-5 h-5">
                                                                <Image
                                                                    src={selectedTeam.logo_url}
                                                                    alt={selectedTeam.name}
                                                                    fill
                                                                    sizes="20px"
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
                                                        <div className="relative w-5 h-5">
                                                            <Image
                                                                src={t.logo_url}
                                                                alt={t.name}
                                                                fill
                                                                sizes="20px"
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

                    <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium">Individual Schedule (Optional)</label>
                            {pair.schedule && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => clearMatchSchedule(pair.id)}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            Override default schedule for this match
                        </p>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium mb-1">Timezone</label>
                                <Select
                                    value={pair.schedule?.timezone || "Asia/Singapore"}
                                    onValueChange={v => updateMatchSchedule(pair.id, "timezone", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
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
                                <label className="block text-xs font-medium mb-1">Date</label>
                                <Input
                                    type="date"
                                    value={pair.schedule?.date || ""}
                                    onChange={e => updateMatchSchedule(pair.id, "date", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1">Time</label>
                                <Input
                                    type="time"
                                    value={pair.schedule?.time || ""}
                                    onChange={e => updateMatchSchedule(pair.id, "time", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <Button
                onClick={addMatchPair}
                disabled={!canAddMore || loading}
                className="w-full"
            >
                Add New Match
            </Button>
        </div>
    );
}