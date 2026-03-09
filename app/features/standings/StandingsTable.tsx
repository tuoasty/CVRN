"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { StandingWithInfo } from "@/server/dto/standing.dto";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Trophy } from "lucide-react";

type StandingsTableProps = {
    standings: StandingWithInfo[];
    isLoading?: boolean;
    qualifiedTeams?: number;
    playinTeams?: number;
};

type SortMode = "wins" | "lvr";

export function StandingsTable({ standings, isLoading, qualifiedTeams = 12, playinTeams = 8 }: StandingsTableProps) {
    const [sortMode, setSortMode] = useState<SortMode>("lvr");

    const sortedStandings = useMemo(() => {
        if (standings.length === 0) return [];

        const sorted = [...standings];

        if (sortMode === "wins") {
            sorted.sort((a, b) => {
                const winsA = a.wins || 0;
                const winsB = b.wins || 0;
                if (winsB !== winsA) return winsB - winsA;

                const lossesA = a.losses || 0;
                const lossesB = b.losses || 0;
                if (lossesA !== lossesB) return lossesA - lossesB;

                const setsWonA = a.sets_won || 0;
                const setsWonB = b.sets_won || 0;
                if (setsWonB !== setsWonA) return setsWonB - setsWonA;

                const setsLostA = a.sets_lost || 0;
                const setsLostB = b.sets_lost || 0;
                if (setsLostA !== setsLostB) return setsLostA - setsLostB;

                const lvrA = a.total_lvr || 0;
                const lvrB = b.total_lvr || 0;
                return lvrB - lvrA;
            });
        } else {
            sorted.sort((a, b) => {
                const lvrA = a.total_lvr || 0;
                const lvrB = b.total_lvr || 0;
                return lvrB - lvrA;
            });
        }

        return sorted;
    }, [standings, sortMode]);

    const getQualificationStatus = (rank: number) => {
        if (rank <= qualifiedTeams) return "qualified";
        if (rank <= qualifiedTeams + playinTeams) return "playin";
        return "eliminated";
    };

    const getRowClassName = (rank: number) => {
        const status = getQualificationStatus(rank);
        const baseClasses = "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5";

        if (rank === 1) {
            return `${baseClasses} bg-gradient-to-r from-primary/20 via-primary/10 to-transparent !border-l-4 !border-l-primary`;
        }
        if (rank <= 3) {
            return `${baseClasses} bg-gradient-to-r from-primary/10 to-transparent !border-l-4 !border-l-primary/70`;
        }
        if (status === "qualified") {
            return `${baseClasses} !border-l-4 !border-l-primary/40 hover:bg-primary/5`;
        }
        if (status === "playin") {
            return `${baseClasses} !border-l-4 !border-l-secondary/40 hover:bg-secondary/5`;
        }
        return `${baseClasses} !border-l-4 !border-l-destructive/20 hover:bg-muted/30`;
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) {
            return (
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg">
                    <span className="text-base font-bold text-yellow-950 tabular-nums">{rank}</span>
                </div>
            );
        }
        if (rank === 2) {
            return (
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-gradient-to-br from-slate-300 to-slate-500 shadow-md">
                    <span className="text-base font-bold text-slate-800 tabular-nums">{rank}</span>
                </div>
            );
        }
        if (rank === 3) {
            return (
                <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-gradient-to-br from-orange-400 to-orange-600 shadow-md">
                    <span className="text-base font-bold text-orange-950 tabular-nums">{rank}</span>
                </div>
            );
        }
        return (
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-muted border border-border">
                <span className="text-base font-bold text-foreground tabular-nums">{rank}</span>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="panel p-4 border-l-4 border-l-primary/30">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-64 rounded-sm" />
                        <Skeleton className="h-9 w-40 rounded-sm" />
                    </div>
                </div>
                <div className="rounded-sm border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-2 border-border">
                                <TableHead className="w-20 text-center">RANK</TableHead>
                                <TableHead>TEAM</TableHead>
                                <TableHead className="text-center">RECORD</TableHead>
                                <TableHead className="text-center">WIN %</TableHead>
                                <TableHead className="text-center">SETS</TableHead>
                                <TableHead className="text-center">LVR</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(8)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-10 w-10 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded" />
                                            <Skeleton className="h-5 w-32 rounded-sm" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-5 w-12 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-5 w-14 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-5 w-12 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-5 w-16 rounded-sm mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    if (standings.length === 0) {
        return (
            <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                <div className="text-center space-y-3">
                    <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground font-medium">
                        No standings data available
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="panel p-4 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-primary/60 border-2 border-primary"></div>
                            <span className="text-muted-foreground font-medium">Playoffs ({qualifiedTeams})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-secondary/60 border-2 border-secondary"></div>
                            <span className="text-muted-foreground font-medium">Play-In ({playinTeams})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-destructive/30 border-2 border-destructive/50"></div>
                            <span className="text-muted-foreground font-medium">Eliminated</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-muted/50 rounded-sm p-1 border border-border">
                        <button
                            onClick={() => setSortMode("wins")}
                            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-sm transition-all duration-200 ${
                                sortMode === "wins"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            By Wins
                        </button>
                        <button
                            onClick={() => setSortMode("lvr")}
                            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-sm transition-all duration-200 ${
                                sortMode === "lvr"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            By LVR
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-sm border border-border overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-2 border-border bg-muted/30">
                            <TableHead className="w-20 text-center text-[10px] uppercase tracking-wider font-semibold">Rank</TableHead>
                            <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Team</TableHead>
                            <TableHead className="text-center text-[10px] uppercase tracking-wider font-semibold">Record</TableHead>
                            <TableHead className="text-center text-[10px] uppercase tracking-wider font-semibold">Win %</TableHead>
                            <TableHead className="text-center text-[10px] uppercase tracking-wider font-semibold">Sets</TableHead>
                            <TableHead className="text-center text-[10px] uppercase tracking-wider font-semibold">LVR</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedStandings.map((standing, index) => {
                            const rank = index + 1;
                            const wins = standing.wins || 0;
                            const losses = standing.losses || 0;
                            const totalGames = wins + losses;
                            const winPct = totalGames > 0 ? (wins / totalGames) * 100 : 0;
                            const displayLvr = standing.total_lvr || 0;
                            const lvrDiff = (standing.total_lvr || 0) - (standing.starting_lvr ?? 100);

                            return (
                                <TableRow
                                    key={standing.team_id}
                                    className={getRowClassName(rank)}
                                >
                                    <TableCell className="text-center py-4">
                                        {getRankBadge(rank)}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            {standing.team_logo_url && (
                                                <div className="w-10 h-10 flex-shrink-0 rounded border border-border bg-muted/30 p-1">
                                                    <Image
                                                        src={standing.team_logo_url}
                                                        alt={standing.team_name || "Team"}
                                                        width={40}
                                                        height={40}
                                                        className="rounded object-contain w-full h-full mix-blend-multiply dark:mix-blend-screen"
                                                    />
                                                </div>
                                            )}
                                            <span className="font-semibold text-sm">{standing.team_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-sm tabular-nums py-4">
                                        {wins}-{losses}
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums py-4">
                                        {winPct.toFixed(1)}%
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums py-4">
                                        {standing.sets_won || 0}-{standing.sets_lost || 0}
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className={`font-bold text-base tabular-nums ${displayLvr >= 100 ? 'text-primary' : 'text-destructive'}`}>
                                                {displayLvr.toFixed(1)}
                                            </span>
                                            <span className={`text-[10px] font-semibold tabular-nums ${lvrDiff >= 0 ? 'text-primary/70' : 'text-destructive/70'}`}>
                                                {lvrDiff >= 0 ? '+' : ''}{lvrDiff.toFixed(1)}
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <div>
                    Showing {sortedStandings.length} teams • Top {qualifiedTeams} qualify for playoffs, next {playinTeams} qualify for play-ins
                </div>
                <div>
                    Sorted by: <span className="font-semibold text-foreground">{sortMode === "wins" ? "Wins" : "LVR"}</span>
                </div>
            </div>
        </div>
    );
}