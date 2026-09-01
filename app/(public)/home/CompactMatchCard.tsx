"use client";

import { MatchWithDetails } from "@/server/domains/match";
import { TeamWithRegion } from "@/server/domains/team";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { Calendar } from "lucide-react";

interface CompactMatchCardProps {
    matchDetails: MatchWithDetails;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    regionCode?: string;
    matchLabel: string;
    href?: string | null;
    compact?: boolean;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'pending':
            return {
                label: 'Pending',
                className: 'bg-secondary/10 text-secondary border-secondary/20'
            };
        case 'scheduled':
            return {
                label: 'Scheduled',
                className: 'bg-primary/10 text-primary border-primary/20'
            };
        case 'completed':
            return {
                label: 'Completed',
                className: 'bg-success/10 text-success border-success/20'
            };
        default:
            return { label: 'Unknown', className: '' };
    }
};

export default function CompactMatchCard({
    matchDetails,
    homeTeam,
    awayTeam,
    regionCode,
    matchLabel,
    href,
    compact = false,
}: CompactMatchCardProps) {
    const { match } = matchDetails;
    const statusConfig = getStatusConfig(match.status);
    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    const isCompleted = match.status === 'completed';
    const homeWon = isCompleted && (match.home_sets_won ?? 0) > (match.away_sets_won ?? 0);
    const awayWon = isCompleted && (match.away_sets_won ?? 0) > (match.home_sets_won ?? 0);

    const logoSize = compact ? 'w-4 h-4' : 'w-5 h-5';
    const logoSizePx = compact ? '16px' : '20px';

    const inner = (
        <div className={compact ? 'space-y-1' : 'space-y-2'}>
            <div className={`flex items-center justify-between ${compact ? 'pb-1' : 'pb-2'} border-b border-border/50`}>
                <Badge className={`rounded-sm text-[9px] h-4 px-1.5 font-semibold uppercase tracking-wider ${statusConfig.className}`}>
                    {statusConfig.label}
                </Badge>
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${match.match_type === "playoffs" ? "text-foreground" : "text-muted-foreground"}`}>
                    {matchLabel}
                </span>
            </div>

            <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                <div className={`flex items-center justify-between ${homeWon ? 'opacity-100' : isCompleted ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {homeTeam?.logo_url && (
                            <div className={`relative ${logoSize} shrink-0`}>
                                <Image src={homeTeam.logo_url} alt={homeTeam.name} fill sizes={logoSizePx} className="object-contain" />
                            </div>
                        )}
                        <span className="text-xs font-semibold truncate">
                            {homeTeam?.name || "TBD"}
                        </span>
                    </div>
                    {isCompleted && (
                        <span className="text-xs font-bold tabular-nums ml-2">
                            {match.home_sets_won}
                        </span>
                    )}
                </div>

                <div className={`flex items-center justify-between ${awayWon ? 'opacity-100' : isCompleted ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {awayTeam?.logo_url && (
                            <div className={`relative ${logoSize} shrink-0`}>
                                <Image src={awayTeam.logo_url} alt={awayTeam.name} fill sizes={logoSizePx} className="object-contain" />
                            </div>
                        )}
                        <span className="text-xs font-semibold truncate">
                            {awayTeam?.name || "TBD"}
                        </span>
                    </div>
                    {isCompleted && (
                        <span className="text-xs font-bold tabular-nums ml-2">
                            {match.away_sets_won}
                        </span>
                    )}
                </div>
            </div>

            <div className={`flex items-center gap-1 ${compact ? 'pt-1' : 'pt-1.5'} border-t border-border/50`}>
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                    {regionTimezone && match.scheduled_at
                        ? formatDateInTimezone(match.scheduled_at, regionTimezone)
                        : match.scheduled_at
                            ? new Date(match.scheduled_at).toLocaleString()
                            : "Time TBD"
                    }
                </span>
            </div>
        </div>
    );

    const padding = compact ? 'p-2' : 'p-3';

    return href ? (
        <Link href={href} prefetch={false} className={`block panel ${padding} hover:border-primary/30 transition-colors cursor-pointer`}>
            {inner}
        </Link>
    ) : (
        <div className={`panel ${padding} hover:border-primary/30 transition-colors`}>
            {inner}
        </div>
    );
}