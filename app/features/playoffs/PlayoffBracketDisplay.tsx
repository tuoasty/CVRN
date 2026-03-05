"use client";

import React, { useMemo, useEffect, useState } from "react";
import { PlayoffBracket, Match } from "@/shared/types/db";
import { MatchBracketCard } from "./MatchBracketCard";
import { useTeamsStore } from "@/app/stores/teamStore";
import { useMatchesStore } from "@/app/stores/matchStore";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

type PlayoffBracketDisplayProps = {
    brackets: PlayoffBracket[];
    seasonId: string;
};

type RoundType = "play_in" | "round_of_16" | "quarterfinal" | "semifinal" | "final" | "third_place";

type BracketWithMatch = PlayoffBracket & {
    match: Match;
};

type RoundData = {
    type: RoundType;
    label: string;
    brackets: BracketWithMatch[];
};

const ROUND_LABELS: Record<RoundType, string> = {
    play_in: "Play-In",
    round_of_16: "Round of 16",
    quarterfinal: "Quarterfinals",
    semifinal: "Semifinals",
    final: "Grand Finals",
    third_place: "3rd Place Match",
};

const ROUND_ORDER: RoundType[] = [
    "play_in",
    "round_of_16",
    "quarterfinal",
    "semifinal",
    "final",
];

const MATCH_HEIGHT = 140;
const MATCH_WIDTH = 280;
const ROUND_GAP = 120;
const VERTICAL_SPACING_BASE = 24;
const HEADER_OFFSET = 60;
const BOTTOM_PADDING = 100;

function assignDisplayOrder(brackets: BracketWithMatch[]): Map<string, number> {
    const orderMap = new Map<string, number>();

    const finalBracket = brackets.find(b => b.round === "final");
    if (!finalBracket) return orderMap;

    let currentOrder = 0;

    function assignOrder(bracketId: string) {
        const bracket = brackets.find(b => b.id === bracketId);
        if (!bracket) return;

        const feedingBrackets = brackets.filter(b => b.next_bracket_id === bracketId);

        if (feedingBrackets.length === 0) {
            orderMap.set(bracketId, currentOrder++);
            return;
        }

        feedingBrackets.sort((a, b) => {
            const seedA = a.seed_home || 999;
            const seedB = b.seed_home || 999;
            return seedA - seedB;
        });

        feedingBrackets.forEach((fb) => {
            assignOrder(fb.id);
        });

        orderMap.set(bracketId, currentOrder++);
    }

    assignOrder(finalBracket.id);
    return orderMap;
}

