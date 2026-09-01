"use client";

import React, {useMemo, useEffect, useRef, useCallback, useState} from "react";
import {PlayoffBracket, Match} from "@/shared/types/db";
import type {TeamWithRegion} from "@/server/domains/team";
import {MatchBracketCard} from "./MatchBracketCard";
import {Maximize, Minimize} from "lucide-react";
import {PlayoffBracketLoading} from "./PlayoffBracketLoading";
import {Button} from "@/app/components/ui/button";
import {cn} from "@/lib/utils";
import {buildPublicMatchHref, buildAdminMatchHref} from "@/app/utils/matchDetailHref";
import { Incoming, IncomingSource } from "@/server/domains/playoff";

type PlayoffBracketDisplayProps = {
    brackets: PlayoffBracket[];
    incomingMap: Map<string, Incoming>;

    teams: TeamWithRegion[];

    matches: Match[];

    regionCode?: string;
    seasonSlug?: string;
    linkContext?: "public" | "admin";
    isSuperAdmin?: boolean;
    onReadvanceMatch?: (matchId: string) => void;
};

type RoundType =
    | "play_in"
    | "round_of_32"
    | "round_of_16"
    | "quarterfinal"
    | "semifinal"
    | "winners_final"
    | "final"
    | "grand_final"
    | "bracket_reset"
    | "third_place"
    | "losers_round_1"
    | "losers_round_2"
    | "losers_round_3"
    | "losers_quarterfinal"
    | "losers_semifinal"
    | "losers_final";

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
    round_of_32: "Round of 32",
    round_of_16: "Round of 16",
    quarterfinal: "Quarterfinals",
    semifinal: "Semifinals",
    winners_final: "Winners Final",
    final: "Grand Finals",
    grand_final: "Grand Final",
    bracket_reset: "Bracket Reset",
    third_place: "3rd Place Match",
    losers_round_1: "Losers Round 1",
    losers_round_2: "Losers Round 2",
    losers_round_3: "Losers Round 3",
    losers_quarterfinal: "Losers Quarterfinal",
    losers_semifinal: "Losers Semifinal",
    losers_final: "Losers Final",
};

const UPPER_ROUND_ORDER: RoundType[] = [
    "play_in",
    "round_of_32",
    "round_of_16",
    "quarterfinal",
    "semifinal",
    "winners_final",
    "final",
    "grand_final",
    "bracket_reset",
];

const LOWER_ROUND_ORDER: RoundType[] = [
    "losers_round_1",
    "losers_round_2",
    "losers_round_3",
    "losers_quarterfinal",
    "losers_semifinal",
    "losers_final",
];

const MATCH_HEIGHT = 140;
const MATCH_WIDTH = 300;
const ROUND_GAP = 72;
const VERTICAL_SPACING_BASE = 20;
const HEADER_OFFSET = 64;
const BOTTOM_PADDING = 80;
const CANVAS_MARGIN = 24;
const BAND_GAP = 120;

const NO_FEEDER_EXTRA_GAP = 56;

type ConnectorLine = {
    x1: number; y1: number; x2: number; y2: number;
    x3: number; y3: number; x4: number; y4: number;
    isCompleted: boolean;
};

