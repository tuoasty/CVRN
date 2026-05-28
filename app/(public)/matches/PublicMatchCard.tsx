"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { MatchWithDetails } from "@/server/domains/match";
import { TeamWithRegion } from "@/server/domains/team";
import { Player } from "@/shared/types/db";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { getLogoClassName } from "@/app/lib/logoClass";
import { cn } from "@/lib/utils";

interface TeamRecord {
    wins: number;
    losses: number;
}

interface PublicMatchCardProps {
    matchDetails: MatchWithDetails;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    matchMvp?: Player | null;
    loserMvp?: Player | null;
    regionCode?: string;
    index: number;
    href?: string | null;
    homeRecord?: TeamRecord;
    awayRecord?: TeamRecord;
    isPriority?: boolean;
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

function TeamLogo({ team, isPriority }: { team?: TeamWithRegion; isPriority?: boolean }) {
    if (!team) return (
        <div className="w-[72px] h-[72px] rounded-sm bg-muted/50 border border-border flex items-center justify-center">
            <span className="text-sm text-muted-foreground font-bold">?</span>
        </div>
    );
    if (team.is_bye) return (
        <div className="w-[72px] h-[72px] rounded-sm bg-orange-600/10 border border-orange-600/20 flex items-center justify-center">
            <span className="text-sm text-orange-600 font-bold">BYE</span>
        </div>
    );
    if (team.logo_url) return (
        <div className="relative w-[72px] h-[72px] rounded-sm overflow-hidden">
            <Image src={team.logo_url} alt={team.name} fill priority={isPriority} sizes="72px" className={getLogoClassName(team.logo_bg_removed)} />
        </div>
    );
    return (
        <div className="w-[72px] h-[72px] rounded-sm bg-muted/50 border border-border flex items-center justify-center">
            <span className="text-sm text-muted-foreground font-bold">
                {team.name.slice(0, 3).toUpperCase()}
            </span>
        </div>
    );
}

function OfficialPill({ name }: { name: string }) {
    return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border border-border/50 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
            <span>{name}</span>
        </div>
    );
}

