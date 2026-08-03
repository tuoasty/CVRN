"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { StandingWithInfo } from "@/server/domains/standing";
import { StandingMethod } from "@/shared/types/standing";
import Image from "next/image";
import Link from "next/link";
import React, { useMemo } from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Trophy, Info } from "lucide-react";
import { getLogoClassName } from "@/app/lib/logoClass";
import { buildPublicTeamHref } from "@/app/utils/matchDetailHref";

type StandingsTableProps = {
    standings: StandingWithInfo[];
    isLoading?: boolean;
    qualifiedTeams?: number;
    playinTeams?: number;
    regionCode?: string;
    seasonSlug?: string;
    standingMethod?: StandingMethod;
};

export function StandingsTable({ standings, isLoading, qualifiedTeams = 12, playinTeams = 8, regionCode, seasonSlug, standingMethod = "lvr" }: StandingsTableProps) {
    const isPointsMethod = standingMethod === "points" || standingMethod === "points_without_bonus";

    const sortedStandings = useMemo(() => {
        if (standings.length === 0) return [];

        return [...standings].sort(
            (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
        );
    }, [standings]);

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

    const showPlayinDivider = (rank: number) => playinTeams > 0 && rank === qualifiedTeams && sortedStandings.length > qualifiedTeams;
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

    const MetricInfo = () => {
        const isPoints = standingMethod === "points";
        const isPointsNoBonus = standingMethod === "points_without_bonus";
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label={isPointsMethod ? "What is Points?" : "What is LVR?"}
                        className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none transition-colors"
                    >
                        <Info className="h-3.5 w-3.5" />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-3 text-left normal-case tracking-normal">
                    {isPoints ? (
                        <div className="space-y-2.5">
                            <p className="text-sm font-semibold text-foreground">Points <span className="font-normal text-muted-foreground">· per match</span></p>
                            <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex items-baseline justify-between gap-4">
                                    <span>Match win</span><span className="font-mono text-foreground">+2.0</span>
                                </div>
                                <div className="flex items-baseline justify-between gap-4">
                                    <span>Each set won</span><span className="font-mono text-foreground">+0.5</span>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                <p className="mb-1">Winner point-margin bonus</p>
                                <div className="grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-foreground">
                                    <span>≥30 +5</span><span>≥25 +4</span><span>≥20 +3</span>
                                    <span>≥15 +2</span><span>≥10 +1</span><span>≥5 +0.5</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Forfeit win: <span className="font-mono text-foreground">2 + 0.5·sets + 1</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                                Rank: Wins → Points → Set Wins → fewer Losses
                            </p>
                        </div>
                    ) : isPointsNoBonus ? (
                        <div className="space-y-2.5">
                            <p className="text-sm font-semibold text-foreground">Points <span className="font-normal text-muted-foreground">· per match</span></p>
                            <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex items-baseline justify-between gap-4">
                                    <span>Win 2–0</span><span className="font-mono text-foreground">2.0</span>
                                </div>
                                <div className="flex items-baseline justify-between gap-4">
                                    <span>Win 2–1</span><span className="font-mono text-foreground">1.5</span>
                                </div>
                                <div className="flex items-baseline justify-between gap-4">
                                    <span>Loss 1–2 <span className="text-muted-foreground/60">(set won)</span></span><span className="font-mono text-foreground">0.5</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Forfeit win: <span className="font-mono text-foreground">1.0</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                                Rank: Points → last match point diff
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            <p className="text-sm font-semibold text-foreground">LVR <span className="font-normal text-muted-foreground">· per match</span></p>
                            <p className="text-xs text-muted-foreground">
                                Starts at <span className="font-mono text-foreground">100.0</span>. Each match, winner <span className="text-foreground">+</span> / loser <span className="text-foreground">−</span>:
                            </p>
                            <p className="font-mono text-[11px] text-foreground bg-muted rounded-sm px-2 py-2 leading-relaxed">
                                10 × (0.7·(setDiff/2) + 0.3·(pointDiff/50))
                            </p>
                            <div className="text-[11px] text-muted-foreground space-y-0.5">
                                <div><span className="font-mono text-foreground">setDiff</span> = set margin, <span className="font-mono text-foreground">pointDiff</span> = total-point margin</div>
                                <div>Forfeit: win <span className="font-mono text-foreground">+5</span>, loss <span className="font-mono text-foreground">−10</span></div>
                            </div>
                            <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                                Rank: LVR
                            </p>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
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
                <div className="rounded-sm border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-2 border-border bg-muted/30">
                                <TableHead className="w-20 text-center text-[11px] uppercase tracking-wider font-semibold">Rank</TableHead>
                                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Team</TableHead>
                                <TableHead className="text-center text-[11px] uppercase tracking-wider font-semibold">Record</TableHead>
                                <TableHead className="hidden sm:table-cell text-center text-[11px] uppercase tracking-wider font-semibold">Win %</TableHead>
                                <TableHead className="hidden sm:table-cell text-center text-[11px] uppercase tracking-wider font-semibold">Sets</TableHead>
                                <TableHead className="text-center text-[11px] uppercase tracking-wider font-semibold">{isPointsMethod ? "Points" : "LVR"}</TableHead>
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
                                            <Skeleton className="h-11 w-11 rounded shrink-0" />
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
            <div className="rounded-sm border border-border overflow-x-auto shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-2 border-border bg-muted/30">
                            <TableHead className="w-20 text-center text-[11px] uppercase tracking-wider font-semibold">Rank</TableHead>
                            <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Team</TableHead>
                            <TableHead className="text-center text-[11px] uppercase tracking-wider font-semibold">Record</TableHead>
                            <TableHead className="hidden sm:table-cell text-center text-[11px] uppercase tracking-wider font-semibold">Win %</TableHead>
                            <TableHead className="hidden sm:table-cell text-center text-[11px] uppercase tracking-wider font-semibold">Sets</TableHead>
                            <TableHead className="text-center text-[11px] uppercase tracking-wider font-semibold">
                                <span className="inline-flex items-center justify-center gap-1">
                                    {isPointsMethod ? "Points" : "LVR"}
                                    <MetricInfo />
                                </span>
                            </TableHead>
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
                                            <Link href={teamHref} prefetch={false} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
                                        {isPointsMethod ? (
                                            <span className="font-bold text-base tabular-nums text-primary">
                                                {((standing.total_points || 0) + (standingMethod === "points" ? (standing.total_bonus || 0) : 0)).toFixed(1)}
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
                    Showing {sortedStandings.length} teams • Top {qualifiedTeams} qualify for playoffs{playinTeams > 0 ? `, next ${playinTeams} qualify for play-ins` : ""}
                </div>
            </div>
        </div>
    );
}