function computeBandLayout(rounds: RoundData[], yOffset: number) {
    const positions = new Map<string, { x: number; y: number }>();
    const lines: ConnectorLine[] = [];
    if (rounds.length === 0) return { positions, lines, maxBottom: yOffset };

    const BASE_PITCH = MATCH_HEIGHT + VERTICAL_SPACING_BASE;

    const baseRoundIndex =
        rounds[0]?.type === "play_in" && rounds.length > 1 ? 1 : 0;

    rounds.forEach((round, roundIndex) => {
        const x = roundIndex * (MATCH_WIDTH + ROUND_GAP);

        if (roundIndex === baseRoundIndex) {
            round.brackets.forEach((bracket, i) => {
                positions.set(bracket.id, { x, y: yOffset + HEADER_OFFSET + i * BASE_PITCH });
            });
        } else if (roundIndex > baseRoundIndex) {
            const previousRound = rounds[roundIndex - 1];
            round.brackets.forEach((bracket, i) => {
                const feedingBrackets = previousRound.brackets.filter(
                    b => b.next_bracket_id === bracket.id
                );
                if (feedingBrackets.length > 0) {
                    const avgY = feedingBrackets.reduce(
                        (sum, fb) => sum + (positions.get(fb.id)?.y ?? 0), 0
                    ) / feedingBrackets.length;
                    positions.set(bracket.id, { x, y: avgY });
                } else {

                    const prevSibling = i > 0 ? positions.get(round.brackets[i - 1].id) : undefined;
                    const y = prevSibling ? prevSibling.y + BASE_PITCH + NO_FEEDER_EXTRA_GAP : yOffset + HEADER_OFFSET;
                    positions.set(bracket.id, { x, y });
                }
            });
        } else {

            const nextRound = rounds[roundIndex + 1];
            round.brackets.forEach((bracket, i) => {
                const targetIndex = nextRound
                    ? nextRound.brackets.findIndex(nb => nb.id === bracket.next_bracket_id)
                    : -1;
                const y = targetIndex >= 0
                    ? yOffset + HEADER_OFFSET + targetIndex * BASE_PITCH
                    : yOffset + HEADER_OFFSET + i * BASE_PITCH * 2;
                positions.set(bracket.id, { x, y });
            });
        }
    });

    rounds.forEach((round, roundIndex) => {
        if (roundIndex === rounds.length - 1) return;
        const nextRound = rounds[roundIndex + 1];
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
                x1: startX, y1: startY,
                x2: midX, y2: startY,
                x3: midX, y3: endY,
                x4: endX, y4: endY,
                isCompleted: bracket.match.status === "completed",
            });
        });
    });

    let maxBottom = yOffset;
    positions.forEach((pos) => {
        const bottom = pos.y + MATCH_HEIGHT;
        if (bottom > maxBottom) maxBottom = bottom;
    });

    return { positions, lines, maxBottom };
}

