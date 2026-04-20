"use client";

import React, {useState, useEffect, useRef} from "react";
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
import { completeMatch as completeMatchAction } from "@/app/hooks/useMatches";
import { getTeamPlayersAction } from "@/app/actions/player.actions";
import { clientLogger } from "@/app/utils/clientLogger";
import { Badge } from "@/app/components/ui/badge";
import Image from "next/image";
import {toast} from "@/app/utils/toast";
import {PlayerWithRole} from "@/server/domains/player";
import {Trophy} from "lucide-react";

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


    const [open, setOpen] = useState(false);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [homePlayers, setHomePlayers] = useState<PlayerWithRole[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<PlayerWithRole[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    const maxSets = bestOf;
    const minSets = bestOf === 5 ? 3 : 2;

    const [isForfeit, setIsForfeit] = useState(false);
    const [forfeitingTeam, setForfeitingTeam] = useState<"home" | "away">("home");

    const [setScores, setSetScores] = useState<Array<{ homeScore: string; awayScore: string }>>([]);
    const [matchMvpId, setMatchMvpId] = useState<string>("");
    const [loserMvpId, setLoserMvpId] = useState<string>("");

    useEffect(() => {
        if (open) {
            initializeSetScores();
            loadPlayers();
        } else {
            // Cancel player loading when dialog closes
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
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
        // Cancel any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        setLoadingPlayers(true);
        try {
            const [homeResult, awayResult] = await Promise.all([
                getTeamPlayersAction({ teamId: homeTeamId, seasonId }),
                getTeamPlayersAction({ teamId: awayTeamId, seasonId }),
            ]);

            // Check if request was aborted
            if (abortControllerRef.current?.signal.aborted) {
                return;
            }

            if (homeResult.ok) setHomePlayers(homeResult.value);
            if (awayResult.ok) setAwayPlayers(awayResult.value);
        } catch (error) {
            if (abortControllerRef.current?.signal.aborted) {
                clientLogger.info("CompleteMatchDialog", "Player loading cancelled");
                return;
            }
            clientLogger.error("CompleteMatchDialog", "Failed to load players", { error });
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                setLoadingPlayers(false);
            }
        }
    };

    const cancelPlayerLoading = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoadingPlayers(false);
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

            const teamsTied = currentHomeSets === currentAwaySets;

            if (allSetsHaveScores && teamsTied && newScores.length < maxSets) {
                setSetScores([...newScores, { homeScore: "", awayScore: "" }]);
                clientLogger.info("CompleteMatchDialog", "Auto-added set (teams tied)", {
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
        if (isForfeit) {
            setSubmitting(true);
            clientLogger.info("CompleteMatchDialog", "Completing match as forfeit", { matchId, forfeitingTeam });

            try {
                await completeMatchAction({
                    matchId,
                    sets: [],
                    isForfeit: true,
                    forfeitingTeam,
                });

                clientLogger.info("CompleteMatchDialog", "Match completed as forfeit", { matchId });
                setOpen(false);
                resetForm();
                onSuccess();
            } catch {
                toast.error("Failed to complete match");
            }

            setSubmitting(false);
            return;
        }

        const sets = setScores.map((s, idx) => ({
            setNumber: idx + 1,
            homeScore: parseInt(s.homeScore),
            awayScore: parseInt(s.awayScore)
        }));

        if (sets.some(s => isNaN(s.homeScore) || isNaN(s.awayScore))) {
            toast.error("Please fill in all set scores");
            return;
        }

        // if (!matchMvpId || !loserMvpId) {
        //     toast.error("Please select both MVPs");
        //     return;
        // }

        setSubmitting(true);
        clientLogger.info("CompleteMatchDialog", "Completing match", { matchId, sets });

        try {
            await completeMatchAction({
                matchId,
                sets,
                matchMvpPlayerId: matchMvpId,
                loserMvpPlayerId: loserMvpId,
                isForfeit: false,
            });

            clientLogger.info("CompleteMatchDialog", "Match completed successfully", { matchId });
            setOpen(false);
            resetForm();
            onSuccess();
        } catch {
            toast.error("Failed to complete match");
        }

        setSubmitting(false);
    };
    const resetForm = () => {
        initializeSetScores();
        setMatchMvpId("");
        setLoserMvpId("");
        setIsForfeit(false);
        setForfeitingTeam("home");
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
                <Button variant="default" size="sm" className="h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-sm">
                    <Trophy className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm">
                <DialogHeader>
                    <DialogTitle>Complete Match</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Enter final scores and select MVPs
                    </p>
                </DialogHeader>

                {loadingPlayers ? (
                    <div className="space-y-6">
                        {/* Show match form immediately */}
                        <div className="flex items-center space-x-2 panel p-4">
                            <input
                                type="checkbox"
                                id="forfeit-checkbox"
                                checked={isForfeit}
                                onChange={(e) => setIsForfeit(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="forfeit-checkbox" className="cursor-pointer">
                                Mark as Forfeit
                            </Label>
                        </div>

                        {!isForfeit && (
                            <>
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
                                            <div key={idx} className="space-y-2">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                                    Set {idx + 1}
                                                </Label>
                                                <div className="panel p-4">
                                                    <div className="flex items-center justify-center gap-2 sm:gap-6">
                                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium sm:w-32 text-right truncate">
                                                {homeTeamName}
                                            </span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={set.homeScore}
                                                                onChange={e => handleSetScoreChange(idx, "home", e.target.value)}
                                                                className="w-16 sm:w-20 h-11 sm:h-9 rounded-sm text-center text-lg font-semibold"
                                                                placeholder="0"
                                                            />
                                                        </div>

                                                        <span className="text-2xl font-bold text-muted-foreground">-</span>

                                                        <div className="flex items-center gap-3">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={set.awayScore}
                                                                onChange={e => handleSetScoreChange(idx, "away", e.target.value)}
                                                                className="w-16 sm:w-20 h-11 sm:h-9 rounded-sm text-center text-lg font-semibold"
                                                                placeholder="0"
                                                            />
                                                            <span className="text-sm font-medium sm:w-32 truncate">
                                                {awayTeamName}
                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {setScores.length > 0 && (
                                        <div className="panel p-4 bg-muted/50">
                                            <div className="flex items-center justify-center gap-2 sm:gap-8">
                                                <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:w-48 sm:flex-none min-w-0">
                                                    <span className="font-semibold flex-1 text-right">{homeTeamName}</span>
                                                    <Badge variant="secondary" className="rounded-sm shrink-0">
                                                        {homeSetsWon}
                                                    </Badge>
                                                </div>

                                                <span className="text-muted-foreground text-sm font-medium shrink-0">-</span>

                                                <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:w-48 sm:flex-none min-w-0">
                                                    <Badge variant="secondary" className="rounded-sm shrink-0">
                                                        {awaySetsWon}
                                                    </Badge>
                                                    <span className="font-semibold flex-1">{awayTeamName}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* MVP section with loading indicator */}
                                <div className="space-y-3">
                                    <h3 className="font-semibold mb-2">MVP Selection</h3>
                                    <div className="flex items-center justify-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        <span className="ml-3 text-sm text-muted-foreground">Loading players...</span>
                                    </div>
                                </div>

                                {loadingPlayers && (
                                    <div className="space-y-3">
                                        <h3 className="font-semibold mb-2">MVP Selection</h3>
                                        <div className="flex flex-col items-center justify-center py-4 gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                                <span className="text-sm text-muted-foreground">Loading players...</span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={cancelPlayerLoading}
                                                className="rounded-sm"
                                            >
                                                Skip MVP Selection
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <Button
                            onClick={validateAndSubmit}
                            className="w-full rounded-sm"
                            disabled={submitting}
                        >
                            {submitting ? "Completing..." : "Complete Match"}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 panel p-4">
                            <input
                                type="checkbox"
                                id="forfeit-checkbox"
                                checked={isForfeit}
                                onChange={(e) => setIsForfeit(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="forfeit-checkbox" className="cursor-pointer">
                                Mark as Forfeit
                            </Label>
                        </div>
                        {isForfeit ? (
                            <div className="space-y-3">
                                <Label>Which team forfeited?</Label>
                                <Select value={forfeitingTeam} onValueChange={(val: "home" | "away") => setForfeitingTeam(val)}>
                                    <SelectTrigger className="rounded-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="home">{homeTeamName}</SelectItem>
                                        <SelectItem value="away">{awayTeamName}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">
                                    Winner receives +5 LVR, forfeiting team receives -10 LVR
                                </p>
                            </div>
                        ) : (
                            <>
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
                                            <div key={idx} className="space-y-2">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                                    Set {idx + 1}
                                                </Label>
                                                <div className="panel p-4">
                                                    <div className="flex items-center justify-center gap-2 sm:gap-6">
                                                        <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium sm:w-32 text-right truncate">
                                                        {homeTeamName}
                                                    </span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={set.homeScore}
                                                                onChange={e => handleSetScoreChange(idx, "home", e.target.value)}
                                                                className="w-16 sm:w-20 h-11 sm:h-9 rounded-sm text-center text-lg font-semibold"
                                                                placeholder="0"
                                                            />
                                                        </div>

                                                        <span className="text-2xl font-bold text-muted-foreground">-</span>

                                                        <div className="flex items-center gap-3">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={set.awayScore}
                                                                onChange={e => handleSetScoreChange(idx, "away", e.target.value)}
                                                                className="w-16 sm:w-20 h-11 sm:h-9 rounded-sm text-center text-lg font-semibold"
                                                                placeholder="0"
                                                            />
                                                            <span className="text-sm font-medium sm:w-32 truncate">
                                                        {awayTeamName}
                                                    </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {setScores.length > 0 && (
                                        <div className="panel p-4 bg-muted/50">
                                            <div className="flex items-center justify-center gap-2 sm:gap-8">
                                                <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:w-48 sm:flex-none min-w-0">
                                                    <span className="font-semibold flex-1 text-right">{homeTeamName}</span>
                                                    <Badge variant="secondary" className="rounded-sm shrink-0">
                                                        {homeSetsWon}
                                                    </Badge>
                                                </div>

                                                <span className="text-muted-foreground text-sm font-medium shrink-0">-</span>

                                                <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:w-48 sm:flex-none min-w-0">
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

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            </>
                        )}

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