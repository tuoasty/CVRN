"use client";

import Image from "next/image";
import Link from "next/link";
import AvatarImage from "@/app/components/ui/AvatarImage";
import { Badge } from "@/app/components/ui/badge";
import { MatchWithDetails } from "@/server/domains/match";
import { TeamWithRegion } from "@/server/domains/team";
import { Player } from "@/shared/types/db";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { getLogoClassName } from "@/app/lib/logoClass";

interface PublicMatchCardProps {
    matchDetails: MatchWithDetails;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    matchMvp?: Player | null;
    loserMvp?: Player | null;
    regionCode?: string;
    index: number;
    href?: string | null;
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

export default function PublicMatchCard({ matchDetails, homeTeam, awayTeam, matchMvp, loserMvp, regionCode, index, href }: PublicMatchCardProps) {
    const { match, sets, officials } = matchDetails;
    const statusConfig = getStatusConfig(match.status);
    const referees = officials.filter(o => o.official_type === "referee");
    const media = officials.filter(o => o.official_type === "media");
    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    const homeWon = (match.home_sets_won ?? 0) > (match.away_sets_won ?? 0);
    const awayWon = (match.away_sets_won ?? 0) > (match.home_sets_won ?? 0);

    const inner = (
        <div className="space-y-3">
                {/* Header with status */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Match {index + 1}
                            </span>
                            {match.is_forfeit ? (
                                <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider bg-red-600/10 text-red-600 border-red-600/20">
                                    Forfeit
                                </Badge>
                            ) : (
                                <Badge variant="outline" className={`rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider ${statusConfig.className}`}>
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
                        <span className="sm:hidden text-[10px] text-muted-foreground">
                            {regionTimezone
                                ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                                : match.scheduled_at
                                    ? new Date(match.scheduled_at).toLocaleString()
                                    : "Time TBD"}
                        </span>
                    </div>
                    <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
                        {regionTimezone
                            ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                            : match.scheduled_at
                                ? new Date(match.scheduled_at).toLocaleString()
                                : "Time TBD"}
                    </span>
                </div>

                {/* Team matchup */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 py-2">
                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-sm overflow-hidden">
                            {homeTeam?.is_bye ? (
                                <div className="w-full h-full bg-orange-600/10 border border-orange-600/20 flex items-center justify-center">
                                    <span className="text-sm text-orange-600 font-bold">BYE</span>
                                </div>
                            ) : homeTeam?.logo_url ? (
                                <Image
                                    src={homeTeam.logo_url}
                                    alt={homeTeam.name}
                                    fill
                                    sizes="64px"
                                    className={getLogoClassName(homeTeam.logo_bg_removed)}
                                />
                            ) : (
                                <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
                                    <span className="text-sm text-muted-foreground font-bold">?</span>
                                </div>
                            )}
                        </div>
                        <span className={`w-full text-xs sm:text-sm text-center truncate ${homeTeam?.is_bye ? "invisible" : ""} ${homeWon ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
                            {homeTeam?.name || "TBD"}
                        </span>
                    </div>

                    {/* Score/VS - Centered */}
                    {match.status === "completed" && match.home_sets_won !== null && match.away_sets_won !== null ? (
                        <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2">
                            <span className={`text-lg sm:text-xl font-bold tabular-nums ${homeWon ? "text-foreground" : "text-muted-foreground"}`}>{match.home_sets_won}</span>
                            <span className="text-xs sm:text-sm text-muted-foreground/50 font-medium">-</span>
                            <span className={`text-lg sm:text-xl font-bold tabular-nums ${awayWon ? "text-foreground" : "text-muted-foreground"}`}>{match.away_sets_won}</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center px-1 sm:px-2">
                            <span className="text-sm sm:text-base font-bold text-muted-foreground/50">VS</span>
                        </div>
                    )}

                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-sm overflow-hidden">
                            {awayTeam?.is_bye ? (
                                <div className="w-full h-full bg-orange-600/10 border border-orange-600/20 flex items-center justify-center">
                                    <span className="text-sm text-orange-600 font-bold">BYE</span>
                                </div>
                            ) : awayTeam?.logo_url ? (
                                <Image
                                    src={awayTeam.logo_url}
                                    alt={awayTeam.name}
                                    fill
                                    sizes="64px"
                                    className={getLogoClassName(awayTeam.logo_bg_removed)}
                                />
                            ) : (
                                <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
                                    <span className="text-sm text-muted-foreground font-bold">?</span>
                                </div>
                            )}
                        </div>
                        <span className={`w-full text-xs sm:text-sm text-center truncate ${awayTeam?.is_bye ? "invisible" : ""} ${awayWon ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
                            {awayTeam?.name || "TBD"}
                        </span>
                    </div>
                </div>

                {/* LVR row — always rendered for completed matches to hold height; badges hidden for bye teams */}
                {match.status === "completed" && (
                    <div className="flex items-center justify-between gap-2 min-h-4">
                        <div>
                            {!homeTeam?.is_bye && match.home_team_lvr !== null && match.home_team_lvr !== undefined && (
                                <Badge variant="outline" className={`h-4 px-1.5 text-[10px] font-semibold tabular-nums ${match.home_team_lvr >= 0 ? 'bg-green-600/10 text-green-600 border-green-600/20' : 'bg-red-600/10 text-red-600 border-red-600/20'}`}>
                                    {match.home_team_lvr >= 0 ? '+' : ''}{match.home_team_lvr.toFixed(1)} LVR
                                </Badge>
                            )}
                        </div>
                        <div>
                            {!awayTeam?.is_bye && match.away_team_lvr !== null && match.away_team_lvr !== undefined && (
                                <Badge variant="outline" className={`h-4 px-1.5 text-[10px] font-semibold tabular-nums ${match.away_team_lvr >= 0 ? 'bg-green-600/10 text-green-600 border-green-600/20' : 'bg-red-600/10 text-red-600 border-red-600/20'}`}>
                                    {match.away_team_lvr >= 0 ? '+' : ''}{match.away_team_lvr.toFixed(1)} LVR
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {/* Rest remains the same - set scores, MVPs, officials */}

                {match.status === "completed" && sets.length > 0 && (
                    <div className="flex items-center justify-center gap-1 py-1.5">
                        {sets.map((set) => (
                            <div key={set.set_number} className="flex items-center gap-0.5 px-2 py-0.5 rounded-sm bg-muted/50 border border-border/50">
                                <span className={`text-xs font-semibold tabular-nums ${set.home_score > set.away_score ? "text-foreground" : "text-muted-foreground"}`}>
                                    {set.home_score}
                                </span>
                                <span className="text-[10px] text-muted-foreground">-</span>
                                <span className={`text-xs font-semibold tabular-nums ${set.away_score > set.home_score ? "text-foreground" : "text-muted-foreground"}`}>
                                    {set.away_score}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {match.status === "completed" && (matchMvp || loserMvp) && (
                    <div className="flex items-center gap-2 py-1.5 border-y border-border/50">
                        {matchMvp && (
                            <div className="flex items-center gap-2 flex-1">
                                {matchMvp.avatar_url && (
                                    <div className="relative w-7 h-7 rounded-full overflow-hidden border border-primary/30 shrink-0">
                                        <Image src={matchMvp.avatar_url} alt={matchMvp.username || "Player"} fill sizes="28px" className="object-cover" unoptimized />
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] uppercase tracking-wider text-primary font-semibold">Match MVP</span>
                                    <span className="text-xs font-semibold truncate">{matchMvp.display_name || matchMvp.username || "Unknown"}</span>
                                </div>
                            </div>
                        )}
                        {loserMvp && (
                            <div className="flex items-center gap-2 flex-1 justify-end">
                                <div className="flex flex-col items-end min-w-0">
                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Loser MVP</span>
                                    <span className="text-xs font-semibold truncate">{loserMvp.display_name || loserMvp.username || "Unknown"}</span>
                                </div>
                                {loserMvp.avatar_url && (
                                    <div className="relative w-7 h-7 rounded-full overflow-hidden border border-border shrink-0">
                                        <Image src={loserMvp.avatar_url} alt={loserMvp.username || "Player"} fill sizes="28px" className="object-cover" unoptimized />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {(referees.length > 0 || media.length > 0) && (
                    <div className="hidden sm:flex items-center gap-4 pt-2 border-t border-border text-xs">
                        {referees.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Refs</span>
                                <div className="flex gap-1.5 flex-wrap">
                                    {referees.map((official) => (
                                        <div key={official.id} className="flex items-center gap-1">
                                            <div className="relative w-5 h-5 rounded-full overflow-hidden border border-border">
                                                <AvatarImage src={official.avatar_url} alt={official.username || "Official"} sizes="20px" />
                                            </div>
                                            <span className="text-xs">{official.display_name || official.username || "Unknown"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {media.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Media</span>
                                <div className="flex gap-1.5 flex-wrap">
                                    {media.map((official) => (
                                        <div key={official.id} className="flex items-center gap-1">
                                            <div className="relative w-5 h-5 rounded-full overflow-hidden border border-border">
                                                <AvatarImage src={official.avatar_url} alt={official.username || "Official"} sizes="20px" />
                                            </div>
                                            <span className="text-xs">{official.display_name || official.username || "Unknown"}</span>
                                        </div>
                                    ))}
                                </div>
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
        <div className="panel p-3 sm:p-4 transition-colors">
            {inner}
        </div>
    );
}