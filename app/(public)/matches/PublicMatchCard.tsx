"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { MatchWithDetails } from "@/server/domains/match";
import { TeamWithRegion } from "@/server/domains/team";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { getLogoClassName } from "@/app/lib/logoClass";
import { parseMatchNumber } from "@/app/utils/matchLabel";
import { cn } from "@/lib/utils";
import { StandingMethod } from "@/shared/types/standing";

interface TeamRecord {
    wins: number;
    losses: number;
}

interface PublicMatchCardProps {
    matchDetails: MatchWithDetails;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    regionCode?: string;
    href?: string | null;
    homeRecord?: TeamRecord;
    awayRecord?: TeamRecord;
    isPriority?: boolean;
    standingMethod?: StandingMethod;
    labelOverride?: string;
    minimalMeta?: boolean;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case "pending":
            return { label: "Pending", className: "bg-amber-600/10 text-amber-600 border-amber-600/20" };
        case "scheduled":
            return { label: "Scheduled", className: "bg-blue-600/10 text-blue-600 border-blue-600/20" };
        case "completed":
            return { label: "Completed", className: "bg-green-600/10 text-green-600 border-green-600/20" };
        default:
            return { label: "Unknown", className: "" };
    }
};

function TeamLogo({
    team,
    isPriority,
    sizeClass = "w-12 h-12 sm:w-[72px] sm:h-[72px]",
}: {
    team?: TeamWithRegion;
    isPriority?: boolean;
    sizeClass?: string;
}) {
    if (!team) return (
        <div className={cn(sizeClass, "rounded-sm bg-muted/50 border border-border flex items-center justify-center")}>
            <span className="text-sm text-muted-foreground font-bold">?</span>
        </div>
    );
    if (team.is_bye) return (
        <div className={cn(sizeClass, "rounded-sm bg-orange-600/10 border border-orange-600/20 flex items-center justify-center")}>
            <span className="text-sm text-orange-600 font-bold">BYE</span>
        </div>
    );
    if (team.logo_url) return (
        <div className={cn("relative rounded-sm overflow-hidden", sizeClass)}>
            <Image src={team.logo_url} alt={team.name} fill priority={isPriority} sizes="(max-width: 640px) 48px, 72px" className={getLogoClassName(team.logo_bg_removed)} />
        </div>
    );
    return (
        <div className={cn(sizeClass, "rounded-sm bg-muted/50 border border-border flex items-center justify-center")}>
            <span className="text-sm text-muted-foreground font-bold">
                {team.name.slice(0, 3).toUpperCase()}
            </span>
        </div>
    );
}

