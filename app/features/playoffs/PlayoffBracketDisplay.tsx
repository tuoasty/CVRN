"use client";

import React, {useMemo, useEffect, useRef, useCallback} from "react";
import {PlayoffBracket, Match} from "@/shared/types/db";
import {MatchBracketCard} from "./MatchBracketCard";
import {useTeams} from "@/app/hooks/useTeams";
import {useAllMatches} from "@/app/hooks/useMatches";
import {useRegions} from "@/app/hooks/useRegions";
import {Loader2, ZoomIn, ZoomOut, Maximize} from "lucide-react";
import {Button} from "@/app/components/ui/button";
import {TransformWrapper, TransformComponent, useControls} from "react-zoom-pan-pinch";

type PlayoffBracketDisplayProps = {
    brackets: PlayoffBracket[];
    seasonId: string;
    regionId: string;
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
    play_in: "Play-In Round",
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
const MATCH_WIDTH = 300;
const ROUND_GAP = 120;
const VERTICAL_SPACING_BASE = 16;
const HEADER_OFFSET = 80;
const BOTTOM_PADDING = 80;

function assignDisplayOrder(brackets: BracketWithMatch[]): Map<string, number> {
    const orderMap = new Map<string, number>();

    const finalBracket = brackets.find(b => b.round === "final");
    if (!finalBracket) return orderMap;

    let currentOrder = 0;

    function assignOrder(bracketId: string) {
        const bracket = brackets.find(b => b.id === bracketId);
        if (!bracket) return;

        orderMap.set(bracketId, currentOrder++);

        const feedingBrackets = brackets.filter(b => b.next_bracket_id === bracketId);

        if (feedingBrackets.length === 0) {
            return;
        }

        feedingBrackets.sort((a, b) => {
            const seedA = Math.min(a.seed_home ?? 999, a.seed_away ?? 999);
            const seedB = Math.min(b.seed_home ?? 999, b.seed_away ?? 999);
            return seedA - seedB;
        });

        feedingBrackets.forEach((fb) => {
            assignOrder(fb.id);
        });
    }

    assignOrder(finalBracket.id);
    return orderMap;
}

function ZoomControls() {
    const {zoomIn, zoomOut, resetTransform} = useControls();

    return (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
            <Button
                variant="outline"
                size="sm"
                onClick={() => zoomIn(0.4)}
                className="rounded-sm h-9 w-9 p-0 bg-background/95 backdrop-blur-sm shadow-md"
            >
                <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => zoomOut(0.4)}
                className="rounded-sm h-9 w-9 p-0 bg-background/95 backdrop-blur-sm shadow-md"
            >
                <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => resetTransform()}
                className="rounded-sm h-9 w-9 p-0 bg-background/95 backdrop-blur-sm shadow-md"
            >
                <Maximize className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function PlayoffBracketDisplay({brackets, regionId}: PlayoffBracketDisplayProps) {
    const {teams, isLoading: loadingTeams} = useTeams();
    const {matches, isLoading: loadingMatches} = useAllMatches();
    const {regions} = useRegions();

    const containerRef = useRef<HTMLDivElement>(null);

    const teamsMap = useMemo(() => {
        return new Map(teams.map((team) => [team.id, team]));
    }, [teams]);

    const matchesMap = useMemo(() => {
        return new Map(matches.map((match) => [match.id, match]));
    }, [matches]);

    const {mainBracketRounds, thirdPlaceMatch} = useMemo(() => {
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

    const {matchPositions, connectorLines, thirdPlacePosition} = useMemo(() => {
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

        let thirdPlacePos = null;
        if (thirdPlaceMatch) {
            const semifinalRound = mainBracketRounds.find(r => r.type === "semifinal");
            const finalRound = mainBracketRounds.find(r => r.type === "final");

            if (semifinalRound && finalRound && finalRound.brackets.length > 0) {
                const finalBracket = finalRound.brackets[0];
                const finalPos = positions.get(finalBracket.id);

                if (finalPos && semifinalRound.brackets.length >= 2) {
                    const lowerSemifinalBracket = semifinalRound.brackets[1];
                    const lowerSemifinalPos = positions.get(lowerSemifinalBracket.id);

                    if (lowerSemifinalPos) {
                        thirdPlacePos = {
                            x: finalPos.x,
                            y: lowerSemifinalPos.y + MATCH_HEIGHT + 80,
                        };
                    }
                }
            }
        }

        return {matchPositions: positions, connectorLines: lines, thirdPlacePosition: thirdPlacePos};
    }, [mainBracketRounds, thirdPlaceMatch]);

    const {totalHeight, totalWidth} = useMemo(() => {
        if (mainBracketRounds.length === 0) return {totalHeight: 0, totalWidth: 0};

        let maxY = 0;
        matchPositions.forEach((pos) => {
            const bottomY = pos.y + MATCH_HEIGHT;
            if (bottomY > maxY) maxY = bottomY;
        });

        if (thirdPlacePosition) {
            const thirdPlaceBottom = thirdPlacePosition.y + MATCH_HEIGHT;
            if (thirdPlaceBottom > maxY) maxY = thirdPlaceBottom;
        }

        const height = maxY + BOTTOM_PADDING;
        const width = mainBracketRounds.length * (MATCH_WIDTH + ROUND_GAP);

        return {totalHeight: height, totalWidth: width};
    }, [mainBracketRounds, matchPositions, thirdPlacePosition]);

    const regionCode = useMemo(() => {
        const region = regions.find(r => r.id === regionId);
        return region?.code;
    }, [regions, regionId]);

    // Prevent browser zoom (Ctrl+scroll) inside the bracket container
    const handlePageWheel = useCallback((e: WheelEvent) => {
        if (e.ctrlKey && containerRef.current?.contains(e.target as Node)) {
            e.preventDefault();
        }
    }, []);

    useEffect(() => {
        document.addEventListener('wheel', handlePageWheel, {passive: false});
        return () => document.removeEventListener('wheel', handlePageWheel);
    }, [handlePageWheel]);

    if (loadingTeams || loadingMatches) {
        return (
            <div className="panel p-12 border-l-4 border-l-primary/30">
                <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading bracket data...</p>
                </div>
            </div>
        );
    }

    if (mainBracketRounds.length === 0 && !thirdPlaceMatch) {
        return (
            <div className="panel p-12 border-l-4 border-l-muted">
                <p className="text-sm text-muted-foreground text-center">
                    No playoff bracket data available
                </p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative panel overflow-hidden border-l-4 border-l-primary/30 rounded-sm"
            style={{height: "calc(100vh - 12rem)"}}
        >
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 text-xs text-muted-foreground bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-sm border border-border shadow-sm">
                <span>Scroll to zoom · Drag to pan</span>
            </div>

            <TransformWrapper
                minScale={0.4}
                maxScale={2}
                initialScale={0.6}
                centerOnInit
                wheel={{step: 0.002}}
                panning={{velocityDisabled: false}}
                doubleClick={{disabled: true}}
            >
                <ZoomControls />
                <TransformComponent
                    wrapperStyle={{width: "100%", height: "100%"}}
                    contentStyle={{width: totalWidth, height: totalHeight}}
                >
                    <div className="relative" style={{width: totalWidth, height: totalHeight, padding: "16px"}}>
                        <svg
                            className="absolute top-0 left-0 pointer-events-none"
                            style={{width: totalWidth, height: totalHeight}}
                            width={totalWidth}
                            height={totalHeight}
                        >
                            <defs>
                                <linearGradient id="completedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                                </linearGradient>
                            </defs>
                            {connectorLines.map((line, index) => (
                                <g key={index}>
                                    <line
                                        x1={line.x1}
                                        y1={line.y1}
                                        x2={line.x2}
                                        y2={line.y2}
                                        stroke={line.isCompleted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                                        strokeWidth={line.isCompleted ? 3 : 2}
                                        strokeDasharray={line.isCompleted ? "0" : "5,5"}
                                        strokeOpacity={line.isCompleted ? 0.8 : 1}
                                    />
                                    <line
                                        x1={line.x2}
                                        y1={line.y2}
                                        x2={line.x3}
                                        y2={line.y3}
                                        stroke={line.isCompleted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                                        strokeWidth={line.isCompleted ? 3 : 2}
                                        strokeDasharray={line.isCompleted ? "0" : "5,5"}
                                        strokeOpacity={line.isCompleted ? 0.8 : 1}
                                    />
                                    <line
                                        x1={line.x3}
                                        y1={line.y3}
                                        x2={line.x4}
                                        y2={line.y4}
                                        stroke={line.isCompleted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                                        strokeWidth={line.isCompleted ? 3 : 2}
                                        strokeDasharray={line.isCompleted ? "0" : "5,5"}
                                        strokeOpacity={line.isCompleted ? 0.8 : 1}
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
                                    <div className="mb-6 pb-3 border-b-2 border-primary/20">
                                        <h3 className="text-base font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                            {round.label}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {round.brackets.filter(b => b.match.status === "completed").length} / {round.brackets.length} complete
                                        </p>
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
                                                regionCode={regionCode}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {thirdPlaceMatch && thirdPlacePosition && (
                            <div
                                className="absolute z-10"
                                style={{
                                    left: thirdPlacePosition.x,
                                    top: thirdPlacePosition.y,
                                    width: MATCH_WIDTH,
                                }}
                            >
                                <div className="mb-3 pb-2 border-b-2 border-amber-500/30">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600">
                                        {ROUND_LABELS.third_place}
                                    </h3>
                                </div>
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
                                    regionCode={regionCode}
                                />
                            </div>
                        )}
                    </div>
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
}
