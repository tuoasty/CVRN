"use client";

import { useEffect, useMemo, useState } from "react";
import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { useStandingsStore } from "@/app/stores/standingStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import { StandingsTable } from "@/app/features/standings/StandingsTable";
import SeasonSelectionMiddleware from "@/app/components/ui/SeasonSelectorMiddleware";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { StandingWithInfo } from "@/server/dto/standing.dto";
import { toast } from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";

export default function StandingsPage() {
    const { selectedSeasonId, selectedRegionId } = usePublicContextStore();
    const { fetchStandings, loading: standingsLoading } = useStandingsStore();
    const { allSeasonsCache } = useSeasonsStore();
    const { allRegionsCache } = useRegionsStore();

    const [standings, setStandings] = useState<StandingWithInfo[]>([]);

    const selectedSeason = allSeasonsCache?.data?.find(s => s.id === selectedSeasonId);
    const selectedRegion = allRegionsCache?.data?.find(r => r.id === selectedRegionId);

    const stats = useMemo(() => {
        if (standings.length === 0) return null;
        const totalTeams = standings.length;
        const avgLvr = standings.reduce((sum, s) => sum + (s.total_lvr || 0), 0) / totalTeams;
        clientLogger.info("standings", "standings lvr value", standings)
        const topLvr = Math.max(...standings.map(s => s.total_lvr || 0));
        return { totalTeams, avgLvr, topLvr };
    }, [standings]);

    useEffect(() => {
        if (!selectedSeasonId || !selectedRegionId) {
            setStandings([]);
            return;
        }

        fetchStandings({ seasonId: selectedSeasonId, regionId: selectedRegionId })
            .then(setStandings)
            .catch((error) => toast.error("Failed to load standings", error.message));
    }, [selectedSeasonId, selectedRegionId]);

    return (
        <>
            <SeasonSelectionMiddleware />

            <div className="space-y-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                            <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Standings
                            </h1>
                            {selectedSeason && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {selectedSeason.name}
                                    {selectedRegion && ` · ${selectedRegion.name}`}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {stats && (
                            <div className="hidden sm:flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Teams</div>
                                    <div className="text-lg font-bold text-primary tabular-nums">{stats.totalTeams}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg LVR</div>
                                    <div className="text-lg font-bold tabular-nums">{(stats.avgLvr).toFixed(1)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Top LVR</div>
                                    <div className="text-lg font-bold text-primary tabular-nums">{(stats.topLvr).toFixed(1)}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

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