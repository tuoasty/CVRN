"use client";

import React from "react";
import Link from "next/link";
import { PlayoffBracket, Match } from "@/shared/types/db";
import { TeamWithRegion } from "@/server/domains/team";
import { Badge } from "@/app/components/ui/badge";
import { Calendar, Trophy, AlertCircle, RotateCw } from "lucide-react";
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
    canReadvance?: boolean;
    onReadvance?: () => void;
};

function TeamRow({
    seed,
    team,
    source,
    won,
    dim,
    score,
    showScore,
    divider,
}: {
    seed: number | null;
    team?: TeamWithRegion;
    source?: string;
    won: boolean;
    dim: boolean;
    score: number;
    showScore: boolean;
    divider: boolean;
}) {
    return (
        <div
            className={cn(
                "grid grid-cols-[1rem_2rem_1fr_auto] items-center gap-2.5 px-3 py-2.5 transition-opacity",
                divider && "border-t border-border",
                dim && "opacity-40"
            )}
        >
            <span className="text-xs font-semibold text-muted-foreground text-right">
                {seed ?? ""}
            </span>
            {team ? (
                <>
                    <div className="relative w-8 h-8">
                        {team.logo_url && (
                            <Image
                                src={team.logo_url}
                                alt={team.name}
                                fill
                                sizes="32px"
                                className={getLogoClassName(team.logo_bg_removed)}
                            />
                        )}
                    </div>
                    <span className={cn("text-sm truncate min-w-0", won ? "font-bold" : "font-semibold")}>
                        {team.name}
                    </span>
                </>
            ) : (
                <span className="col-span-2 text-sm truncate min-w-0 font-medium italic text-muted-foreground">
                    {source || "TBD"}
                </span>
            )}
            {showScore && (
                <span className={cn("font-mono text-base tabular-nums text-right", won && "font-bold")}>
                    {score}
                </span>
            )}
        </div>
    );
}

export function MatchBracketCard({
    bracket,
    match,
    homeTeam,
    awayTeam,
    homeSource,
    awaySource,
    href,
    canReadvance,
    onReadvance,
}: MatchBracketCardProps) {
    const isCompleted = match.status === "completed";
    const homeWon = isCompleted && (match.home_sets_won || 0) > (match.away_sets_won || 0);
    const awayWon = isCompleted && (match.away_sets_won || 0) > (match.home_sets_won || 0);

    const getStatusConfig = () => {
        if (match.status === "completed") {
            return {
                label: "Completed",
                className: "bg-green-600/15 text-green-600 border-green-600/30",
                icon: <Trophy className="h-3 w-3" />,
            };
        }
        if (match.status === "scheduled") {
            return {
                label: "Scheduled",
                className: "bg-blue-600/15 text-blue-600 border-blue-600/30",
                icon: <Calendar className="h-3 w-3" />,
            };
        }
        return {
            label: "Pending",
            className: "bg-amber-600/15 text-amber-600 border-amber-600/30",
            icon: <AlertCircle className="h-3 w-3" />,
        };
    };

    const statusConfig = getStatusConfig();

    const inner = (
        <>
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted">
                <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs font-bold tracking-wide text-foreground">
                        {match.match_code}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                        BO{match.best_of}
                    </span>
                </div>
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[10px] h-5 px-2 font-semibold uppercase tracking-wider flex items-center gap-1",
                        statusConfig.className
                    )}
                >
                    {statusConfig.icon}
                    {statusConfig.label}
                </Badge>
            </div>

            <TeamRow
                seed={bracket.seed_home}
                team={homeTeam}
                source={homeSource}
                won={homeWon}
                dim={awayWon}
                score={match.home_sets_won || 0}
                showScore={isCompleted}
                divider={false}
            />
            <TeamRow
                seed={bracket.seed_away}
                team={awayTeam}
                source={awaySource}
                won={awayWon}
                dim={homeWon}
                score={match.away_sets_won || 0}
                showScore={isCompleted}
                divider
            />
        </>
    );

    const baseClass = cn(
        "block bg-card border border-muted-foreground/30 rounded-sm overflow-hidden transition-all duration-200",
        href && "hover:border-primary/40 hover:shadow-sm hover:-translate-y-px"
    );

    const card = href ? (
        <Link href={href} prefetch={false} className={cn(baseClass, "cursor-pointer")}>
            {inner}
        </Link>
    ) : (
        <div className={baseClass}>{inner}</div>
    );

    if (!canReadvance || !onReadvance) return card;

    return (
        <div className="relative">
            {card}
            <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onReadvance();
                }}
                title="Re-advance winner into the next bracket"
                aria-label="Re-advance winner into the next bracket"
                className="absolute -top-2 -right-2 z-20 flex h-7 w-7 items-center justify-center rounded-sm border border-primary/40 bg-background text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
            >
                <RotateCw className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
