"use client";

import React, { useMemo } from "react";
import { useStandings } from "@/app/hooks/useStandings";
import { useRegions } from "@/app/hooks/useRegions";
import { useSeasons } from "@/app/hooks/useSeasons";
import { StandingsTable } from "@/app/features/standings/StandingsTable";
import { Trophy } from "lucide-react";
import { AdminPageHeader } from "@/app/components/admin/AdminPageHeader";
import { useAdminContextStore } from "@/app/stores/adminContextStore";

export default function StandingsManagementPage() {
    const { selectedSeasonId, selectedRegionId } = useAdminContextStore();
    const { regions } = useRegions();
    const { seasons: allSeasons } = useSeasons();
    const { standings, isLoading: standingsLoading } = useStandings(
        selectedSeasonId ?? undefined,
        selectedRegionId ?? undefined,
    );

    const selectedSeason = allSeasons.find((s) => s.id === selectedSeasonId) ?? null;
    const selectedRegion = regions.find((r) => r.id === selectedRegionId);

    const stats = useMemo(() => {
        if (standings.length === 0) return { totalTeams: 0, avgLvr: 0, topLvr: 0 };
        const totalTeams = standings.length;
        const avgLvr = standings.reduce((sum, s) => sum + (s.total_lvr || 0), 0) / totalTeams;
        const topLvr = Math.max(...standings.map((s) => s.total_lvr || 0));
        return { totalTeams, avgLvr, topLvr };
    }, [standings]);

    return (
        <div className="admin-container">
            <div className="admin-section">
                <AdminPageHeader
                    icon={Trophy}
                    title="Standings"
                    description={selectedRegion && selectedSeason ? `${selectedRegion.name} • ${selectedSeason.name}` : "Select a season in the navbar"}
                    stats={standings.length > 0 ? (
                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Teams</div>
                                <div className="text-lg font-bold text-primary tabular-nums">{stats.totalTeams}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg LVR</div>
                                <div className="text-lg font-bold tabular-nums">{stats.avgLvr.toFixed(1)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Top LVR</div>
                                <div className="text-lg font-bold text-primary tabular-nums">{stats.topLvr.toFixed(1)}</div>
                            </div>
                        </div>
                    ) : null}
                />

                {selectedRegionId && selectedSeasonId ? (
                    <StandingsTable
                        standings={standings}
                        isLoading={standingsLoading}
                        qualifiedTeams={selectedSeason?.playoff_configs?.qualified_teams}
                        playinTeams={selectedSeason?.playoff_configs?.playin_teams}
                    />
                ) : (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Select a season in the navbar to view standings
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
