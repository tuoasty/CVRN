"use client";

import { useMemo } from "react";
import { useSeasonContext } from "@/app/(public)/[region]/[season]/context";
import { useStandings } from "@/app/hooks/useStandings";
import { StandingsTable } from "@/app/features/standings/StandingsTable";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Trophy } from "lucide-react";
import {clientLogger} from "@/app/utils/clientLogger";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";

export default function StandingsPage() {
    const { season, region } = useSeasonContext();
    const { standings, isLoading: standingsLoading } = useStandings(season.id, region.id);

    const regionCode = region.code;
    const seasonSlug = season.slug;

    const stats = useMemo(() => {
        if (standings.length === 0) return null;
        const totalTeams = standings.length;
        const avgLvr = standings.reduce((sum, s) => sum + (s.total_lvr || 0), 0) / totalTeams;
        clientLogger.info("standings", "standings lvr value", standings)
        const topLvr = Math.max(...standings.map(s => s.total_lvr || 0));
        return { totalTeams, avgLvr, topLvr };
    }, [standings]);

    const subtitle = `${season.name} · ${region.name}`;

    return (
        <>
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

                <StandingsTable
                    standings={standings}
                    isLoading={standingsLoading}
                    qualifiedTeams={season.playoff_configs?.qualified_teams}
                    playinTeams={season.playoff_configs?.playin_teams}
                    regionCode={regionCode}
                    seasonSlug={seasonSlug}
                />
            </div>
        </>
    );
}