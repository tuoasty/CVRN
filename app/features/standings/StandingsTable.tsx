"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { StandingWithInfo } from "@/server/domains/standing";
import Image from "next/image";
import Link from "next/link";
import React, { useMemo } from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { getLogoClassName } from "@/app/lib/logoClass";
import { buildPublicTeamHref } from "@/app/utils/matchDetailHref";

type StandingsTableProps = {
    standings: StandingWithInfo[];
    isLoading?: boolean;
    qualifiedTeams?: number;
    playinTeams?: number;
    regionCode?: string;
    seasonSlug?: string;
    standingMethod?: "lvr" | "points";
};

export function StandingsTable({ standings, isLoading, qualifiedTeams = 12, playinTeams = 8, regionCode, seasonSlug, standingMethod = "lvr" }: StandingsTableProps) {
    const sortedStandings = useMemo(() => {
        if (standings.length === 0) return [];

        return [...standings].sort((a, b) => {
            const winsA = a.wins || 0;
            const winsB = b.wins || 0;
            if (winsB !== winsA) return winsB - winsA;

            const lossesA = a.losses || 0;
            const lossesB = b.losses || 0;
            if (lossesA !== lossesB) return lossesA - lossesB;

            if (standingMethod === "points") {
                const ptsA = a.total_points || 0;
                const ptsB = b.total_points || 0;
                if (ptsB !== ptsA) return ptsB - ptsA;
                return (b.sets_won || 0) - (a.sets_won || 0);
            }

            const setsWonA = a.sets_won || 0;
            const setsWonB = b.sets_won || 0;
            if (setsWonB !== setsWonA) return setsWonB - setsWonA;

            return (b.total_lvr || 0) - (a.total_lvr || 0);
        });
    }, [standings, standingMethod]);

    const getQualificationStatus = (rank: number) => {
        if (rank <= qualifiedTeams) return "qualified";
        if (rank <= qualifiedTeams + playinTeams) return "playin";
        return "eliminated";
    };

    const getRowClassName = (rank: number) => {
        const status = getQualificationStatus(rank);
        const baseClasses = "transition-colors duration-200 hover:bg-muted/40";

        if (status === "eliminated") {
            return `${baseClasses} text-muted-foreground`;
        }
        return baseClasses;
    };

    const showPlayinDivider = (rank: number) => rank === qualifiedTeams && sortedStandings.length > qualifiedTeams;
    const showEliminatedDivider = (rank: number) => rank === qualifiedTeams + playinTeams && sortedStandings.length > qualifiedTeams + playinTeams;

    const ZoneDivider = ({ label, variant }: { label: string; variant: "playin" | "eliminated" }) => {
        const rule = variant === "playin" ? "bg-secondary/40" : "bg-border";
        return (
            <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                    <div className="flex items-center gap-3 px-1 py-1.5">
                        <div className={`h-px flex-1 ${rule}`}></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-muted-foreground">{label}</span>
                        <div className={`h-px flex-1 ${rule}`}></div>
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) {
            return <span className="text-lg font-bold text-amber-500 tabular-nums">{rank}</span>;
        }
        if (rank === 2) {
            return <span className="text-lg font-bold text-slate-400 tabular-nums">{rank}</span>;
        }
        if (rank === 3) {
            return <span className="text-lg font-bold text-orange-500 tabular-nums">{rank}</span>;
        }
        return <span className="text-lg font-bold text-foreground tabular-nums">{rank}</span>;
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="panel p-4">
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
                                <TableHead className="hidden sm:table-cell text-center">WIN %</TableHead>
                                <TableHead className="hidden sm:table-cell text-center">SETS</TableHead>
                                <TableHead className="text-center">LVR</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(8)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-center py-4">
                                        <Skeleton className="h-6 w-8 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded shrink-0" />
                                            <Skeleton className="h-5 w-32 rounded-sm" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <Skeleton className="h-5 w-12 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-center py-4">
                                        <Skeleton className="h-5 w-14 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-center py-4">
                                        <Skeleton className="h-5 w-12 rounded-sm mx-auto" />
                                    </TableCell>
                                    <TableCell className="text-center py-4">
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
            <div className="panel p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4 sm:gap-6 text-sm flex-wrap">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-primary/60 border-2 border-primary"></div>
                            <span className="text-muted-foreground font-medium">Playoffs ({qualifiedTeams})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-secondary/60 border-2 border-secondary"></div>
                            <span className="text-muted-foreground font-medium">Play-In ({playinTeams})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-muted border-2 border-border"></div>
                            <span className="text-muted-foreground font-medium">Eliminated</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-sm border border-border overflow-x-auto shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-2 border-border bg-muted/30">
                            <TableHead className="w-20 text-center text-[11px] uppercase tracking-wider font-semibold">Rank</TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Team</TableHead>
                            <TableHead className="text-center text-[11px] uppercase tracking-wider font-semibold">Record</TableHead>
                            <TableHead className="hidden sm:table-cell text-center text-[11px] uppercase tracking-wider font-semibold">Win %</TableHead>
                            <TableHead className="hidden sm:table-cell text-center text-[11px] uppercase tracking-wider font-semibold">Sets</TableHead>
                            <TableHead className="text-center text-[11px] uppercase tracking-wider font-semibold">{standingMethod === "points" ? "Points" : "LVR"}</TableHead>
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
                            const teamHref = buildPublicTeamHref({regionCode, seasonSlug, teamSlug: standing.team_slug});

                            return (
                                <React.Fragment key={standing.team_id}>
                                <TableRow
                                    className={getRowClassName(rank)}
                                >
                                    <TableCell className="text-center py-4">
                                        {getRankBadge(rank)}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {teamHref ? (
                                            <Link href={teamHref} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                {standing.team_logo_url && (
                                                    <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">
                                                        <Image
                                                            src={standing.team_logo_url}
                                                            alt={standing.team_name || "Team"}
                                                            width={44}
                                                            height={44}
                                                            className={`w-full h-full ${getLogoClassName(standing.team_logo_bg_removed ?? false)}`}
                                                        />
                                                    </div>
                                                )}
                                                <span className="font-semibold text-[0.95rem] tracking-tight">{standing.team_name}</span>
                                            </Link>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                {standing.team_logo_url && (
                                                    <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">
                                                        <Image
                                                            src={standing.team_logo_url}
                                                            alt={standing.team_name || "Team"}
                                                            width={44}
                                                            height={44}
                                                            className={`w-full h-full ${getLogoClassName(standing.team_logo_bg_removed ?? false)}`}
                                                        />
                                                    </div>
                                                )}
                                                <span className="font-semibold text-[0.95rem] tracking-tight">{standing.team_name}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-sm tabular-nums py-4">
                                        {wins}-{losses}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-center text-sm text-muted-foreground tabular-nums py-4">
                                        {winPct.toFixed(1)}%
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-center text-sm text-muted-foreground tabular-nums py-4">
                                        {standing.sets_won || 0}-{standing.sets_lost || 0}
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        {standingMethod === "points" ? (
                                            <span className="font-bold text-base tabular-nums text-primary">
                                                {(standing.total_points || 0).toFixed(1)}
                                            </span>
                                        ) : (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className={`font-bold text-base tabular-nums ${displayLvr >= 100 ? 'text-primary' : 'text-destructive'}`}>
                                                    {displayLvr.toFixed(1)}
                                                </span>
                                                <span className={`text-[10px] font-semibold tabular-nums ${lvrDiff >= 0 ? 'text-primary/70' : 'text-destructive/70'}`}>
                                                    {lvrDiff >= 0 ? '+' : ''}{lvrDiff.toFixed(1)}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                                {showPlayinDivider(rank) && <ZoneDivider label="Play-Ins" variant="playin" />}
                                {showEliminatedDivider(rank) && <ZoneDivider label="Eliminated" variant="eliminated" />}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <div>
                    Showing {sortedStandings.length} teams • Top {qualifiedTeams} qualify for playoffs, next {playinTeams} qualify for play-ins
                </div>
            </div>
        </div>
    );
}