"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
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
import { useMatchesStore } from "@/app/stores/matchStore";
import { usePlayerStore } from "@/app/stores/playerStore";
import { clientLogger } from "@/app/utils/clientLogger";
import { Player, MatchSet } from "@/shared/types/db";
import { Badge } from "@/app/components/ui/badge";
import Image from "next/image";
import {toast} from "@/app/utils/toast";

interface UpdateMatchDialogProps {
    matchId: string;
    seasonId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    bestOf: number;
    currentSets: MatchSet[];
    currentMatchMvpId: string;
    currentLoserMvpId: string;
    onSuccess: () => void;
}

export default function UpdateMatchDialog({
                                              matchId,
                                              seasonId,
                                              homeTeamId,
                                              awayTeamId,
                                              homeTeamName,
                                              awayTeamName,
                                              bestOf,
                                              currentSets,
                                              currentMatchMvpId,
                                              currentLoserMvpId,
                                              onSuccess
                                          }: UpdateMatchDialogProps) {
    const { updateMatchResults } = useMatchesStore();
    const { fetchTeamPlayers, playersByTeamCache } = usePlayerStore();

    const [open, setOpen] = useState(false);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

    const maxSets = bestOf;
    const minSets = bestOf === 5 ? 3 : 2;

    const [setScores, setSetScores] = useState<Array<{ homeScore: string; awayScore: string }>>([]);
    const [matchMvpId, setMatchMvpId] = useState<string>("");
    const [loserMvpId, setLoserMvpId] = useState<string>("");

    useEffect(() => {
        if (open) {
            loadPlayers();
            initializeFromCurrentData();
        }
    }, [open]);

    const initializeFromCurrentData = () => {
        const scores = currentSets
            .sort((a, b) => a.set_number - b.set_number)
            .map(set => ({
                homeScore: set.home_score.toString(),
                awayScore: set.away_score.toString()
            }));

        setSetScores(scores);
        setMatchMvpId(currentMatchMvpId);
        setLoserMvpId(currentLoserMvpId);

        clientLogger.info("UpdateMatchDialog", "Initialized with current data", {
            setsCount: scores.length,
            matchMvpId: currentMatchMvpId,
            loserMvpId: currentLoserMvpId
        });
    };

    const loadPlayers = async () => {
        setLoadingPlayers(true);
        try {
            await fetchTeamPlayers(homeTeamId, seasonId);
            await fetchTeamPlayers(awayTeamId, seasonId);

            const homeCacheKey = `${homeTeamId}-${seasonId}`;
            const awayCacheKey = `${awayTeamId}-${seasonId}`;

            const homeCached = playersByTeamCache.get(homeCacheKey);
            const awayCached = playersByTeamCache.get(awayCacheKey);

            if (homeCached) {
                setHomePlayers(homeCached.data);
            }
            if (awayCached) {
                setAwayPlayers(awayCached.data);
            }

            clientLogger.info("UpdateMatchDialog", "Players loaded", {
                homeCount: homeCached?.data.length || 0,
                awayCount: awayCached?.data.length || 0
            });
        } catch (error) {
            clientLogger.error("UpdateMatchDialog", "Failed to load players", { error });
        } finally {
            setLoadingPlayers(false);
        }
    };

    const handleSetScoreChange = (index: number, team: "home" | "away", value: string) => {
        const newScores = [...setScores];
        if (team === "home") {
            newScores[index].homeScore = value;
        } else {
            newScores[index].awayScore = value;
        }
        setSetScores(newScores);

        setTimeout(() => {
            const currentHomeSets = newScores.filter(s => {
                const home = parseInt(s.homeScore);
                const away = parseInt(s.awayScore);
                return !isNaN(home) && !isNaN(away) && home > away;
            }).length;

            const currentAwaySets = newScores.filter(s => {
                const home = parseInt(s.homeScore);
                const away = parseInt(s.awayScore);
                return !isNaN(home) && !isNaN(away) && away > home;
            }).length;

            const allSetsHaveScores = newScores.every(s => {
                const home = parseInt(s.homeScore);
                const away = parseInt(s.awayScore);
                return !isNaN(home) && !isNaN(away);
            });

            const setsToWin = Math.ceil(bestOf / 2);
            const noWinnerYet = currentHomeSets < setsToWin && currentAwaySets < setsToWin;

            if (allSetsHaveScores && noWinnerYet && newScores.length < maxSets) {
                setSetScores([...newScores, { homeScore: "", awayScore: "" }]);
                clientLogger.info("UpdateMatchDialog", "Auto-added set", {
                    currentSets: newScores.length,
                    homeSets: currentHomeSets,
                    awaySets: currentAwaySets
                });
            }
        }, 100);
    };

    const addSet = () => {
        if (setScores.length < maxSets) {
            setSetScores([...setScores, { homeScore: "", awayScore: "" }]);
        }
    };

    const removeSet = () => {
        if (setScores.length > minSets) {
            setSetScores(setScores.slice(0, -1));
        }
    };

    const validateAndSubmit = async () => {
        const sets = setScores.map((s, idx) => ({
            setNumber: idx + 1,
            homeScore: parseInt(s.homeScore),
            awayScore: parseInt(s.awayScore)
        }));

        if (sets.some(s => isNaN(s.homeScore) || isNaN(s.awayScore))) {
            toast.error("Please fill in all set scores");
            return;
        }

        if (!matchMvpId || !loserMvpId) {
            toast.error("Please select both MVPs");
            return;
        }

        setSubmitting(true);
        clientLogger.info("UpdateMatchDialog", "Updating match results", { matchId, sets });

        const success = await updateMatchResults({
            matchId,
            sets,
            matchMvpPlayerId: matchMvpId,
            loserMvpPlayerId: loserMvpId
        });

        if (success) {
            clientLogger.info("UpdateMatchDialog", "Match results updated successfully", { matchId });
            setOpen(false);
            onSuccess();
        } else {
            toast.error("Failed to update match results");
        }

        setSubmitting(false);
    };

    const homeSetsWon = setScores.filter(s =>
        parseInt(s.homeScore) > parseInt(s.awayScore)
    ).length;
    const awaySetsWon = setScores.filter(s =>
        parseInt(s.awayScore) > parseInt(s.homeScore)
    ).length;

    const winningTeamPlayers = homeSetsWon > awaySetsWon ? homePlayers : awayPlayers;
    const losingTeamPlayers = homeSetsWon > awaySetsWon ? awayPlayers : homePlayers;
    const winningTeamName = homeSetsWon > awaySetsWon ? homeTeamName : awayTeamName;
    const losingTeamName = homeSetsWon > awaySetsWon ? awayTeamName : homeTeamName;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-sm">
                    Update Results
                </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-2xl max-h-[85vh] flex flex-col rounded-sm">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Update Match Results</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Modify scores and MVPs
                    </p>
                </DialogHeader>

                {loadingPlayers ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="space-y-5 overflow-y-auto flex-1 pr-2">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">Set Scores</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Best of {bestOf} - Minimum {minSets} sets
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {setScores.length < maxSets && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={addSet}
                                            className="rounded-sm"
                                        >
                                            + Add Set
                                        </Button>
                                    )}
                                    {setScores.length > minSets && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={removeSet}
                                            className="rounded-sm"
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {setScores.map((set, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                            Set {idx + 1}
                                        </Label>
                                        <div className="panel p-3">
                                            <div className="flex items-center justify-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium w-28 text-right">
                                                        {homeTeamName}
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={set.homeScore}
                                                        onChange={e => handleSetScoreChange(idx, "home", e.target.value)}
                                                        className="w-16 rounded-sm text-center text-base font-semibold h-9"
                                                        placeholder="0"
                                                    />
                                                </div>

                                                <span className="text-lg font-bold text-muted-foreground">-</span>

                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={set.awayScore}
                                                        onChange={e => handleSetScoreChange(idx, "away", e.target.value)}
                                                        className="w-16 rounded-sm text-center text-base font-semibold h-9"
                                                        placeholder="0"
                                                    />
                                                    <span className="text-sm font-medium w-28">
                                                        {awayTeamName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {setScores.length > 0 && (
                                <div className="panel p-3 bg-muted/50">
                                    <div className="flex items-center justify-center gap-6">
                                        <div className="flex items-center gap-2 w-40">
                                            <span className="font-semibold flex-1 text-right">{homeTeamName}</span>
                                            <Badge variant="secondary" className="rounded-sm shrink-0">
                                                {homeSetsWon}
                                            </Badge>
                                        </div>

                                        <span className="text-muted-foreground text-sm font-medium shrink-0">-</span>

                                        <div className="flex items-center gap-3 w-48">
                                            <Badge variant="secondary" className="rounded-sm shrink-0">
                                                {awaySetsWon}
                                            </Badge>
                                            <span className="font-semibold flex-1">{awayTeamName}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-semibold mb-2">MVP Selection</h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Match MVP - {winningTeamName}</Label>
                                    <Select value={matchMvpId} onValueChange={setMatchMvpId}>
                                        <SelectTrigger className="rounded-sm h-9">
                                            <SelectValue placeholder="Select winning MVP" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {winningTeamPlayers.map(player => (
                                                <SelectItem key={player.id} value={player.id}>
                                                    <div className="flex items-center gap-2">
                                                        {player.avatar_url && (
                                                            <div className="relative w-5 h-5 rounded-full overflow-hidden">
                                                                <Image
                                                                    src={player.avatar_url}
                                                                    alt={player.username || "Player"}
                                                                    fill
                                                                    sizes="20px"
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <span>
                                    {player.display_name || player.username || "Unknown"}
                                </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Loser MVP - {losingTeamName}</Label>
                                    <Select value={loserMvpId} onValueChange={setLoserMvpId}>
                                        <SelectTrigger className="rounded-sm h-9">
                                            <SelectValue placeholder="Select losing MVP" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {losingTeamPlayers.map(player => (
                                                <SelectItem key={player.id} value={player.id}>
                                                    <div className="flex items-center gap-2">
                                                        {player.avatar_url && (
                                                            <div className="relative w-5 h-5 rounded-full overflow-hidden">
                                                                <Image
                                                                    src={player.avatar_url}
                                                                    alt={player.username || "Player"}
                                                                    fill
                                                                    sizes="20px"
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <span>
                                    {player.display_name || player.username || "Unknown"}
                                </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={validateAndSubmit}
                            className="w-full rounded-sm h-9"
                            disabled={submitting}
                        >
                            {submitting ? "Updating..." : "Update Match Results"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}