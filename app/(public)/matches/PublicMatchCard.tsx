"use client";

import Image from "next/image";
import { Badge } from "@/app/components/ui/badge";
import { MatchWithDetails } from "@/server/dto/match.dto";
import { TeamWithRegion } from "@/server/dto/team.dto";
import { Player } from "@/shared/types/db";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";

interface PublicMatchCardProps {
    matchDetails: MatchWithDetails;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    matchMvp?: Player | null;
    loserMvp?: Player | null;
    regionCode?: string;
    index: number;
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

export default function PublicMatchCard({ matchDetails, homeTeam, awayTeam, matchMvp, loserMvp, regionCode, index }: PublicMatchCardProps) {
    const { match, sets, officials } = matchDetails;
    const statusConfig = getStatusConfig(match.status);
    const referees = officials.filter(o => o.official_type === "referee");
    const media = officials.filter(o => o.official_type === "media");
    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    const homeWon = (match.home_sets_won ?? 0) > (match.away_sets_won ?? 0);
    const awayWon = (match.away_sets_won ?? 0) > (match.home_sets_won ?? 0);

    return (
        <div className="panel p-4">
            <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Match {index + 1}
                        </span>
                        <Badge variant="outline" className={`rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider ${statusConfig.className}`}>
                            {statusConfig.label}
                        </Badge>
                        <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2">
                            BO{match.best_of}
                        </Badge>
                        {match.match_type === "playoffs" && (
                            <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2 bg-purple-600/10 text-purple-600 border-purple-600/20">
                                Playoff
                            </Badge>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {regionTimezone
                            ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                            : match.scheduled_at
                                ? new Date(match.scheduled_at).toLocaleString()
                                : "Time TBD"}
                    </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
                    <div className="flex justify-end items-center gap-2.5">
                        <div className="flex flex-col items-end gap-0.5 min-w-0">
                            <span className={`font-semibold text-sm text-right truncate w-full ${homeWon ? "text-foreground" : "text-muted-foreground"}`}>
                                {homeTeam?.name || "TBD"}
                            </span>
                            {match.status === "completed" && (
                                <>
                                    {homeWon && (
                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wider border-0 bg-green-600/10 text-green-600">
                                            Winner
                                        </Badge>
                                    )}
                                    {match.is_forfeit && !homeWon && (
                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wider border-0 bg-red-600/10 text-red-600">
                                            Forfeit
                                        </Badge>
                                    )}
                                </>
                            )}
                        </div>
                        {homeTeam?.logo_url && (
                            <div className="relative w-10 h-10 shrink-0">
                                <Image src={homeTeam.logo_url} alt={homeTeam.name} fill sizes="40px" className="object-contain mix-blend-multiply dark:mix-blend-screen" />
                            </div>
                        )}
                    </div>

                    {match.status === "completed" && match.home_sets_won !== null && match.away_sets_won !== null ? (
                        <div className="flex items-center gap-2 px-2">
                            <span className={`text-xl font-bold tabular-nums ${homeWon ? "text-foreground" : "text-muted-foreground"}`}>{match.home_sets_won}</span>
                            <span className="text-sm text-muted-foreground/50 font-medium">-</span>
                            <span className={`text-xl font-bold tabular-nums ${awayWon ? "text-foreground" : "text-muted-foreground"}`}>{match.away_sets_won}</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center px-2">
                            <span className="text-base font-bold text-muted-foreground/50">VS</span>
                        </div>
                    )}

                    <div className="flex justify-start items-center gap-2.5">
                        {awayTeam?.logo_url && (
                            <div className="relative w-10 h-10 shrink-0">
                                <Image src={awayTeam.logo_url} alt={awayTeam.name} fill sizes="40px" className="object-contain mix-blend-multiply dark:mix-blend-screen" />
                            </div>
                        )}
                        <div className="flex flex-col items-start gap-0.5 min-w-0">
                            <span className={`font-semibold text-sm text-left truncate w-full ${awayWon ? "text-foreground" : "text-muted-foreground"}`}>
                                {awayTeam?.name || "TBD"}
                            </span>
                            {match.status === "completed" && (
                                <>
                                    {awayWon && (
                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wider border-0 bg-green-600/10 text-green-600">
                                            Winner
                                        </Badge>
                                    )}
                                    {match.is_forfeit && !awayWon && (
                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wider border-0 bg-red-600/10 text-red-600">
                                            Forfeit
                                        </Badge>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

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
                                        <Image src={matchMvp.avatar_url} alt={matchMvp.username || "Player"} fill sizes="28px" className="object-cover" />
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
                                        <Image src={loserMvp.avatar_url} alt={loserMvp.username || "Player"} fill sizes="28px" className="object-cover" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {(referees.length > 0 || media.length > 0) && (
                    <div className="flex items-center gap-4 pt-2 border-t border-border text-xs">
                        {referees.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Refs</span>
                                <div className="flex gap-1.5 flex-wrap">
                                    {referees.map((official) => (
                                        <div key={official.id} className="flex items-center gap-1">
                                            {official.avatar_url && (
                                                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-border">
                                                    <Image src={official.avatar_url} alt={official.username || "Official"} fill sizes="20px" className="object-cover" />
                                                </div>
                                            )}
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
                                            {official.avatar_url && (
                                                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-border">
                                                    <Image src={official.avatar_url} alt={official.username || "Official"} fill sizes="20px" className="object-cover" />
                                                </div>
                                            )}
                                            <span className="text-xs">{official.display_name || official.username || "Unknown"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}