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
import { Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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

    const getStatusBadge = () => {
        if (match.status === "completed") {
            return <Badge variant="default" className="text-xs rounded-sm bg-primary text-primary-foreground">COMPLETED</Badge>;
        }
        if (match.status === "scheduled") {
            return <Badge variant="secondary" className="text-xs rounded-sm bg-secondary text-secondary-foreground">SCHEDULED</Badge>;
        }
        return <Badge variant="outline" className="text-xs rounded-sm border-2 text-foreground">PENDING</Badge>;
    };

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="border border-border bg-card rounded-sm overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
                        <div className={cn(
                            "border-b border-border p-3 transition-colors",
                            homeWon && "bg-primary/10 border-l-4 border-l-primary"
                        )}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {bracket.seed_home && (
                                        <span className="text-xs font-semibold text-muted-foreground w-6 flex-shrink-0">
                                            #{bracket.seed_home}
                                        </span>
                                    )}
                                    <span className={cn(
                                        "text-sm font-medium truncate",
                                        !homeTeam && "text-muted-foreground italic"
                                    )}>
                                        {homeTeam?.name || "TBD"}
                                    </span>
                                </div>
                                {isCompleted && (
                                    <span className={cn(
                                        "text-sm font-bold",
                                        homeWon ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {match.home_sets_won || 0}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={cn(
                            "border-b border-border p-3 transition-colors",
                            awayWon && "bg-primary/10 border-l-4 border-l-primary"
                        )}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {bracket.seed_away && (
                                        <span className="text-xs font-semibold text-muted-foreground w-6 flex-shrink-0">
                                            #{bracket.seed_away}
                                        </span>
                                    )}
                                    <span className={cn(
                                        "text-sm font-medium truncate",
                                        !awayTeam && "text-muted-foreground italic"
                                    )}>
                                        {awayTeam?.name || "TBD"}
                                    </span>
                                </div>
                                {isCompleted && (
                                    <span className={cn(
                                        "text-sm font-bold",
                                        awayWon ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {match.away_sets_won || 0}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="bg-muted/30 px-3 py-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                BO{match.best_of}
                            </span>
                            {getStatusBadge()}
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    className="w-80 p-4 bg-popover border-2 border-border shadow-lg"
                    sideOffset={8}
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="text-sm font-semibold text-foreground">Match Details</span>
                            {getStatusBadge()}
                        </div>

                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(match.scheduled_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>Best of {match.best_of}</span>
                            </div>
                        </div>

                        {isCompleted && (
                            <div className="pt-2 border-t">
                                <div className="text-xs font-semibold mb-2">Set Scores</div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span>{homeTeam?.name || "TBD"}</span>
                                        <span className="font-mono">{match.home_sets_won || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span>{awayTeam?.name || "TBD"}</span>
                                        <span className="font-mono">{match.away_sets_won || 0}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {match.is_forfeit && (
                            <div className="pt-2 border-t">
                                <Badge variant="destructive" className="text-xs">FORFEIT</Badge>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}