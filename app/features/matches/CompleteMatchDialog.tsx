"use client";

import React, {useState, useEffect} from "react";
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
import {useMatchesStore} from "@/app/stores/matchStore";
import {usePlayerStore} from "@/app/stores/playerStore";
import {clientLogger} from "@/app/utils/clientLogger";
import {Player} from "@/shared/types/db";

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
    const {completeMatch} = useMatchesStore();
    const {fetchTeamPlayers, playersByTeamCache} = usePlayerStore();

    const [open, setOpen] = useState(false);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
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
            clientLogger.error("CompleteMatchDialog", "Failed to load players", {error});
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

        clientLogger.info("CompleteMatchDialog", "Completing match", {matchId, sets});

        const success = await completeMatch({
            matchId,
            sets,
            matchMvpPlayerId: matchMvpId,
            loserMvpPlayerId: loserMvpId
        });

        if (success) {
            clientLogger.info("CompleteMatchDialog", "Match completed successfully", {matchId});
            setOpen(false);
            resetForm();
            onSuccess();
        } else {
            alert("Failed to complete match");
        }
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
                <Button variant="default" size="sm">
                    Complete Match
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Complete Match</DialogTitle>
                </DialogHeader>

                {loadingPlayers ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold">Set Scores (BO{bestOf})</h3>
                                <div className="flex gap-2">
                                    {setScores.length < maxSets && (
                                        <Button variant="outline" size="sm" onClick={addSet}>
                                            Add Set
                                        </Button>
                                    )}
                                    {setScores.length > minSets && (
                                        <Button variant="outline" size="sm" onClick={removeSet}>
                                            Remove Set
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {setScores.map((set, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="text-sm font-medium w-16">Set {idx + 1}</span>
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="text-sm text-muted-foreground w-24 truncate">
                                                {homeTeamName}
                                            </span>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={set.homeScore}
                                                onChange={e => handleSetScoreChange(idx, "home", e.target.value)}
                                                className="w-20"
                                                placeholder="0"
                                            />
                                        </div>
                                        <span className="text-muted-foreground">-</span>
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={set.awayScore}
                                                onChange={e => handleSetScoreChange(idx, "away", e.target.value)}
                                                className="w-20"
                                                placeholder="0"
                                            />
                                            <span className="text-sm text-muted-foreground w-24 truncate">
                                                {awayTeamName}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {setScores.length > 0 && (
                                <div className="mt-4 p-3 bg-muted rounded-lg">
                                    <div className="flex justify-between text-sm">
                                        <span>{homeTeamName}: {homeSetsWon} sets</span>
                                        <span>{awayTeamName}: {awaySetsWon} sets</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Match MVP ({winningTeamName})
                                </label>
                                <Select value={matchMvpId} onValueChange={setMatchMvpId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select winning team MVP">
                                            {matchMvpId && (
                                                <div className="flex items-center gap-2">
                                                    {winningTeamPlayers.find(p => p.id === matchMvpId)?.avatar_url && (
                                                        <img
                                                            src={winningTeamPlayers.find(p => p.id === matchMvpId)?.avatar_url || ""}
                                                            alt="Avatar"
                                                            className="w-5 h-5 rounded-full"
                                                        />
                                                    )}
                                                    <span>
                                                        {winningTeamPlayers.find(p => p.id === matchMvpId)?.display_name ||
                                                            winningTeamPlayers.find(p => p.id === matchMvpId)?.username ||
                                                            "Unknown"}
                                                    </span>
                                                </div>
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {winningTeamPlayers.map(player => (
                                            <SelectItem key={player.id} value={player.id}>
                                                <div className="flex items-center gap-2">
                                                    {player.avatar_url && (
                                                        <img
                                                            src={player.avatar_url}
                                                            alt={player.username || "Player"}
                                                            className="w-5 h-5 rounded-full"
                                                        />
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

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Loser MVP ({losingTeamName})
                                </label>
                                <Select value={loserMvpId} onValueChange={setLoserMvpId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select losing team MVP">
                                            {loserMvpId && (
                                                <div className="flex items-center gap-2">
                                                    {losingTeamPlayers.find(p => p.id === loserMvpId)?.avatar_url && (
                                                        <img
                                                            src={losingTeamPlayers.find(p => p.id === loserMvpId)?.avatar_url || ""}
                                                            alt="Avatar"
                                                            className="w-5 h-5 rounded-full"
                                                        />
                                                    )}
                                                    <span>
                                                        {losingTeamPlayers.find(p => p.id === loserMvpId)?.display_name ||
                                                            losingTeamPlayers.find(p => p.id === loserMvpId)?.username ||
                                                            "Unknown"}
                                                    </span>
                                                </div>
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {losingTeamPlayers.map(player => (
                                            <SelectItem key={player.id} value={player.id}>
                                                <div className="flex items-center gap-2">
                                                    {player.avatar_url && (
                                                        <img
                                                            src={player.avatar_url}
                                                            alt={player.username || "Player"}
                                                            className="w-5 h-5 rounded-full"
                                                        />
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

                        <Button onClick={validateAndSubmit} className="w-full">
                            Complete Match
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}