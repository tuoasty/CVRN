"use client";

import { StandingWithInfo } from "@/server/domains/standing";
import { ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMemo } from "react";

interface StandingsPreviewProps {
    standings: StandingWithInfo[];
    isLoading: boolean;
    qualifiedTeams?: number;
}

export default function StandingsPreview({
                                                    standings,
                                                    isLoading,
                                                    qualifiedTeams = 12,
                                                }: StandingsPreviewProps) {
    const router = useRouter();

    const topStandings = useMemo(() => {
        return [...standings]
            .sort((a, b) => (b.total_lvr || 0) - (a.total_lvr || 0))
            .slice(0, 8);
    }, [standings]);

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

                    return (
                        <div
                            key={standing.team_id}
                            className={`
                                flex items-center gap-3 p-2.5 rounded-sm border transition-all
                                ${rank === 1 ? 'bg-gradient-to-r from-primary/15 to-transparent border-l-4 border-l-primary' : ''}
                                ${rank === 2 || rank === 3 ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-l-primary/70' : ''}
                                ${rank > 3 && isQualified ? 'border-l-2 border-l-primary/40' : ''}
                                ${!isQualified ? 'opacity-60' : ''}
                                hover:bg-muted/30
                            `}
                        >
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
                                            className="object-contain mix-blend-multiply dark:mix-blend-screen"
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

                            {/* LVR */}
                            <div className={`text-sm font-bold tabular-nums ${displayLvr >= 100 ? 'text-primary' : 'text-destructive'}`}>
                                {displayLvr.toFixed(1)}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Button
                onClick={() => router.push('/standings')}
                variant="outline"
                className="w-full rounded-sm group"
            >
                View Full Standings
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
        </div>
    );
}