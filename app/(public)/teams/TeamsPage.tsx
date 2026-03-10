"use client";

import { useEffect } from "react";
import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { useTeamsStore } from "@/app/stores/teamStore";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useRegionsStore } from "@/app/stores/regionStore";
import SeasonSelectionMiddleware from "@/app/components/ui/SeasonSelectorMiddleware";
import PublicTeamCard from "@/app/(public)/teams/PublicTeamCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Users } from "lucide-react";

export default function TeamsPage() {
    const { selectedSeasonId } = usePublicContextStore();
    const { allTeamsCache, fetchAllTeams, loading } = useTeamsStore();
    const { allSeasonsCache } = useSeasonsStore();
    const { allRegionsCache } = useRegionsStore();

    const selectedSeason = allSeasonsCache?.data?.find(s => s.id === selectedSeasonId);
    const selectedRegion = allRegionsCache?.data?.find(r => r.id === selectedSeason?.region_id);

    useEffect(() => {
        fetchAllTeams();
    }, []);

    const allTeams = allTeamsCache?.data || [];
    const teams = allTeams.filter(t => t.season_id === selectedSeasonId && !t.deleted_at);

    return (
        <>
            <SeasonSelectionMiddleware />

            <div className="space-y-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-primary/10 border border-primary/20">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Teams
                            </h1>
                            {selectedSeason && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {selectedSeason.name}
                                    {selectedRegion && ` · ${selectedRegion.name}`}
                                    {teams.length > 0 && ` · ${teams.length} teams`}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {[...Array(10)].map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-sm" />
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {teams.map(team => (
                            <PublicTeamCard key={team.id} team={team} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}