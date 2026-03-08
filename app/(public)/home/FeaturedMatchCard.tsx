"use client";

import { MatchWithDetails } from "@/server/dto/match.dto";
import { TeamWithRegion } from "@/server/dto/team.dto";
import Image from "next/image";
import { Badge } from "@/app/components/ui/badge";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { Calendar, MapPin } from "lucide-react";

interface FeaturedMatchCardProps {
    matchDetails: MatchWithDetails;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    regionCode?: string;
}

export default function FeaturedMatchCard({
                                              matchDetails,
                                              homeTeam,
                                              awayTeam,
                                              regionCode,
                                          }: FeaturedMatchCardProps) {
    const { match } = matchDetails;
    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    return (
        <div className="panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-primary/20">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Next Match
                    </h3>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2">
                            BO{match.best_of}
                        </Badge>
                        {match.match_type === "playoffs" && (
                            <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2 bg-purple-600/10 text-purple-600 border-purple-600/20">
                                Playoff
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 py-4">
                    <div className="flex flex-col items-center gap-3">
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

                    <div className="flex items-center justify-center px-4">
                        <span className="text-2xl font-bold text-muted-foreground/50">VS</span>
                    </div>

                    <div className="flex flex-col items-center gap-3">
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

                <div className="flex items-center justify-center gap-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                            {regionTimezone && match.scheduled_at
                                ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                                : match.scheduled_at
                                    ? new Date(match.scheduled_at).toLocaleString()
                                    : "Time TBD"
                            }
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}