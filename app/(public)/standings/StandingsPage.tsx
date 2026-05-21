"use client";

import { useMemo } from "react";
import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { useStandings } from "@/app/hooks/useStandings";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import { StandingsTable } from "@/app/features/standings/StandingsTable";
import SeasonSelectionMiddleware from "@/app/components/ui/SeasonSelectorMiddleware";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Trophy } from "lucide-react";
import {clientLogger} from "@/app/utils/clientLogger";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";

export default function StandingsPage() {
    const { selectedSeasonId, selectedRegionId } = usePublicContextStore();
    const { standings, isLoading: standingsLoading } = useStandings(selectedSeasonId || undefined, selectedRegionId || undefined);
    const { seasons } = useSeasons();
    const { regions } = useRegions();

    const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
    const selectedRegion = regions.find(r => r.id === selectedRegionId);

    const stats = useMemo(() => {
        if (standings.length === 0) return null;
        const totalTeams = standings.length;
        const avgLvr = standings.reduce((sum, s) => sum + (s.total_lvr || 0), 0) / totalTeams;
        clientLogger.info("standings", "standings lvr value", standings)
        const topLvr = Math.max(...standings.map(s => s.total_lvr || 0));
        return { totalTeams, avgLvr, topLvr };
    }, [standings]);

    const subtitle =
        seasons.length === 0
            ? undefined
            : selectedSeason
            ? `${selectedSeason.name}${selectedRegion ? ` · ${selectedRegion.name}` : ""}`
            : "";

    return (
        <>
            <SeasonSelectionMiddleware />

            <div className="page-wide space-y-6 py-6">
                <PublicPageHeader
                    icon={Trophy}
                    title="Standings"
                    subtitle={subtitle}
                    actions={
                        <div className="hidden sm:flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Teams</div>
                                {stats ? (
                                    <div className="text-lg font-bold text-primary tabular-nums">{stats.totalTeams}</div>
                                ) : (
                                    <Skeleton className="h-6 w-8 mt-0.5" />
                                )}
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg LVR</div>
                                {stats ? (
                                    <div className="text-lg font-bold tabular-nums">{(stats.avgLvr).toFixed(1)}</div>
                                ) : (
                                    <Skeleton className="h-6 w-10 mt-0.5" />
                                )}
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Top LVR</div>
                                {stats ? (
                                    <div className="text-lg font-bold text-primary tabular-nums">{(stats.topLvr).toFixed(1)}</div>
                                ) : (
                                    <Skeleton className="h-6 w-10 mt-0.5" />
                                )}
                            </div>
                        </div>
                    }
                />

                {selectedSeasonId && selectedRegionId ? (
                    standingsLoading && standings.length === 0 ? (
                        <div className="space-y-4">
                            <div className="panel p-4 border-l-4 border-l-primary/30">
                                <Skeleton className="h-8 w-64 rounded-sm" />
                            </div>
                            <div className="rounded-sm border border-border overflow-hidden">
                                <div className="space-y-0">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-border">
                                            <Skeleton className="h-10 w-10 rounded-sm shrink-0" />
                                            <div className="flex items-center gap-3 flex-1">
                                                <Skeleton className="h-10 w-10 rounded shrink-0" />
                                                <Skeleton className="h-5 w-32 rounded-sm" />
                                            </div>
                                            <Skeleton className="h-5 w-12 rounded-sm" />
                                            <Skeleton className="h-5 w-14 rounded-sm" />
                                            <Skeleton className="h-5 w-12 rounded-sm" />
                                            <Skeleton className="h-5 w-16 rounded-sm" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <StandingsTable
                            standings={standings}
                            isLoading={standingsLoading}
                            qualifiedTeams={selectedSeason?.playoff_configs?.qualified_teams}
                            playinTeams={selectedSeason?.playoff_configs?.playin_teams}
                        />
                    )
                ) : (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Select a season to view standings
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}