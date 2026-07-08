"use client";

import React from "react";
import Link from "next/link";
import { PlayoffBracket, Match } from "@/shared/types/db";
import { TeamWithRegion } from "@/server/domains/team";
import { Badge } from "@/app/components/ui/badge";
import { Calendar, Trophy, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getLogoClassName } from "@/app/lib/logoClass";

type MatchBracketCardProps = {
    bracket: PlayoffBracket;
    match: Match;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    homeSource?: string | undefined;
    awaySource?: string | undefined;
    regionCode?: string;
    href?: string | null;
};

export function MatchBracketCard({
                                     bracket,
                                     match,
                                     homeTeam,
                                     awayTeam,
                                     homeSource,
                                     awaySource,
                                     href,
                                 }: MatchBracketCardProps) {
    const isCompleted = match.status === "completed";
    const homeWon = isCompleted && (match.home_sets_won || 0) > (match.away_sets_won || 0);
    const awayWon = isCompleted && (match.away_sets_won || 0) > (match.home_sets_won || 0);

    const getStatusConfig = () => {
        if (match.status === "completed") {
            return {
                label: "Completed",
                className: "bg-green-600/15 text-green-600 border-green-600/30",
                icon: <Trophy className="h-3 w-3" />
            };
        }
        if (match.status === "scheduled") {
            return {
                label: "Scheduled",
                className: "bg-blue-600/15 text-blue-600 border-blue-600/30",
                icon: <Calendar className="h-3 w-3" />
            };
        }
        return {
            label: "Pending",
            className: "bg-amber-600/15 text-amber-600 border-amber-600/30",
            icon: <AlertCircle className="h-3 w-3" />
        };
    };

    const statusConfig = getStatusConfig();

    const inner = (
        <>
            <div className="bg-muted/40 px-3 py-2 flex items-center justify-between gap-2 border-b border-border">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-sm text-[10px] font-bold tabular-nums tracking-wide text-white bg-blue-600">
                        {match.match_code}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                        BO{match.best_of}
                    </span>
                </div>
                <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-semibold uppercase tracking-wider flex items-center gap-1", statusConfig.className)}>
                    {statusConfig.icon}
                    {statusConfig.label}
                </Badge>
            </div>
            <div className={cn(
                "px-3 py-2.5 border-b transition-all",
                homeWon && "bg-gradient-to-r from-primary/20 to-primary/5 border-l-4 border-l-primary",
                !homeWon && !awayWon && "border-border"
            )}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1">
                        {bracket.seed_home && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-muted/50 border border-border shrink-0">
                                <span className="text-xs font-bold text-muted-foreground">
                                    {bracket.seed_home}
                                </span>
                            </div>
                        )}
                        {homeTeam?.logo_url && (
                            <div className="relative w-6 h-6 shrink-0 rounded-sm border border-border/50 overflow-hidden bg-muted/40">
                                <Image
                                    src={homeTeam.logo_url}
                                    alt={homeTeam.name}
                                    fill
                                    sizes="24px"
                                    className={getLogoClassName(homeTeam.logo_bg_removed)}
                                />
                            </div>
                        )}
                        <span className={cn(
                            "text-sm font-semibold",
                            homeWon && "text-primary",
                            !homeTeam && "text-muted-foreground italic"
                        )}>
                            {homeTeam?.name || homeSource || "TBD"}
                        </span>
                    </div>
                    {isCompleted && (
                        <div className={cn(
                            "flex items-center justify-center min-w-[28px] h-7 px-2 rounded-sm font-bold text-sm tabular-nums",
                            homeWon ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
                        )}>
                            {match.home_sets_won || 0}
                        </div>
                    )}
                </div>
            </div>

            <div className={cn(
                "px-3 py-2.5 transition-all",
                awayWon && "bg-gradient-to-r from-primary/20 to-primary/5 border-l-4 border-l-primary",
                !homeWon && !awayWon && "border-border"
            )}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {bracket.seed_away && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-muted/50 border border-border shrink-0">
                                <span className="text-xs font-bold text-muted-foreground">
                                    {bracket.seed_away}
                                </span>
                            </div>
                        )}
                        {awayTeam?.logo_url && (
                            <div className="relative w-6 h-6 shrink-0 rounded-sm border border-border/50 overflow-hidden bg-muted/40">
                                <Image
                                    src={awayTeam.logo_url}
                                    alt={awayTeam.name}
                                    fill
                                    sizes="24px"
                                    className={getLogoClassName(awayTeam.logo_bg_removed)}
                                />
                            </div>
                        )}
                        <span className={cn(
                            "text-sm font-semibold",
                            awayWon && "text-primary",
                            !awayTeam && "text-muted-foreground italic"
                        )}>
                            {awayTeam?.name || awaySource || "TBD"}
                        </span>
                    </div>
                    {isCompleted && (
                        <div className={cn(
                            "flex items-center justify-center min-w-[28px] h-7 px-2 rounded-sm font-bold text-sm tabular-nums",
                            awayWon ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
                        )}>
                            {match.away_sets_won || 0}
                        </div>
                    )}
                </div>
            </div>

        </>
    );

    const baseClass = cn(
        "border-2 bg-card rounded-sm overflow-hidden transition-all duration-200 shadow-sm block",
        isCompleted ? "border-primary/40 shadow-primary/10" : "border-border hover:border-primary/30",
        "hover:shadow-lg hover:-translate-y-0.5"
    );

    return href ? (
        <Link href={href} className={cn(baseClass, "cursor-pointer")}>
            {inner}
        </Link>
    ) : (
        <div className={baseClass}>
            {inner}
        </div>
    );
}
