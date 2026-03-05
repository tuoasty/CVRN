"use client";

import React, { useEffect, useState } from "react";
import { PlayoffBracket, Match } from "@/shared/types/db";
import { useMatchesStore } from "@/app/stores/matchStore";

type PlayoffBracketDisplayProps = {
    brackets: PlayoffBracket[];
    seasonId: string;
};

type RoundMatches = {
    play_in: PlayoffBracket[];
    round_of_16: PlayoffBracket[];
    quarterfinal: PlayoffBracket[];
    semifinal: PlayoffBracket[];
    final: PlayoffBracket[];
    third_place: PlayoffBracket[];
};

export function PlayoffBracketDisplay({ brackets, seasonId }: PlayoffBracketDisplayProps) {
    const { fetchMatchesForWeek, matchesForWeekCache } = useMatchesStore();
    const [matches, setMatches] = useState<Match[]>([]);

    useEffect(() => {
        const fetchAllMatches = async () => {
            const weeks = [1, 2, 3, 4, 5];
            for (const week of weeks) {
                await fetchMatchesForWeek(seasonId, week);
            }

            const allMatches: Match[] = [];
            weeks.forEach(week => {
                const cached = matchesForWeekCache.get(`${seasonId}-${week}`);
                if (cached) {
                    allMatches.push(...cached.data);
                }
            });
            setMatches(allMatches);
        };

        fetchAllMatches();
    }, [seasonId, fetchMatchesForWeek]);

    const roundMatches: RoundMatches = {
        play_in: brackets.filter(b => b.round === "play_in"),
        round_of_16: brackets.filter(b => b.round === "round_of_16"),
        quarterfinal: brackets.filter(b => b.round === "quarterfinal"),
        semifinal: brackets.filter(b => b.round === "semifinal"),
        final: brackets.filter(b => b.round === "final"),
        third_place: brackets.filter(b => b.round === "third_place"),
    };

    const getMatchById = (matchId: string) => matches.find(m => m.id === matchId);

    const renderRound = (title: string, roundBrackets: PlayoffBracket[]) => {
        if (roundBrackets.length === 0) return null;

        return (
            <div className="flex-1 min-w-[300px]">
                <div className="bg-primary text-primary-foreground text-center py-3 px-4 font-bold text-lg mb-4">
                    {title}
                </div>
                <div className="space-y-4">
                    {roundBrackets.map(bracket => {
                        const match = getMatchById(bracket.match_id);
                        if (!match) return null;

                        return (
                            <div key={bracket.id} className="border border-border bg-card">
                                <div className="border-b border-border p-3 space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium">
                                            {bracket.seed_home ? `#${bracket.seed_home}` : "TBD"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">Set 1</span>
                                        <span className="text-xs text-muted-foreground">Set 2</span>
                                        <span className="text-xs text-muted-foreground">Set 3</span>
                                    </div>
                                </div>
                                <div className="border-b border-border p-3 bg-muted/20">
                                    <div className="text-xs text-muted-foreground mb-1">
                                        REFS:
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        MEDIA:
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="panel p-6">
            <div className="flex gap-6 overflow-x-auto">
                {renderRound("PLAY-INS", roundMatches.play_in)}
                {renderRound("Round of 16", roundMatches.round_of_16)}
                {renderRound("Quarter Finals", roundMatches.quarterfinal)}
                {renderRound("Semi Finals", roundMatches.semifinal)}
                <div className="flex flex-col gap-6">
                    {renderRound("Finals", roundMatches.final)}
                    {renderRound("3rd Place", roundMatches.third_place)}
                </div>
            </div>
        </div>
    );
}