export default function PublicMatchCard({
    matchDetails,
    homeTeam,
    awayTeam,
    matchMvp,
    loserMvp,
    regionCode,
    index,
    href,
    homeRecord,
    awayRecord,
    isPriority,
}: PublicMatchCardProps) {
    const { match, sets, officials } = matchDetails;
    const statusConfig = getStatusConfig(match.status);
    const referees = officials.filter(o => o.official_type === "referee");
    const media = officials.filter(o => o.official_type === "media");
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
        <div className="space-y-3">
            {/* Meta row */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Match {index + 1}
                    </span>
                    {match.is_forfeit ? (
                        <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider bg-red-600/10 text-red-600 border-red-600/20">
                            Forfeit
                        </Badge>
                    ) : (
                        <Badge variant="outline" className={cn("rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider", statusConfig.className)}>
                            {statusConfig.label}
                        </Badge>
                    )}
                    <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2">
                        BO{match.best_of}
                    </Badge>
                    {match.match_type === "playoffs" && (
                        <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2 bg-purple-600/10 text-purple-600 border-purple-600/20">
                            Playoff
                        </Badge>
                    )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeDisplay}</span>
            </div>

            {/* Hero: 3-column centered layout */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
                {/* Home column */}
                <div className={cn(
                    "flex flex-col items-center gap-1.5 min-w-0 transition-opacity",
                    isCompleted && !homeWon && "opacity-40"
                )}>
                    <TeamLogo team={homeTeam} isPriority={isPriority} />
                    <span className={cn(
                        "text-sm text-center truncate w-full",
                        homeWon ? "font-bold text-foreground" : "font-medium"
                    )}>
                        {homeTeam?.is_bye ? "" : (homeTeam?.name || "TBD")}
                    </span>
                    {homeRecord && !homeTeam?.is_bye && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {homeRecord.wins} – {homeRecord.losses}
                        </span>
                    )}
                </div>

                {/* Center: score + set pills */}
                <div className="flex flex-col items-center gap-2 px-2">
                    {isCompleted && match.home_sets_won !== null && match.away_sets_won !== null ? (
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-[40px] font-bold tabular-nums leading-none",
                                homeWon ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {match.home_sets_won}
                            </span>
                            <span className="text-lg text-muted-foreground/50 font-medium">–</span>
                            <span className={cn(
                                "text-[40px] font-bold tabular-nums leading-none",
                                awayWon ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {match.away_sets_won}
                            </span>
                        </div>
                    ) : (
                        <span className="text-2xl font-bold text-muted-foreground/40">VS</span>
                    )}
                    {isCompleted && !match.is_forfeit && sets.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                            {sets.map(set => (
                                <div key={set.set_number} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-muted/50 border border-border/50">
                                    <span className={cn(
                                        "text-[10px] font-semibold tabular-nums",
                                        set.home_score > set.away_score ? "text-foreground" : "text-muted-foreground/50"
                                    )}>
                                        {set.home_score}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/40">–</span>
                                    <span className={cn(
                                        "text-[10px] font-semibold tabular-nums",
                                        set.away_score > set.home_score ? "text-foreground" : "text-muted-foreground/50"
                                    )}>
                                        {set.away_score}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Away column */}
                <div className={cn(
                    "flex flex-col items-center gap-1.5 min-w-0 transition-opacity",
                    isCompleted && !awayWon && "opacity-40"
                )}>
                    <TeamLogo team={awayTeam} isPriority={isPriority} />
                    <span className={cn(
                        "text-sm text-center truncate w-full",
                        awayWon ? "font-bold text-foreground" : "font-medium"
                    )}>
                        {awayTeam?.is_bye ? "" : (awayTeam?.name || "TBD")}
                    </span>
                    {awayRecord && !awayTeam?.is_bye && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {awayRecord.wins} – {awayRecord.losses}
                        </span>
                    )}
                </div>
            </div>

            {/* Footer — completed matches only */}
            {isCompleted && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                    {/* LVR row — always two badges */}
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            {!homeTeam?.is_bye && match.home_team_lvr !== null && match.home_team_lvr !== undefined && (
                                <Badge variant="outline" className={cn(
                                    "h-5 px-1.5 text-[10px] font-semibold tabular-nums rounded-sm",
                                    match.home_team_lvr >= 0
                                        ? "bg-green-600/10 text-green-600 border-green-600/20"
                                        : "bg-red-600/10 text-red-600 border-red-600/20"
                                )}>
                                    {match.home_team_lvr >= 0 ? "+" : ""}{match.home_team_lvr.toFixed(1)} LVR
                                </Badge>
                            )}
                        </div>
                        <div>
                            {!awayTeam?.is_bye && match.away_team_lvr !== null && match.away_team_lvr !== undefined && (
                                <Badge variant="outline" className={cn(
                                    "h-5 px-1.5 text-[10px] font-semibold tabular-nums rounded-sm",
                                    match.away_team_lvr >= 0
                                        ? "bg-green-600/10 text-green-600 border-green-600/20"
                                        : "bg-red-600/10 text-red-600 border-red-600/20"
                                )}>
                                    {match.away_team_lvr >= 0 ? "+" : ""}{match.away_team_lvr.toFixed(1)} LVR
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* MVP row — only if at least one MVP exists */}
                    {(matchMvp || loserMvp) && (
                        <div className="flex items-center gap-2">
                            {matchMvp ? (
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {matchMvp.avatar_url && (
                                        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-primary/30 shrink-0">
                                            <Image src={matchMvp.avatar_url} alt={matchMvp.username || "Player"} fill sizes="24px" className="object-cover" unoptimized />
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] uppercase tracking-wider text-primary font-semibold">Match MVP</span>
                                        <span className="text-xs font-semibold truncate">{matchMvp.display_name || matchMvp.username || "Unknown"}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1" />
                            )}
                            {loserMvp && (
                                <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                                    <div className="flex flex-col items-end min-w-0">
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Loser MVP</span>
                                        <span className="text-xs font-semibold truncate">{loserMvp.display_name || loserMvp.username || "Unknown"}</span>
                                    </div>
                                    {loserMvp.avatar_url && (
                                        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border shrink-0">
                                            <Image src={loserMvp.avatar_url} alt={loserMvp.username || "Player"} fill sizes="24px" className="object-cover" unoptimized />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Officials row — hidden on mobile */}
                    {(referees.length > 0 || media.length > 0) && (
                        <div className="hidden sm:flex items-center gap-3 flex-wrap">
                            {referees.length > 0 && (
                                <>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Refs</span>
                                    {referees.map(o => (
                                        <OfficialPill key={o.id} name={o.display_name || o.username || "Unknown"} />
                                    ))}
                                </>
                            )}
                            {media.length > 0 && (
                                <>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Media</span>
                                    {media.map(o => (
                                        <OfficialPill key={o.id} name={o.display_name || o.username || "Unknown"} />
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return href ? (
        <Link href={href} className="block panel p-3 sm:p-4 transition-colors hover:border-primary/30 cursor-pointer">
            {inner}
        </Link>
    ) : (
        <div className="panel p-3 sm:p-4">
            {inner}
        </div>
    );
}