export function PlayoffBracketDisplay({ brackets }: PlayoffBracketDisplayProps) {
    const { allTeamsCache, fetchAllTeams } = useTeamsStore();
    const { matchesCache, fetchAllMatches } = useMatchesStore();
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [loadingMatches, setLoadingMatches] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        fetchAllTeams()
            .then(() => setLoadingTeams(false))
            .catch(() => setLoadingTeams(false));
    }, [fetchAllTeams]);

    useEffect(() => {
        fetchAllMatches()
            .then(() => setLoadingMatches(false))
            .catch(() => setLoadingMatches(false));
    }, [fetchAllMatches]);

    const teams = allTeamsCache?.data || [];
    const matches = matchesCache?.data || [];

    const teamsMap = useMemo(() => {
        return new Map(teams.map((team) => [team.id, team]));
    }, [teams]);

    const matchesMap = useMemo(() => {
        return new Map(matches.map((match) => [match.id, match]));
    }, [matches]);

    const { mainBracketRounds, thirdPlaceMatch } = useMemo(() => {
        const bracketsWithMatches = brackets
            .filter((b) => matchesMap.has(b.match_id))
            .map((b) => ({
                ...b,
                match: matchesMap.get(b.match_id)!,
            }));

        const thirdPlace = bracketsWithMatches.find((b) => b.round === "third_place");
        const mainBrackets = bracketsWithMatches.filter((b) => b.round !== "third_place");

        const displayOrderMap = assignDisplayOrder(mainBrackets);

        const roundsMap = new Map<RoundType, BracketWithMatch[]>();

        mainBrackets.forEach((bracket) => {
            const round = bracket.round as RoundType;
            if (!roundsMap.has(round)) {
                roundsMap.set(round, []);
            }
            roundsMap.get(round)!.push(bracket);
        });

        const orderedRounds: RoundData[] = ROUND_ORDER.map((roundType) => {
            const roundBrackets = roundsMap.get(roundType);
            if (!roundBrackets || roundBrackets.length === 0) {
                return null;
            }

            return {
                type: roundType,
                label: ROUND_LABELS[roundType],
                brackets: roundBrackets.sort((a, b) => {
                    const orderA = displayOrderMap.get(a.id) || 999;
                    const orderB = displayOrderMap.get(b.id) || 999;
                    return orderA - orderB;
                }),
            };
        }).filter((r): r is RoundData => r !== null);

        return {
            mainBracketRounds: orderedRounds,
            thirdPlaceMatch: thirdPlace || null,
        };
    }, [brackets, matchesMap]);

    const { matchPositions, connectorLines } = useMemo(() => {
        const positions = new Map<string, { x: number; y: number }>();

        mainBracketRounds.forEach((round, roundIndex) => {
            if (roundIndex === 0) {
                if (round.type === "play_in" && mainBracketRounds.length > 1) {
                    const nextRound = mainBracketRounds[1];
                    round.brackets.forEach((bracket) => {
                        const nextBracket = nextRound.brackets.find(
                            nb => nb.id === bracket.next_bracket_id
                        );
                        if (nextBracket) {
                            const nextBracketIndex = nextRound.brackets.indexOf(nextBracket);
                            positions.set(bracket.id, {
                                x: 0,
                                y: HEADER_OFFSET + nextBracketIndex * (MATCH_HEIGHT + VERTICAL_SPACING_BASE) * 2,
                            });
                        } else {
                            const bracketIndex = round.brackets.indexOf(bracket);
                            positions.set(bracket.id, {
                                x: 0,
                                y: HEADER_OFFSET + bracketIndex * (MATCH_HEIGHT + VERTICAL_SPACING_BASE) * 2,
                            });
                        }
                    });
                } else {
                    round.brackets.forEach((bracket, bracketIndex) => {
                        positions.set(bracket.id, {
                            x: 0,
                            y: HEADER_OFFSET + bracketIndex * (MATCH_HEIGHT + VERTICAL_SPACING_BASE) * 2,
                        });
                    });
                }
            } else {
                const previousRound = mainBracketRounds[roundIndex - 1];

                round.brackets.forEach((bracket) => {
                    const feedingBrackets = previousRound.brackets.filter(
                        b => b.next_bracket_id === bracket.id
                    );

                    if (feedingBrackets.length > 0) {
                        const avgY = feedingBrackets.reduce((sum, fb) => {
                            const pos = positions.get(fb.id);
                            return sum + (pos?.y || 0);
                        }, 0) / feedingBrackets.length;

                        positions.set(bracket.id, {
                            x: roundIndex * (MATCH_WIDTH + ROUND_GAP),
                            y: avgY,
                        });
                    } else {
                        const bracketIndex = round.brackets.indexOf(bracket);
                        const spacing = (MATCH_HEIGHT + VERTICAL_SPACING_BASE) * Math.pow(2, roundIndex);
                        positions.set(bracket.id, {
                            x: roundIndex * (MATCH_WIDTH + ROUND_GAP),
                            y: HEADER_OFFSET + bracketIndex * spacing,
                        });
                    }
                });
            }
        });

        const lines: Array<{
            x1: number; y1: number; x2: number; y2: number;
            x3: number; y3: number; x4: number; y4: number;
            isCompleted: boolean;
        }> = [];

        mainBracketRounds.forEach((round, roundIndex) => {
            if (roundIndex === mainBracketRounds.length - 1) return;

            const nextRound = mainBracketRounds[roundIndex + 1];
            if (!nextRound) return;

            round.brackets.forEach((bracket) => {
                if (!bracket.next_bracket_id) return;

                const nextBracket = nextRound.brackets.find(
                    (nb) => nb.id === bracket.next_bracket_id
                );
                if (!nextBracket) return;

                const startPos = positions.get(bracket.id);
                const endPos = positions.get(nextBracket.id);

                if (!startPos || !endPos) return;

                const startX = startPos.x + MATCH_WIDTH;
                const startY = startPos.y + MATCH_HEIGHT / 2;
                const endX = endPos.x;
                const endY = endPos.y + MATCH_HEIGHT / 2;
                const midX = startX + ROUND_GAP / 2;

                lines.push({
                    x1: startX,
                    y1: startY,
                    x2: midX,
                    y2: startY,
                    x3: midX,
                    y3: endY,
                    x4: endX,
                    y4: endY,
                    isCompleted: bracket.match.status === "completed",
                });
            });
        });

        return { matchPositions: positions, connectorLines: lines };
    }, [mainBracketRounds]);

    const { totalHeight, totalWidth } = useMemo(() => {
        if (mainBracketRounds.length === 0) return { totalHeight: 0, totalWidth: 0 };

        let maxY = 0;
        matchPositions.forEach((pos) => {
            const bottomY = pos.y + MATCH_HEIGHT;
            if (bottomY > maxY) maxY = bottomY;
        });

        const height = maxY + BOTTOM_PADDING;
        const width = mainBracketRounds.length * (MATCH_WIDTH + ROUND_GAP);

        return { totalHeight: height, totalWidth: width };
    }, [mainBracketRounds, matchPositions]);

    if (loadingTeams || loadingMatches) {
        return (
            <div className="panel p-12">
                <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading bracket data...</p>
                </div>
            </div>
        );
    }

    if (mainBracketRounds.length === 0 && !thirdPlaceMatch) {
        return (
            <div className="panel p-12">
                <p className="text-sm text-muted-foreground text-center">
                    No playoff bracket data available
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="rounded-sm"
                >
                    {isFullscreen ? (
                        <>
                            <Minimize2 className="h-4 w-4 mr-2" />
                            Exit Fullscreen
                        </>
                    ) : (
                        <>
                            <Maximize2 className="h-4 w-4 mr-2" />
                            Fullscreen View
                        </>
                    )}
                </Button>
            </div>

            <div className={cn(
                "panel p-6 overflow-auto",
                isFullscreen && "fixed inset-0 z-50 bg-background"
            )}>
                <div className="relative" style={{ width: totalWidth, height: totalHeight, minWidth: totalWidth }}>
                    <svg
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{ width: totalWidth, height: totalHeight }}
                        width={totalWidth}
                        height={totalHeight}
                    >
                        {connectorLines.map((line, index) => (
                            <g key={index}>
                                <line
                                    x1={line.x1}
                                    y1={line.y1}
                                    x2={line.x2}
                                    y2={line.y2}
                                    stroke={line.isCompleted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                                    strokeWidth={2}
                                />
                                <line
                                    x1={line.x2}
                                    y1={line.y2}
                                    x2={line.x3}
                                    y2={line.y3}
                                    stroke={line.isCompleted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                                    strokeWidth={2}
                                />
                                <line
                                    x1={line.x3}
                                    y1={line.y3}
                                    x2={line.x4}
                                    y2={line.y4}
                                    stroke={line.isCompleted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                                    strokeWidth={2}
                                />
                            </g>
                        ))}
                    </svg>

                    {mainBracketRounds.map((round, roundIndex) => (
                        <div key={round.type}>
                            <div
                                className="absolute"
                                style={{
                                    left: roundIndex * (MATCH_WIDTH + ROUND_GAP),
                                    top: 0,
                                    width: MATCH_WIDTH,
                                }}
                            >
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                        {round.label}
                                    </h3>
                                </div>
                            </div>

                            {round.brackets.map((bracket) => {
                                const pos = matchPositions.get(bracket.id);
                                if (!pos) return null;

                                const homeTeam = bracket.match.home_team_id
                                    ? teamsMap.get(bracket.match.home_team_id)
                                    : undefined;
                                const awayTeam = bracket.match.away_team_id
                                    ? teamsMap.get(bracket.match.away_team_id)
                                    : undefined;

                                return (
                                    <div
                                        key={bracket.id}
                                        className="absolute z-10"
                                        style={{
                                            left: pos.x,
                                            top: pos.y,
                                            width: MATCH_WIDTH,
                                        }}
                                    >
                                        <MatchBracketCard
                                            bracket={bracket}
                                            match={bracket.match}
                                            homeTeam={homeTeam}
                                            awayTeam={awayTeam}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {thirdPlaceMatch && (
                <div className="panel p-6">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            {ROUND_LABELS.third_place}
                        </h3>
                    </div>

                    <div className="max-w-sm">
                        <MatchBracketCard
                            bracket={thirdPlaceMatch}
                            match={thirdPlaceMatch.match}
                            homeTeam={
                                thirdPlaceMatch.match.home_team_id
                                    ? teamsMap.get(thirdPlaceMatch.match.home_team_id)
                                    : undefined
                            }
                            awayTeam={
                                thirdPlaceMatch.match.away_team_id
                                    ? teamsMap.get(thirdPlaceMatch.match.away_team_id)
                                    : undefined
                            }
                        />
                    </div>
                </div>
            )}
        </div>
    );
}