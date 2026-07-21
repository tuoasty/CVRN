import { StandingsTable } from "@/app/features/standings/StandingsTable";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";
import { StandingMethod } from "@/shared/types/standing";
import { StandingWithInfo } from "@/server/domains/standing";
import type { Region } from "@/shared/types/db";
import type { SeasonWithPlayoffConfig } from "@/server/domains/season";

type Props = {
    season: SeasonWithPlayoffConfig;
    region: Region;
    standings: StandingWithInfo[];
};

/**
 * Presentational only. Standings are fetched and cached on the server by the route above.
 * This previously read them through SWR, which meant an uncacheable server-action POST on
 * every view — so statically rendering the shell saved nothing.
 */
export default function StandingsPage({ season, region, standings }: Props) {
    const regionCode = region.code;
    const seasonSlug = season.slug;

    const standingMethod = region.standing_method as StandingMethod;
    const isPoints = standingMethod === "points" || standingMethod === "points_without_bonus";
    const stats = (() => {
        if (standings.length === 0) return null;
        const totalTeams = standings.length;
        const key = (s: typeof standings[number]) =>
            standingMethod === "points"
                ? (s.total_points || 0) + (s.total_bonus || 0)
                : standingMethod === "points_without_bonus"
                    ? (s.total_points || 0)
                    : (s.total_lvr || 0);
        const avg = standings.reduce((sum, s) => sum + key(s), 0) / totalTeams;
        const top = Math.max(...standings.map(key));
        return { totalTeams, avg, top };
    })();

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
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{isPoints ? "Avg Points" : "Avg LVR"}</div>
                                {stats ? (
                                    <div className="text-lg font-bold tabular-nums">{stats.avg.toFixed(1)}</div>
                                ) : (
                                    <Skeleton className="h-6 w-10 mt-0.5" />
                                )}
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{isPoints ? "Top Points" : "Top LVR"}</div>
                                {stats ? (
                                    <div className="text-lg font-bold text-primary tabular-nums">{stats.top.toFixed(1)}</div>
                                ) : (
                                    <Skeleton className="h-6 w-10 mt-0.5" />
                                )}
                            </div>
                        </div>
                    }
                />

                <StandingsTable
                    standings={standings}
                    isLoading={false}
                    qualifiedTeams={season.playoff_configs?.qualified_teams}
                    playinTeams={season.playoff_configs?.playin_teams}
                    regionCode={regionCode}
                    seasonSlug={seasonSlug}
                    standingMethod={standingMethod}
                />
            </div>
        </>
    );
}