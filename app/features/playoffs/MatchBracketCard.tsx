"use client";

import React from "react";
import { PlayoffBracket, Match } from "@/shared/types/db";
import { TeamWithRegion } from "@/server/dto/team.dto";
import { Badge } from "@/app/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { Calendar, Trophy, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type MatchBracketCardProps = {
    bracket: PlayoffBracket;
    match: Match;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
};

export function MatchBracketCard({
                                     bracket,
                                     match,
                                     homeTeam,
                                     awayTeam,
                                 }: MatchBracketCardProps) {
    const isCompleted = match.status === "completed";
    const homeWon = isCompleted && (match.home_sets_won || 0) > (match.away_sets_won || 0);
    const awayWon = isCompleted && (match.away_sets_won || 0) > (match.home_sets_won || 0);

    const formatDate = (date: string | null) => {
        if (!date) return "TBD";
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

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

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "border-2 bg-card rounded-sm overflow-hidden transition-all duration-200 cursor-pointer shadow-sm",
                        isCompleted ? "border-primary/40 shadow-primary/10" : "border-border hover:border-primary/30",
                        "hover:shadow-lg hover:-translate-y-0.5"
                    )}>
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
                                        <div className="relative w-6 h-6 shrink-0">
                                            <Image
                                                src={homeTeam.logo_url}
                                                alt={homeTeam.name}
                                                fill
                                                sizes="24px"
                                                className="object-contain mix-blend-multiply dark:mix-blend-screen"
                                            />
                                        </div>
                                    )}
                                    <span className={cn(
                                        "text-sm font-semibold",
                                        homeWon && "text-primary",
                                        !homeTeam && "text-muted-foreground italic"
                                    )}>
                                        {homeTeam?.name || "TBD"}
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
                            "px-3 py-2.5 border-b transition-all",
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
                                        <div className="relative w-6 h-6 shrink-0">
                                            <Image
                                                src={awayTeam.logo_url}
                                                alt={awayTeam.name}
                                                fill
                                                sizes="24px"
                                                className="object-contain mix-blend-multiply dark:mix-blend-screen"
                                            />
                                        </div>
                                    )}
                                    <span className={cn(
                                        "text-sm font-semibold",
                                        awayWon && "text-primary",
                                        !awayTeam && "text-muted-foreground italic"
                                    )}>
                                        {awayTeam?.name || "TBD"}
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

                        <div className="bg-muted/40 px-3 py-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                                BO{match.best_of}
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-semibold uppercase tracking-wider flex items-center gap-1", statusConfig.className)}>
                                {statusConfig.icon}
                                {statusConfig.label}
                            </Badge>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    className="w-80 p-4 border-2 border-primary/20 shadow-xl rounded-sm bg-card"
                    sideOffset={10}
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b-2 border-primary/20">
                            <span className="text-sm font-bold text-foreground">Match Details</span>
                            <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-semibold uppercase tracking-wider flex items-center gap-1", statusConfig.className)}>
                                {statusConfig.icon}
                                {statusConfig.label}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 py-2">
                            <div className="p-2.5 bg-muted/50 rounded-sm border border-border">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Date/Time</div>
                                <div className="text-xs font-medium text-foreground">{formatDate(match.scheduled_at)}</div>
                            </div>
                            <div className="p-2.5 bg-muted/50 rounded-sm border border-border">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Format</div>
                                <div className="text-xs font-medium text-foreground">Best of {match.best_of}</div>
                            </div>
                        </div>

                        {isCompleted && (
                            <div className="pt-2 border-t border-border">
                                <div className="text-xs font-semibold mb-2 text-primary">Final Score</div>
                                <div className="space-y-1.5">
                                    <div className={cn(
                                        "flex justify-between items-center p-2 rounded-sm border",
                                        homeWon ? "bg-primary/15 border-primary/30" : "bg-muted/30 border-border"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            {homeTeam?.logo_url && (
                                                <div className="relative w-4 h-4">
                                                    <Image
                                                        src={homeTeam.logo_url}
                                                        alt={homeTeam.name}
                                                        fill
                                                        sizes="16px"
                                                        className="object-contain mix-blend-multiply dark:mix-blend-screen"
                                                    />
                                                </div>
                                            )}
                                            <span className="text-xs font-medium text-foreground">{homeTeam?.name || "TBD"}</span>
                                        </div>
                                        <span className={cn("text-sm font-bold tabular-nums", homeWon ? "text-primary" : "text-foreground")}>
                            {match.home_sets_won || 0}
                        </span>
                                    </div>
                                    <div className={cn(
                                        "flex justify-between items-center p-2 rounded-sm border",
                                        awayWon ? "bg-primary/15 border-primary/30" : "bg-muted/30 border-border"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            {awayTeam?.logo_url && (
                                                <div className="relative w-4 h-4">
                                                    <Image
                                                        src={awayTeam.logo_url}
                                                        alt={awayTeam.name}
                                                        fill
                                                        sizes="16px"
                                                        className="object-contain mix-blend-multiply dark:mix-blend-screen"
                                                    />
                                                </div>
                                            )}
                                            <span className="text-xs font-medium text-foreground">{awayTeam?.name || "TBD"}</span>
                                        </div>
                                        <span className={cn("text-sm font-bold tabular-nums", awayWon ? "text-primary" : "text-foreground")}>
                            {match.away_sets_won || 0}
                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {match.is_forfeit && (
                            <div className="pt-2 border-t border-destructive/20">
                                <Badge variant="destructive" className="text-xs">FORFEIT</Badge>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}