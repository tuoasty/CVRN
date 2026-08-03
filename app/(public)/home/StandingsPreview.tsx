"use client";

import { StandingWithInfo } from "@/server/domains/standing";
import { StandingMethod } from "@/shared/types/standing";
import { ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getLogoClassName } from "@/app/lib/logoClass";
import { buildPublicStandingsHref, buildPublicTeamHref } from "@/app/utils/matchDetailHref";

interface StandingsPreviewProps {
    standings: StandingWithInfo[];
    qualifiedTeams?: number;
    regionCode?: string;
    seasonSlug?: string;
    standingMethod?: StandingMethod;
}

export default function StandingsPreview({
                                                    standings,
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
                    // The view's rank column is the source of truth; index is only a fallback, and
                    // using it directly would desync the moment the view returns a tie or a gap.
                    const rank = standing.rank ?? index + 1;
                    const nextRank = topStandings[index + 1]?.rank ?? index + 2;
                    const wins = standing.wins || 0;
                    const losses = standing.losses || 0;
                    const isQualified = rank <= qualifiedTeams;
                    const isPodium = rank <= 3;
                    const teamHref = buildPublicTeamHref({regionCode, seasonSlug, teamSlug: standing.team_slug});

                    // One rule replaces four stripe weights: a line where qualification ends. Only
                    // renders when the cutoff actually falls inside the eight rows on show.
                    const showCutoff = isQualified
                        && index < topStandings.length - 1
                        && nextRank > qualifiedTeams;

                    // Uniform border on every row — the old conditional border-l-2/4 changed the
                    // border width per row, so content started at a different x on each one.
                    const rowClass = cn(
                        "flex items-center gap-3 p-2.5 rounded-sm border border-border",
                        "transition-colors hover:bg-muted/30"
                    );

                    const rowContent = (
                        <>
                            <div className="flex items-center justify-center w-6 h-6 rounded-sm bg-muted border border-border shrink-0">
                                <span className={cn(
                                    "text-xs font-bold tabular-nums",
                                    isPodium ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {rank}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {/* Logos keep full opacity below the cutoff — dimming the whole row
                                    took the team identity with it. */}
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
                                <span className={cn(
                                    "text-sm truncate",
                                    isPodium ? "font-bold" : "font-semibold",
                                    !isQualified && "text-muted-foreground"
                                )}>
                                    {standing.team_name}
                                </span>
                            </div>

                            <div className="text-xs font-bold tabular-nums text-muted-foreground">
                                {wins}-{losses}
                            </div>

                            {/* Neutral, not blue or red: a rating is data, and this system reserves
                                blue for actions and red for errors. */}
                            <div className={cn(
                                "text-sm font-bold tabular-nums",
                                isQualified ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {standingMethod === "points" || standingMethod === "points_without_bonus"
                                    ? ((standing.total_points || 0) + (standingMethod === "points" ? (standing.total_bonus || 0) : 0)).toFixed(1)
                                    : (standing.total_lvr || 0).toFixed(1)}
                            </div>
                        </>
                    );

                    return (
                        <Fragment key={standing.team_id}>
                            {teamHref ? (
                                <Link href={teamHref} prefetch={false} className={rowClass}>
                                    {rowContent}
                                </Link>
                            ) : (
                                <div className={rowClass}>{rowContent}</div>
                            )}
                            {showCutoff && <PlayoffCutoff />}
                        </Fragment>
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

/**
 * Where the playoff places run out. A dashed rule reads as a boundary without spending a colour —
 * blue means act and yellow means location in this system, and a cutoff is neither.
 */
function PlayoffCutoff() {
    return (
        <div className="relative flex items-center justify-center py-2" aria-hidden>
            <div className="absolute inset-x-0 border-t border-dashed border-muted-foreground/40" />
            <span className="relative bg-background px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Playoff cutoff
            </span>
        </div>
    );
}