export function PlayoffBracketDisplay({
    brackets,
    incomingMap,
    teams,
    matches,
    regionCode,
    seasonSlug,
    linkContext = "public",
    isSuperAdmin = false,
    onReadvanceMatch,
}: PlayoffBracketDisplayProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const teamsMap = useMemo(() => {
        return new Map(teams.map((team) => [team.id, team]));
    }, [teams]);

    const matchesMap = useMemo(() => {
        return new Map(matches.map((match) => [match.id, match]));
    }, [matches]);

    function slotLabel(
        slot: IncomingSource | undefined
    ): string | undefined {
        if(!slot) return undefined
        const code = matchesMap.get(slot.source)?.match_code;
        if(!code) return undefined;
        return `${slot.type} of ${code}`
    }

    const {upperRounds, lowerRounds, thirdPlaceMatch} = useMemo(() => {
        const bracketsWithMatches = brackets
            .filter((b) => matchesMap.has(b.match_id))
            .map((b) => ({
                ...b,
                match: matchesMap.get(b.match_id)!,
            }));

        const thirdPlace = bracketsWithMatches.find((b) => b.round === "third_place");

        const roundsMap = new Map<RoundType, BracketWithMatch[]>();
        bracketsWithMatches.forEach((bracket) => {
            if (bracket.round === "third_place") return;
            const round = bracket.round as RoundType;
            if (!roundsMap.has(round)) {
                roundsMap.set(round, []);
            }
            roundsMap.get(round)!.push(bracket);
        });

        const orderRounds = (order: RoundType[]): RoundData[] =>
            order.map((roundType) => {
                const roundBrackets = roundsMap.get(roundType);
                if (!roundBrackets || roundBrackets.length === 0) return null;
                return {
                    type: roundType,
                    label: ROUND_LABELS[roundType],
                    brackets: roundBrackets.sort(
                        (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)
                    ),
                };
            }).filter((r): r is RoundData => r !== null);

        return {
            upperRounds: orderRounds(UPPER_ROUND_ORDER),
            lowerRounds: orderRounds(LOWER_ROUND_ORDER),
            thirdPlaceMatch: thirdPlace || null,
        };
    }, [brackets, matchesMap]);

    const {matchPositions, connectorLines, thirdPlacePosition, lowerBandTop} = useMemo(() => {
        const upper = computeBandLayout(upperRounds, 0);

        const bandTop = lowerRounds.length > 0 ? upper.maxBottom + BAND_GAP : 0;
        const lower = lowerRounds.length > 0
            ? computeBandLayout(lowerRounds, bandTop)
            : {positions: new Map<string, {x: number; y: number}>(), lines: [] as ConnectorLine[], maxBottom: bandTop};

        const positions = new Map<string, {x: number; y: number}>([...upper.positions, ...lower.positions]);
        const lines = [...upper.lines, ...lower.lines];

        let thirdPlacePos = null;
        if (thirdPlaceMatch) {
            const semifinalRound = upperRounds.find(r => r.type === "semifinal");
            const finalRound = upperRounds.find(r => r.type === "final");

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

        return {
            matchPositions: positions,
            connectorLines: lines,
            thirdPlacePosition: thirdPlacePos,
            lowerBandTop: lowerRounds.length > 0 ? bandTop : null,
        };
    }, [upperRounds, lowerRounds, thirdPlaceMatch]);

    const {totalHeight, totalWidth} = useMemo(() => {
        if (upperRounds.length === 0 && lowerRounds.length === 0) return {totalHeight: 0, totalWidth: 0};

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
        const columns = Math.max(upperRounds.length, lowerRounds.length);
        const width = columns * (MATCH_WIDTH + ROUND_GAP);

        return {totalHeight: height, totalWidth: width};
    }, [upperRounds, lowerRounds, matchPositions, thirdPlacePosition]);

    const buildHref = useCallback((match: Match, homeName?: string | null, awayName?: string | null): string | null => {
        if (linkContext === "admin") return buildAdminMatchHref(match.id);
        return buildPublicMatchHref({
            matchCode: match.match_code,
            homeTeamName: homeName,
            awayTeamName: awayName,
            regionCode,
            seasonSlug,
        });
    }, [linkContext, regionCode, seasonSlug]);

    const canReadvanceMatch = useCallback((match: Match): boolean =>
        linkContext === "admin"
        && isSuperAdmin
        && !!onReadvanceMatch
        && match.status === "completed"
        && !!match.home_team_id
        && !!match.away_team_id,
    [linkContext, isSuperAdmin, onReadvanceMatch]);

    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        if (typeof document === "undefined") return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current?.requestFullscreen();
        }
    }, []);

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOrigin = useRef({x: 0, scrollLeft: 0});
    const didDrag = useRef(false);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        const el = scrollRef.current;
        if (!el || e.button !== 0) return;
        setIsDragging(true);
        didDrag.current = false;
        dragOrigin.current = {x: e.pageX, scrollLeft: el.scrollLeft};
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: MouseEvent) => {
            const el = scrollRef.current;
            if (!el) return;
            const dx = e.pageX - dragOrigin.current.x;
            if (Math.abs(dx) > 4) didDrag.current = true;
            el.scrollLeft = dragOrigin.current.scrollLeft - dx;
        };
        const onUp = () => setIsDragging(false);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [isDragging]);

    const handleClickCapture = useCallback((e: React.MouseEvent) => {
        if (didDrag.current) {
            e.preventDefault();
            e.stopPropagation();
            didDrag.current = false;
        }
    }, []);

    const renderRoundColumn = (round: RoundData, roundIndex: number, bandTop: number) => (
        <div key={round.type}>
            <div
                className="absolute"
                style={{
                    left: roundIndex * (MATCH_WIDTH + ROUND_GAP),
                    top: bandTop,
                    width: MATCH_WIDTH,
                }}
            >
                <div className="mb-6 pb-3 border-b-2 border-border">
                    <h3 className="text-base font-bold uppercase tracking-wider text-foreground">
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
                            homeSource={slotLabel(incomingMap.get(bracket.id)?.home)}
                            awaySource={slotLabel(incomingMap.get(bracket.id)?.away)}
                            regionCode={regionCode}
                            href={buildHref(bracket.match, homeTeam?.name, awayTeam?.name)}
                            canReadvance={canReadvanceMatch(bracket.match)}
                            onReadvance={onReadvanceMatch ? () => onReadvanceMatch(bracket.match.id) : undefined}
                        />
                        {bracket.match.match_code === "BR" && (
                            <div className="mt-1 text-center text-[10px] italic text-muted-foreground/70">
                                if necessary
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    if (brackets.length === 0) {
        return <PlayoffBracketLoading />;
    }

    if (upperRounds.length === 0 && lowerRounds.length === 0 && !thirdPlaceMatch) {
        return (
            <div className="panel p-12">
                <p className="text-sm text-muted-foreground text-center">
                    No playoff bracket data available
                </p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative panel overflow-hidden rounded-sm",
                isFullscreen && "rounded-none bg-background"
            )}
        >
            <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="absolute top-3 right-3 z-20 rounded-sm h-9 w-9 p-0 bg-background/95 backdrop-blur-sm shadow-md"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>

            <div
                ref={scrollRef}
                onMouseDown={handleDragStart}
                onClickCapture={handleClickCapture}
                className={cn(
                    "overflow-x-auto bg-muted/30",
                    isFullscreen ? "overflow-y-auto" : "overflow-y-hidden",
                    isDragging ? "cursor-grabbing select-none" : "cursor-grab"
                )}
                style={isFullscreen
                    ? {height: "100vh"}
                    : {height: totalHeight + CANVAS_MARGIN * 2}}
            >
                    <div className="relative" style={{width: totalWidth + CANVAS_MARGIN * 2, height: totalHeight + CANVAS_MARGIN * 2}}>
                      <div className="absolute" style={{left: CANVAS_MARGIN, top: CANVAS_MARGIN, width: totalWidth, height: totalHeight}}>
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
                                        stroke="hsl(var(--muted-foreground))"
                                        strokeWidth={line.isCompleted ? 2.5 : 1.5}
                                        strokeDasharray={line.isCompleted ? "0" : "4,4"}
                                        strokeOpacity={line.isCompleted ? 0.55 : 0.4}
                                    />
                                    <line
                                        x1={line.x2}
                                        y1={line.y2}
                                        x2={line.x3}
                                        y2={line.y3}
                                        stroke="hsl(var(--muted-foreground))"
                                        strokeWidth={line.isCompleted ? 2.5 : 1.5}
                                        strokeDasharray={line.isCompleted ? "0" : "4,4"}
                                        strokeOpacity={line.isCompleted ? 0.55 : 0.4}
                                    />
                                    <line
                                        x1={line.x3}
                                        y1={line.y3}
                                        x2={line.x4}
                                        y2={line.y4}
                                        stroke="hsl(var(--muted-foreground))"
                                        strokeWidth={line.isCompleted ? 2.5 : 1.5}
                                        strokeDasharray={line.isCompleted ? "0" : "4,4"}
                                        strokeOpacity={line.isCompleted ? 0.55 : 0.4}
                                    />
                                </g>
                            ))}
                        </svg>

                        {upperRounds.map((round, roundIndex) => renderRoundColumn(round, roundIndex, 0))}

                        {lowerBandTop != null && (
                            <div
                                className="absolute border-t border-dashed border-border"
                                style={{left: 0, top: lowerBandTop - BAND_GAP / 2, width: totalWidth}}
                            />
                        )}

                        {lowerBandTop != null &&
                            lowerRounds.map((round, roundIndex) => renderRoundColumn(round, roundIndex, lowerBandTop))}

                        {thirdPlaceMatch && thirdPlacePosition && (
                            <div
                                className="absolute z-10"
                                style={{
                                    left: thirdPlacePosition.x,
                                    top: thirdPlacePosition.y,
                                    width: MATCH_WIDTH,
                                }}
                            >
                                <div className="mb-3 pb-2 border-b border-secondary/30">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-secondary">
                                        {ROUND_LABELS.third_place}
                                    </h3>
                                </div>
                                {(() => {
                                    const tpHome = thirdPlaceMatch.match.home_team_id
                                        ? teamsMap.get(thirdPlaceMatch.match.home_team_id)
                                        : undefined;
                                    const tpAway = thirdPlaceMatch.match.away_team_id
                                        ? teamsMap.get(thirdPlaceMatch.match.away_team_id)
                                        : undefined;
                                    return (
                                        <MatchBracketCard
                                            bracket={thirdPlaceMatch}
                                            match={thirdPlaceMatch.match}
                                            homeTeam={tpHome}
                                            awayTeam={tpAway}
                                            homeSource={slotLabel(incomingMap.get(thirdPlaceMatch.id)?.home)}
                                            awaySource={slotLabel(incomingMap.get(thirdPlaceMatch.id)?.away)}
                                            regionCode={regionCode}
                                            href={buildHref(thirdPlaceMatch.match, tpHome?.name, tpAway?.name)}
                                            canReadvance={canReadvanceMatch(thirdPlaceMatch.match)}
                                            onReadvance={onReadvanceMatch ? () => onReadvanceMatch(thirdPlaceMatch.match.id) : undefined}
                                        />
                                    );
                                })()}
                            </div>
                        )}
                      </div>
                    </div>
                </div>
        </div>
    );
}
