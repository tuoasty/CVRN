"use client";

import React, {useMemo} from "react";
import Link from "next/link";
import Image from "next/image";
import {RotateCw} from "lucide-react";
import {PlayoffBracket, Match} from "@/shared/types/db";
import {TeamWithRegion} from "@/server/domains/team";
import {cn} from "@/lib/utils";
import {DefaultTeamLogo} from "@/app/components/ui/DefaultTeamLogo";
import {TodayText} from "@/app/components/ui/TodayText";
import {getLogoClassName} from "@/app/lib/logoClass";
import {formatRegionDate, formatRegionTime} from "@/app/(public)/home/model/format";
import {isRegionToday} from "@/app/(public)/home/model/phase";

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
    isChampion?: boolean;
    timeZone?: string;
};

function TeamRow({
    seed,
    team,
    source,
    won,
    lost,
    score,
    showScore,
    divider,
    linked,
}: {
    seed: number | null;
    team?: TeamWithRegion;
    source?: string;
    won: boolean;
    lost: boolean;
    score: number;
    showScore: boolean;
    divider: boolean;
    linked: boolean;
}) {
    return (
        <div
            className={cn(
                "grid h-[46px] grid-cols-[1rem_28px_minmax(0,1fr)_auto] items-center gap-2.5 px-3",
                divider && "border-t border-border/60"
            )}
        >
            <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                {seed ?? ""}
            </span>
            {team ? (
                <>
                    <div className={cn("relative h-7 w-7", lost && "opacity-50")}>
                        {team.logo_url ? (
                            <Image
                                src={team.logo_url}
                                alt=""
                                fill
                                sizes="28px"
                                className={getLogoClassName(team.logo_bg_removed)}
                            />
                        ) : !team.is_bye ? (
                            <DefaultTeamLogo sizes="28px" alt="" />
                        ) : null}
                    </div>
                    <span
                        className={cn(
                            "min-w-0 truncate text-sm",
                            lost ? "font-medium text-muted-foreground" : "font-semibold text-foreground",
                            linked && "group-hover/slot:underline group-hover/slot:underline-offset-4"
                        )}
                    >
                        {team.name}
                    </span>
                </>
            ) : (
                <span className="col-span-2 min-w-0 truncate text-sm font-medium text-muted-foreground">
                    {source || "TBD"}
                </span>
            )}
            {showScore && (
                <span
                    className={cn(
                        "text-right font-mono text-[15px] tabular-nums",
                        won ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                >
                    {score}
                </span>
            )}
        </div>
    );
}

function SlotStatus({match, isChampion, timeZone}: {match: Match; isChampion: boolean; timeZone: string}) {
    const today = useMemo(
        () => isRegionToday(match.scheduled_at, timeZone, new Date()),
        [match.scheduled_at, timeZone]
    );

    if (isChampion) {
        return <span className="font-semibold uppercase tracking-[0.05em] text-foreground">Champion</span>;
    }
    if (match.status === "completed") {
        return <span className="text-muted-foreground">Final</span>;
    }
    if (match.status === "scheduled" && match.scheduled_at) {
        const time = formatRegionTime(match.scheduled_at, timeZone);
        if (today) return <TodayText active>Today {time}</TodayText>;
        return <span className="text-muted-foreground">{formatRegionDate(match.scheduled_at, timeZone)} · {time}</span>;
    }
    return null;
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
    isChampion = false,
    timeZone = "UTC",
}: MatchBracketCardProps) {
    const isCompleted = match.status === "completed";
    const homeWon = isCompleted && (match.home_sets_won || 0) > (match.away_sets_won || 0);
    const awayWon = isCompleted && (match.away_sets_won || 0) > (match.home_sets_won || 0);
    const linked = !!href;

    const rows = (
        <>
            <TeamRow
                seed={bracket.seed_home}
                team={homeTeam}
                source={homeSource}
                won={homeWon}
                lost={awayWon}
                score={match.home_sets_won || 0}
                showScore={isCompleted}
                divider={false}
                linked={linked}
            />
            <TeamRow
                seed={bracket.seed_away}
                team={awayTeam}
                source={awaySource}
                won={awayWon}
                lost={homeWon}
                score={match.away_sets_won || 0}
                showScore={isCompleted}
                divider
                linked={linked}
            />
        </>
    );

    const frameClass = cn(
        "block border border-border",
        linked && "group/slot cursor-pointer transition-colors duration-150 hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    );

    const frame = href ? (
        <Link href={href} prefetch={false} className={frameClass}>
            {rows}
        </Link>
    ) : (
        <div className={frameClass}>{rows}</div>
    );

    return (
        <div>
            <div className="mb-1.5 flex h-4 items-center justify-between gap-2 text-xs leading-4">
                <span className="truncate">
                    <span className="font-mono font-semibold text-foreground">{match.match_code}</span>
                    <span className="text-muted-foreground"> · BO{match.best_of}</span>
                </span>
                <span className="shrink-0">
                    <SlotStatus match={match} isChampion={isChampion} timeZone={timeZone} />
                </span>
            </div>
            {canReadvance && onReadvance ? (
                <div className="relative">
                    {frame}
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
                        className="absolute -right-2 -top-2 z-20 flex h-7 w-7 cursor-pointer items-center justify-center rounded-[2px] border border-border bg-background text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                </div>
            ) : (
                frame
            )}
        </div>
    );
}
