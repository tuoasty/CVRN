"use client";


import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { useTeams } from "@/app/hooks/useTeams";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import SeasonSelectionMiddleware from "@/app/components/ui/SeasonSelectorMiddleware";
import PublicTeamCard from "@/app/(public)/teams/PublicTeamCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Users } from "lucide-react";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";

export default function TeamsPage() {
    const { selectedSeasonId } = usePublicContextStore();
    const { teams: allTeams, isLoading: loading } = useTeams();
    const { seasons } = useSeasons();
    const { regions } = useRegions();

    const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
    const selectedRegion = regions.find(r => r.id === selectedSeason?.region_id);
    const teams = allTeams.filter(t => t.season_id === selectedSeasonId && !t.deleted_at);

    const subtitle =
        seasons.length === 0
            ? undefined
            : selectedSeason
            ? `${selectedSeason.name}${selectedRegion ? ` · ${selectedRegion.name}` : ""}${teams.length > 0 ? ` · ${teams.length} teams` : ""}`
            : "";

    return (
        <>
            <SeasonSelectionMiddleware />

            <div className="page-wide space-y-6 py-6">
                <PublicPageHeader icon={Users} title="Teams" subtitle={subtitle} />

                {!selectedSeasonId ? (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                Select a season to view teams
                            </p>
                        </div>
                    </div>
                ) : loading && teams.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-sm border border-border bg-card overflow-hidden">
                                <Skeleton className="h-36 w-full rounded-none" />
                                <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border">
                                    <Skeleton className="h-4 flex-1 rounded-sm" />
                                    <Skeleton className="h-4 w-8 rounded-sm shrink-0" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : teams.length === 0 ? (
                    <div className="panel p-16 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="text-center space-y-3">
                            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground font-medium">
                                No teams found for this season
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teams.map((team, index) => (
                            <PublicTeamCard key={team.id} team={team} isPriority={index < 3} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}