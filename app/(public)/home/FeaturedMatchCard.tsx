"use client";

import { MatchWithDetails } from "@/server/domains/match";
import { TeamWithRegion } from "@/server/domains/team";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { Calendar } from "lucide-react";

interface FeaturedMatchCardProps {
    matchDetails: MatchWithDetails;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    regionCode?: string;
    matchLabel: string;
    isRecent?: boolean;
    href?: string | null;
}

export default function FeaturedMatchCard({
    matchDetails,
    homeTeam,
    awayTeam,
    regionCode,
    matchLabel,
    isRecent = false,
    href,
}: FeaturedMatchCardProps) {
    const { match } = matchDetails;
    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    const isCompleted = match.status === "completed";
    const homeWon = isCompleted && (match.home_sets_won ?? 0) > (match.away_sets_won ?? 0);
    const awayWon = isCompleted && (match.away_sets_won ?? 0) > (match.home_sets_won ?? 0);

    const isPlayoff = match.match_type === "playoffs";

    const inner = (
        <div className="flex flex-col justify-between min-h-[260px]">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-primary/20">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {isRecent ? "Most Recent Match" : "Next Match"}
                    </h3>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2">
                            BO{match.best_of}
                        </Badge>
                        <Badge
                            variant="outline"
                            className={`rounded-sm text-[10px] h-5 px-2 ${
                                isPlayoff
                                    ? "bg-purple-600/10 text-purple-600 border-purple-600/20"
                                    : "bg-muted/50 text-muted-foreground"
                            }`}
                        >
                            {matchLabel}
                        </Badge>
                    </div>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 py-8">
                    <div className={`flex flex-col items-center gap-3 ${homeWon ? "opacity-100" : isCompleted ? "opacity-60" : ""}`}>
                        {homeTeam?.logo_url && (
                            <div className="relative w-20 h-20">
                                <Image
                                    src={homeTeam.logo_url}
                                    alt={homeTeam.name}
                                    fill
                                    sizes="80px"
                                    className="object-contain"
                                />
                            </div>
                        )}
                        <span className="font-bold text-center text-base">
                            {homeTeam?.name || "TBD"}
                        </span>
                    </div>

                    <div className="flex flex-col items-center justify-center px-4 gap-1">
                        {isCompleted ? (
                            <span className="text-2xl font-bold tabular-nums">
                                {match.home_sets_won} – {match.away_sets_won}
                            </span>
                        ) : (
                            <span className="text-2xl font-bold text-muted-foreground/50">VS</span>
                        )}
                    </div>

                    <div className={`flex flex-col items-center gap-3 ${awayWon ? "opacity-100" : isCompleted ? "opacity-60" : ""}`}>
                        {awayTeam?.logo_url && (
                            <div className="relative w-20 h-20">
                                <Image
                                    src={awayTeam.logo_url}
                                    alt={awayTeam.name}
                                    fill
                                    sizes="80px"
                                    className="object-contain"
                                />
                            </div>
                        )}
                        <span className="font-bold text-center text-base">
                            {awayTeam?.name || "TBD"}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                            {regionTimezone && match.scheduled_at
                                ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                                : match.scheduled_at
                                ? new Date(match.scheduled_at).toLocaleString()
                                : "Time TBD"}
                        </span>
                    </div>
                </div>
            </div>
    );

    const wrapperClass = "panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent";

    return href ? (
        <Link href={href} className={`block ${wrapperClass} cursor-pointer hover:border-l-primary/60 transition-colors`}>
            {inner}
        </Link>
    ) : (
        <div className={wrapperClass}>
            {inner}
        </div>
    );
}
