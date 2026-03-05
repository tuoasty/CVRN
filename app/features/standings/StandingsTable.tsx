"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { StandingWithInfo } from "@/server/dto/standing.dto";
import Image from "next/image";
import { useMemo, useState } from "react";

type StandingsTableProps = {
    standings: StandingWithInfo[];
    isLoading?: boolean;
};

type SortMode = "wins" | "lvr";

export function StandingsTable({ standings, isLoading }: StandingsTableProps) {
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
        if (rank <= 2) return "qualified";
        if (rank <= 3) return "playin";
        return "eliminated";
    };

    const getRowClassName = (rank: number) => {
        const status = getQualificationStatus(rank);

        if (status === "qualified") {
            return "bg-primary/5 border-l-4 border-l-primary/40 hover:bg-primary/10";
        }
        if (status === "playin") {
            return "bg-secondary/5 border-l-4 border-l-secondary/40 hover:bg-secondary/10";
        }
        return "bg-destructive/5 border-l-4 border-l-destructive/30 hover:bg-destructive/10";
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) {
            return (
                <span className="font-bold text-lg text-yellow-500">
                {rank}
            </span>
            );
        }
        if (rank === 2) {
            return (
                <span className="font-bold text-lg text-slate-400">
                {rank}
            </span>
            );
        }
        if (rank === 3) {
            return (
                <span className="font-bold text-lg text-orange-600">
                {rank}
            </span>
            );
        }
        return <span className="font-semibold text-lg text-muted-foreground">{rank}</span>;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-sm text-muted-foreground">Loading standings...</div>
            </div>
        );
    }

    if (standings.length === 0) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-sm text-muted-foreground">No standings data available</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-primary/40"></div>
                        <span className="text-muted-foreground">Playoffs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-secondary/40"></div>
                        <span className="text-muted-foreground">Play-In</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-destructive/30"></div>
                        <span className="text-muted-foreground">Eliminated</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-muted/30 rounded-sm p-1">
                    <button
                        onClick={() => setSortMode("wins")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                            sortMode === "wins"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        By Wins
                    </button>
                    <button
                        onClick={() => setSortMode("lvr")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                            sortMode === "lvr"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        By LVR
                    </button>
                </div>
            </div>

            <div className="rounded-sm border border-border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-24 text-center">RANK</TableHead>
                            <TableHead>TEAM</TableHead>
                            <TableHead className="text-center">RECORD</TableHead>
                            <TableHead className="text-center">WIN %</TableHead>
                            <TableHead className="text-center">SETS</TableHead>
                            <TableHead className="text-center">LVR</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedStandings.map((standing, index) => {
                            const rank = index + 1;
                            const wins = standing.wins || 0;
                            const losses = standing.losses || 0;
                            const totalGames = wins + losses;
                            const winPct = totalGames > 0 ? (wins / totalGames) * 100 : 0;
                            const displayLvr = 100 + (standing.total_lvr || 0);

                            return (
                                <TableRow
                                    key={standing.team_id}
                                    className={getRowClassName(rank)}
                                >
                                    <TableCell className="text-center">
                                        {getRankBadge(rank)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3 h-12">
                                            {standing.team_logo_url && (
                                                <div className="w-10 h-10 flex-shrink-0">
                                                    <Image
                                                        src={standing.team_logo_url}
                                                        alt={standing.team_name || "Team"}
                                                        width={40}
                                                        height={40}
                                                        className="rounded object-contain w-full h-full"
                                                    />
                                                </div>
                                            )}
                                            <span className="font-semibold">{standing.team_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-medium">
                                        {wins}-{losses}
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground">
                                        {winPct.toFixed(1)}%
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground">
                                        {standing.sets_won || 0}-{standing.sets_lost || 0}
                                    </TableCell>
                                    <TableCell className="text-center">
                <span className={`font-bold ${displayLvr >= 100 ? 'text-primary' : 'text-destructive'}`}>
                    {displayLvr.toFixed(1)}
                </span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="text-xs text-muted-foreground">
                {/* TODO: Update qualification thresholds based on playoff configuration */}
                Currently showing: Top 2 qualify for playoffs, 3 qualify for play-ins
            </div>
        </div>
    );
}