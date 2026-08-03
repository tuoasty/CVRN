"use client";

import { MatchWithDetails } from "@/server/domains/match";
import { TeamWithRegion } from "@/server/domains/team";
import type { MediaPost } from "@/server/domains/media";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import GfxFrame from "@/app/features/media/GfxFrame";

interface FeaturedMatchCardProps {
    matchDetails: MatchWithDetails;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    regionCode?: string;
    matchLabel: string;
    isRecent?: boolean;
    href?: string | null;
    /** When present the graphic becomes the card itself; see the full-bleed branch below. */
    gfx?: MediaPost | null;
}

export default function FeaturedMatchCard({
    matchDetails,
    homeTeam,
    awayTeam,
    regionCode,
    matchLabel,
    isRecent = false,
    href,
    gfx = null,
}: FeaturedMatchCardProps) {
    const { match } = matchDetails;
    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    const isCompleted = match.status === "completed";
    const homeWon = isCompleted && (match.home_sets_won ?? 0) > (match.away_sets_won ?? 0);
    const awayWon = isCompleted && (match.away_sets_won ?? 0) > (match.home_sets_won ?? 0);

    const isPlayoff = match.match_type === "playoffs";
    const heading = isRecent ? "Most Recent Match" : "Next Match";
    const when = regionTimezone && match.scheduled_at
        ? formatDateInTimezone(match.scheduled_at, regionTimezone)
        : match.scheduled_at
        ? new Date(match.scheduled_at).toLocaleString()
        : "Time TBD";

    /**
     * Full bleed. The card is 768×376 (2.04:1) against a 16:9 graphic, so filling it crops
     * roughly 13% of the width — every layout that puts the graphic in a strip above the
     * matchup crops 30–60% of its height instead. Colours here are literal white rather than
     * theme tokens: the surface is someone's artwork, not `--card`, in either theme.
     */
    const bleedInner = gfx?.image_url && (
        <>
            <GfxFrame
                src={gfx.image_url}
                alt={gfx.title}
                priority
                sizes="768px"
                className="absolute inset-0"
            />

            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-5 py-4 bg-gradient-to-b from-black/85 to-transparent">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-white/85">
                    {heading}
                </h3>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2 bg-black/50 text-white/80 border-white/25">
                        BO{match.best_of}
                    </Badge>
                    <Badge
                        variant="outline"
                        className={cn(
                            "rounded-sm text-[10px] h-5 px-2",
                            isPlayoff
                                ? "bg-purple-600/25 text-purple-200 border-purple-300/30"
                                : "bg-black/50 text-white/80 border-white/25"
                        )}
                    >
                        {matchLabel}
                    </Badge>
                </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 px-5 pt-12 pb-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
                <div className="flex items-center gap-3">
                    <BleedTeam team={homeTeam} dim={isCompleted && !homeWon} />
                    <span className="shrink-0 text-xl font-bold tabular-nums text-white">
                        {isCompleted ? `${match.home_sets_won} – ${match.away_sets_won}` : "VS"}
                    </span>
                    <BleedTeam team={awayTeam} dim={isCompleted && !awayWon} reverse />
                    <span className="shrink-0 ml-auto flex items-center gap-1.5 text-xs text-white/75">
                        <Calendar className="h-3.5 w-3.5" />
                        {when}
                    </span>
                </div>
            </div>
        </>
    );

    const plainInner = (
        <div className="flex flex-col justify-between h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-primary/20">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {heading}
                </h3>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2">
                        BO{match.best_of}
                    </Badge>
                    <Badge
                        variant="outline"
                        className={cn(
                            "rounded-sm text-[10px] h-5 px-2",
                            isPlayoff
                                ? "bg-purple-600/10 text-purple-600 border-purple-600/20"
                                : "bg-muted/50 text-muted-foreground"
                        )}
                    >
                        {matchLabel}
                    </Badge>
                </div>
            </div>

            {/* Teams */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 py-8">
                <div className={cn("flex flex-col items-center gap-3", isCompleted && !homeWon && "opacity-60")}>
                    {homeTeam?.logo_url && (
                        <div className="relative w-20 h-20">
                            <Image src={homeTeam.logo_url} alt={homeTeam.name} fill priority sizes="80px" className="object-contain" />
                        </div>
                    )}
                    <span className="font-bold text-center text-base">{homeTeam?.name || "TBD"}</span>
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

                <div className={cn("flex flex-col items-center gap-3", isCompleted && !awayWon && "opacity-60")}>
                    {awayTeam?.logo_url && (
                        <div className="relative w-20 h-20">
                            <Image src={awayTeam.logo_url} alt={awayTeam.name} fill priority sizes="80px" className="object-contain" />
                        </div>
                    )}
                    <span className="font-bold text-center text-base">{awayTeam?.name || "TBD"}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-4 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{when}</span>
                </div>
            </div>
        </div>
    );

    // The bleed variant is 16:9 so a correctly-sized graphic fills it exactly at every breakpoint;
    // min-h keeps the overlays from crushing it in the narrow three-column range. The plain variant
    // holds no artwork, so it keeps a fixed height — the two never render together.
    const wrapperClass = bleedInner
        ? "panel relative overflow-hidden aspect-video min-h-[280px] bg-black"
        : "panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent h-[376px]";
    const hoverClass = bleedInner ? "hover:border-primary/60" : "hover:border-l-primary/60";

    return href ? (
        <Link href={href} prefetch={false} className={`block ${wrapperClass} ${hoverClass} cursor-pointer transition-colors`}>
            {bleedInner || plainInner}
        </Link>
    ) : (
        <div className={wrapperClass}>
            {bleedInner || plainInner}
        </div>
    );
}

// min-w-0 without flex-1: the pair sits at its natural width so the matchup packs to the left,
// and only gives ground once long names would overflow the bar.
function BleedTeam({ team, dim, reverse }: { team?: TeamWithRegion; dim: boolean; reverse?: boolean }) {
    return (
        <div className={cn("flex items-center gap-2.5 min-w-0", reverse && "flex-row-reverse", dim && "opacity-60")}>
            {team?.logo_url && (
                <div className="relative w-9 h-9 shrink-0">
                    {/* A dark logo on a transparent PNG disappears into the bottom gradient, and a
                        dark shadow cannot rescue it. The white halo does; the dark one grounds
                        light logos. */}
                    <Image
                        src={team.logo_url}
                        alt={team.name}
                        fill
                        sizes="36px"
                        className="object-contain [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.65))_drop-shadow(0_1px_3px_rgba(0,0,0,0.85))]"
                    />
                </div>
            )}
            <span className={cn("text-sm font-bold text-white truncate min-w-0", reverse && "text-right")}>
                {team?.name || "TBD"}
            </span>
        </div>
    );
}
