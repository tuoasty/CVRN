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
import { Player } from "@/shared/types/db";
import { Badge } from "@/app/components/ui/badge";
import Image from "next/image";

interface CompleteMatchDialogProps {
    matchId: string;
    seasonId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string;
    awayTeamName: string;
    bestOf: number;
    onSuccess: () => void;
}

export default function CompleteMatchDialog({
                                                matchId,
                                                seasonId,
                                                homeTeamId,
                                                awayTeamId,
                                                homeTeamName,
                                                awayTeamName,
                                                bestOf,
                                                onSuccess
                                            }: CompleteMatchDialogProps) {
    const { completeMatch } = useMatchesStore();
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
            initializeSetScores();
        }
    }, [open]);

    const initializeSetScores = () => {
        const initialScores = Array.from({ length: minSets }, () => ({
            homeScore: "",
            awayScore: ""
        }));
        setSetScores(initialScores);
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

            clientLogger.info("CompleteMatchDialog", "Players loaded", {
                homeCount: homeCached?.data.length || 0,
                awayCount: awayCached?.data.length || 0
            });
        } catch (error) {
            clientLogger.error("CompleteMatchDialog", "Failed to load players", { error });
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
            alert("Please fill in all set scores");
            return;
        }

        if (!matchMvpId || !loserMvpId) {
            alert("Please select both MVPs");
            return;
        }

        setSubmitting(true);
        clientLogger.info("CompleteMatchDialog", "Completing match", { matchId, sets });

        const success = await completeMatch({
            matchId,
            sets,
            matchMvpPlayerId: matchMvpId,
            loserMvpPlayerId: loserMvpId
        });

        if (success) {
            clientLogger.info("CompleteMatchDialog", "Match completed successfully", { matchId });
            setOpen(false);
            resetForm();
            onSuccess();
        } else {
            alert("Failed to complete match");
        }

        setSubmitting(false);
    };

    const resetForm = () => {
        initializeSetScores();
        setMatchMvpId("");
        setLoserMvpId("");
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
                <Button variant="default" size="sm" className="rounded-sm">
                    Complete Match
                </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm">
                <DialogHeader>
                    <DialogTitle>Complete Match</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Enter final scores and select MVPs
                    </p>
                </DialogHeader>

                {loadingPlayers ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-4">
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
                                    <div key={idx} className="panel p-3">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="rounded-sm shrink-0 w-16">
                                                Set {idx + 1}
                                            </Badge>

                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="text-sm font-medium w-32 truncate">
                                                    {homeTeamName}
                                                </span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={set.homeScore}
                                                    onChange={e => handleSetScoreChange(idx, "home", e.target.value)}
                                                    className="w-16 rounded-sm text-center"
                                                    placeholder="0"
                                                />
                                            </div>

                                            <span className="text-muted-foreground font-semibold">-</span>

                                            <div className="flex items-center gap-2 flex-1 justify-end">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={set.awayScore}
                                                    onChange={e => handleSetScoreChange(idx, "away", e.target.value)}
                                                    className="w-16 rounded-sm text-center"
                                                    placeholder="0"
                                                />
                                                <span className="text-sm font-medium w-32 truncate text-right">
                                                    {awayTeamName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {setScores.length > 0 && (
                                <div className="panel p-4 bg-muted/50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{homeTeamName}</span>
                                            <Badge variant="secondary" className="rounded-sm">
                                                {homeSetsWon} {homeSetsWon === 1 ? 'set' : 'sets'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="rounded-sm">
                                                {awaySetsWon} {awaySetsWon === 1 ? 'set' : 'sets'}
                                            </Badge>
                                            <span className="font-semibold">{awayTeamName}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-3">MVP Selection</h3>

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>Match MVP - {winningTeamName}</Label>
                                        <Select value={matchMvpId} onValueChange={setMatchMvpId}>
                                            <SelectTrigger className="rounded-sm">
                                                <SelectValue placeholder="Select winning team MVP" />
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
                                            <SelectTrigger className="rounded-sm">
                                                <SelectValue placeholder="Select losing team MVP" />
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
                        </div>

                        <Button
                            onClick={validateAndSubmit}
                            className="w-full rounded-sm"
                            disabled={submitting}
                        >
                            {submitting ? "Completing..." : "Complete Match"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}