export default function PublicMatchCard({
    matchDetails,
    homeTeam,
    awayTeam,
    regionCode,
    href,
    homeRecord,
    awayRecord,
    isPriority,
    standingMethod = "lvr",
    labelOverride,
    minimalMeta = false,
}: PublicMatchCardProps) {
    const { match, sets } = matchDetails;
    const isPoints = standingMethod === "points" || standingMethod === "points_without_bonus";

    const homePts = (match.home_team_points ?? 0) + (standingMethod === "points" ? (match.home_team_bonus ?? 0) : 0);
    const awayPts = (match.away_team_points ?? 0) + (standingMethod === "points" ? (match.away_team_bonus ?? 0) : 0);
    const matchNumber = parseMatchNumber(match.match_code);
    const matchLabel =
        labelOverride ??
        (match.match_type === "playoffs"
            ? (match.match_code ?? "Match")
            : matchNumber != null
                ? `Match ${matchNumber}`
                : "Match");
    const statusConfig = getStatusConfig(match.status);
    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    const isCompleted = match.status === "completed";
    const homeWon = isCompleted && (match.home_sets_won ?? 0) > (match.away_sets_won ?? 0);
    const awayWon = isCompleted && (match.away_sets_won ?? 0) > (match.home_sets_won ?? 0);

    const timeDisplay = regionTimezone
        ? formatDateInTimezone(match.scheduled_at, regionTimezone)
        : match.scheduled_at
            ? new Date(match.scheduled_at).toLocaleString()
            : "Time TBD";

    const inner = (
        <div>
            {}
            <div className="lg:hidden">

                {}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-border">
                    {}
                    <div className="flex items-center">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                            {matchLabel}
                        </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">{timeDisplay}</span>
                </div>

                {}
                {[
                    { team: homeTeam, setsWon: match.home_sets_won, won: homeWon },
                    { team: awayTeam, setsWon: match.away_sets_won, won: awayWon },
                ].map(({ team, setsWon, won }, i) => {
                    const teamSets = sets.map(s => ({
                        score: i === 0 ? s.home_score : s.away_score,
                        didWin: i === 0
                            ? s.home_score > s.away_score
                            : s.away_score > s.home_score,
                    }));
                    return (
                        <div
                            key={i}
                            className={cn(
                                "flex items-center py-[7px]",
                                i === 1 && "border-t border-border/30",
                                isCompleted && !won && "opacity-[0.45]"
                            )}
                        >
                            <TeamLogo
                                team={team}
                                isPriority={isPriority}
                                sizeClass="w-[38px] h-[38px]"
                            />

                            <span className={cn(
                                "text-xs flex-1 min-w-0 truncate ml-2.5",
                                won ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                            )}>
                                {team?.is_bye ? "BYE" : (team?.name || "TBD")}
                            </span>

                            {isCompleted && !match.is_forfeit && sets.length > 0 && (
                                <div className="flex items-center mx-2.5 shrink-0">
                                    {teamSets.map((s, si) => (
                                        <span key={si} className="flex items-center">
                                            {si > 0 && (
                                                <span className="text-[10px] text-border/60 px-px">·</span>
                                            )}
                                            <span className={cn(
                                                "text-[11px] tabular-nums px-0.5",
                                                s.didWin
                                                    ? "font-bold text-foreground"
                                                    : "font-medium text-muted-foreground/60"
                                            )}>
                                                {s.score}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <span className={cn(
                                "text-xl font-black tabular-nums min-w-[20px] text-right shrink-0 leading-none",
                                won ? "text-foreground" : "text-muted-foreground/60"
                            )}>
                                {isCompleted ? (setsWon ?? "—") : "—"}
                            </span>
                        </div>
                    );
                })}

                {}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                        {!minimalMeta && (match.is_forfeit ? (
                            <Badge
                                variant="outline"
                                className="rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider bg-red-600/10 text-red-600 border-red-600/20"
                            >
                                Forfeit
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider",
                                    statusConfig.className
                                )}
                            >
                                {statusConfig.label}
                            </Badge>
                        ))}
                        {!minimalMeta && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "rounded-sm text-[10px] h-5 px-2",
                                    match.match_type === "playoffs"
                                        ? "bg-purple-600/10 text-purple-600 border-purple-600/20"
                                        : ""
                                )}
                            >
                                BO{match.best_of}
                            </Badge>
                        )}
                    </div>

                    {isCompleted &&
                        !homeTeam?.is_bye &&
                        !awayTeam?.is_bye && (
                            isPoints ? (
                                (match.home_team_points != null || match.away_team_points != null) && (
                                    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/80">
                                        <span className="text-foreground">+{homePts.toFixed(1)}</span>
                                        <span className="text-border mx-1">/</span>
                                        <span className="text-foreground">+{awayPts.toFixed(1)}</span>
                                        <span className="text-muted-foreground/60 ml-1">pts</span>
                                    </span>
                                )
                            ) : (
                                match.home_team_lvr !== null &&
                                match.home_team_lvr !== undefined &&
                                match.away_team_lvr !== null &&
                                match.away_team_lvr !== undefined && (
                                    match.is_forfeit ? (
                                        <span className="text-[10px] font-semibold tabular-nums">
                                            <span className="text-green-500">
                                                {(homeWon ? match.home_team_lvr : match.away_team_lvr) >= 0 ? "+" : ""}
                                                {(homeWon ? match.home_team_lvr : match.away_team_lvr).toFixed(1)}
                                            </span>
                                            <span className="text-border mx-1">/</span>
                                            <span className="text-red-500">
                                                {(homeWon ? match.away_team_lvr : match.home_team_lvr).toFixed(1)}
                                            </span>
                                            <span className="text-muted-foreground/60 ml-1">LVR</span>
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-semibold text-green-500 tabular-nums">
                                            ±{Math.abs(match.home_team_lvr).toFixed(1)} LVR
                                        </span>
                                    )
                                )
                            )
                        )
                    }
                </div>

            </div>

            {}
            <div className="hidden lg:grid grid-cols-[220px_minmax(0,1fr)_72px_minmax(0,1fr)_230px_100px] items-center gap-4">
                {}
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                            {matchLabel}
                        </span>
                        {!minimalMeta && (
                            <>
                                {match.is_forfeit ? (
                                    <Badge variant="outline" className="shrink-0 rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider bg-red-600/10 text-red-600 border-red-600/20">
                                        Forfeit
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className={cn("shrink-0 rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider", statusConfig.className)}>
                                        {statusConfig.label}
                                    </Badge>
                                )}
                                <Badge variant="outline" className="shrink-0 rounded-sm text-[10px] h-5 px-2">
                                    BO{match.best_of}
                                </Badge>
                            </>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground">{timeDisplay}</span>
                </div>

                {}
                <div className={cn(
                    "flex flex-row-reverse items-center gap-2.5 min-w-0 transition-opacity",
                    isCompleted && !homeWon && "opacity-40"
                )}>
                    <TeamLogo team={homeTeam} isPriority={isPriority} sizeClass="w-12 h-12" />
                    <div className="flex-1 min-w-0 text-right">
                        <span className={cn("block text-sm truncate", homeWon ? "font-bold text-foreground" : "font-medium")}>
                            {homeTeam?.is_bye ? "BYE" : (homeTeam?.name || "TBD")}
                        </span>
                        {homeRecord && !homeTeam?.is_bye && (
                            <span className="block text-xs text-muted-foreground tabular-nums">
                                {homeRecord.wins} – {homeRecord.losses}
                            </span>
                        )}
                    </div>
                </div>

                {}
                <div className="text-center">
                    {isCompleted && match.home_sets_won !== null && match.away_sets_won !== null ? (
                        <span className="text-2xl font-bold tabular-nums leading-none">
                            <span className={homeWon ? "text-foreground" : "text-muted-foreground"}>{match.home_sets_won}</span>
                            <span className="text-muted-foreground/50 px-1.5 text-base">–</span>
                            <span className={awayWon ? "text-foreground" : "text-muted-foreground"}>{match.away_sets_won}</span>
                        </span>
                    ) : (
                        <span className="text-base font-bold text-muted-foreground/40">VS</span>
                    )}
                </div>

                {}
                <div className={cn(
                    "flex items-center gap-2.5 min-w-0 transition-opacity",
                    isCompleted && !awayWon && "opacity-40"
                )}>
                    <TeamLogo team={awayTeam} isPriority={isPriority} sizeClass="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                        <span className={cn("block text-sm truncate", awayWon ? "font-bold text-foreground" : "font-medium")}>
                            {awayTeam?.is_bye ? "BYE" : (awayTeam?.name || "TBD")}
                        </span>
                        {awayRecord && !awayTeam?.is_bye && (
                            <span className="block text-xs text-muted-foreground tabular-nums">
                                {awayRecord.wins} – {awayRecord.losses}
                            </span>
                        )}
                    </div>
                </div>

                {}
                <div className="flex items-center gap-1">
                    {isCompleted && !match.is_forfeit && sets.map(set => (
                        <div key={set.set_number} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-muted/50 border border-border/50">
                            <span className={cn(
                                "text-[11px] font-semibold tabular-nums",
                                set.home_score > set.away_score ? "text-foreground" : "text-muted-foreground/50"
                            )}>
                                {set.home_score}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40">–</span>
                            <span className={cn(
                                "text-[11px] font-semibold tabular-nums",
                                set.away_score > set.home_score ? "text-foreground" : "text-muted-foreground/50"
                            )}>
                                {set.away_score}
                            </span>
                        </div>
                    ))}
                </div>

                {}
                <div className="flex justify-end">
                    {isCompleted && !homeTeam?.is_bye && !awayTeam?.is_bye && (isPoints
                        ? (match.home_team_points != null && match.away_team_points != null && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold tabular-nums rounded-sm bg-primary/10 text-primary border-primary/20">
                                +{(homeWon ? homePts : awayPts).toFixed(1)} pts
                            </Badge>
                        ))
                        : (match.home_team_lvr != null && match.away_team_lvr != null && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold tabular-nums rounded-sm bg-green-600/10 text-green-600 border-green-600/20">
                                ±{Math.abs(homeWon ? match.home_team_lvr : match.away_team_lvr).toFixed(1)} LVR
                            </Badge>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    return href ? (

        <Link href={href} prefetch={false} className="block panel p-3 sm:p-4 transition-colors hover:border-primary/30 cursor-pointer">
            {inner}
        </Link>
    ) : (
        <div className="panel p-3 sm:p-4">
            {inner}
        </div>
    );
}
