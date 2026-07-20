"use client";

import { StandingWithInfo } from "@/server/domains/standing";
import { StandingMethod } from "@/shared/types/standing";
import { ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { getLogoClassName } from "@/app/lib/logoClass";
import { buildPublicStandingsHref, buildPublicTeamHref } from "@/app/utils/matchDetailHref";

interface StandingsPreviewProps {
    standings: StandingWithInfo[];
    isLoading: boolean;
    qualifiedTeams?: number;
    regionCode?: string;
    seasonSlug?: string;
    standingMethod?: StandingMethod;
}

export default function StandingsPreview({
                                                    standings,
                                                    isLoading,
                                                    qualifiedTeams = 12,
                                                    regionCode,
                                                    seasonSlug,
                                                    standingMethod = "lvr",
                                                }: StandingsPreviewProps) {
    // Ranking logic lives in the standings view's rank column — the single source of truth.
    const topStandings = useMemo(() => {
        return [...standings]
            .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
            .slice(0, 8);
    }, [standings]);

    const standingsHref = buildPublicStandingsHref({ regionCode, seasonSlug });

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted/30 rounded-sm animate-pulse" />
                ))}
            </div>
        );
    }

    if (standings.length === 0) {
        return (
            <div className="text-center py-8">
                <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No standings available</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                {topStandings.map((standing, index) => {
                    const rank = index + 1;
                    const wins = standing.wins || 0;
                    const losses = standing.losses || 0;
                    const displayLvr = standing.total_lvr || 0;
                    const isQualified = rank <= qualifiedTeams;
                    const teamHref = buildPublicTeamHref({regionCode, seasonSlug, teamSlug: standing.team_slug});
                    const rowClass = `
                        flex items-center gap-3 p-2.5 rounded-sm border transition-all
                        ${rank === 1 ? 'bg-gradient-to-r from-primary/15 to-transparent border-l-4 border-l-primary' : ''}
                        ${rank === 2 || rank === 3 ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-l-primary/70' : ''}
                        ${rank > 3 && isQualified ? 'border-l-2 border-l-primary/40' : ''}
                        ${!isQualified ? 'opacity-60' : ''}
                        hover:bg-muted/30
                    `;

                    const rowContent = (
                        <>
                            {/* Rank Badge */}
                            <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-muted border border-border shrink-0">
                                <span className="text-xs font-bold tabular-nums">{rank}</span>
                            </div>

                            {/* Team Logo & Name */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {standing.team_logo_url && (
                                    <div className="relative w-6 h-6 shrink-0">
                                        <Image
                                            src={standing.team_logo_url}
                                            alt={standing.team_name || ""}
                                            fill
                                            sizes="24px"
                                            className={getLogoClassName(standing.team_logo_bg_removed ?? false)}
                                        />
                                    </div>
                                )}
                                <span className="text-sm font-semibold truncate">
                                    {standing.team_name}
                                </span>
                            </div>

                            {/* Record */}
                            <div className="text-xs font-bold tabular-nums text-muted-foreground">
                                {wins}-{losses}
                            </div>

                            {/* LVR / Points */}
                            {standingMethod === "points" || standingMethod === "points_without_bonus" ? (
                                <div className="text-sm font-bold tabular-nums text-primary">
                                    {((standing.total_points || 0) + (standingMethod === "points" ? (standing.total_bonus || 0) : 0)).toFixed(1)}
                                </div>
                            ) : (
                                <div className={`text-sm font-bold tabular-nums ${displayLvr >= 100 ? 'text-primary' : 'text-destructive'}`}>
                                    {displayLvr.toFixed(1)}
                                </div>
                            )}
                        </>
                    );

                    return teamHref ? (
                        <Link key={standing.team_id} href={teamHref} className={rowClass}>
                            {rowContent}
                        </Link>
                    ) : (
                        <div key={standing.team_id} className={rowClass}>
                            {rowContent}
                        </div>
                    );
                })}
            </div>

            {standingsHref && (
                <Button variant="outline" className="w-full rounded-sm group" asChild>
                    <Link href={standingsHref}>
                        View Full Standings
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </Button>
            )}
        </div>
    );
}