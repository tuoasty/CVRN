"use client";


import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { useTeams } from "@/app/hooks/useTeams";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useRegions } from "@/app/hooks/useRegions";
import PublicTeamCard from "@/app/(public)/teams/PublicTeamCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Users } from "lucide-react";
import { PublicPageHeader } from "@/app/components/public/PublicPageHeader";

type Props = { initialSeasonId?: string | null };

export default function TeamsPage({ initialSeasonId }: Props) {
    const { selectedSeasonId } = usePublicContextStore();
    const { teams: allTeams, isLoading: loading } = useTeams();
    const { seasons } = useSeasons();
    const { regions } = useRegions();

    // Use Zustand-seeded value on client; fall back to server-computed initial on first render
    // so the server renders the real grid immediately (no skeleton → grid CLS).
    const effectiveSeasonId = selectedSeasonId ?? initialSeasonId ?? null;

    const selectedSeason = seasons.find(s => s.id === effectiveSeasonId);
    const selectedRegion = regions.find(r => r.id === selectedSeason?.region_id);
    const teams = allTeams.filter(t => t.season_id === effectiveSeasonId && !t.deleted_at);

    const subtitle =
        seasons.length === 0
            ? undefined
            : selectedSeason
            ? `${selectedSeason.name}${selectedRegion ? ` · ${selectedRegion.name}` : ""}${teams.length > 0 ? ` · ${teams.length} teams` : ""}`
            : "";

    return (
        <>
            <div className="page-wide space-y-6 py-6">
                <PublicPageHeader icon={Users} title="Teams" subtitle={subtitle} />

                {loading && teams.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-sm border border-border bg-card overflow-hidden">
                                <Skeleton className="h-36 w-full rounded-none" />
                                <div className="border-t border-border">
                                    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
                                        <Skeleton className="h-4 flex-1 rounded-sm" />
                                        <Skeleton className="h-4 w-8 rounded-sm shrink-0" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 pb-2.5">
                                        <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                                        <Skeleton className="h-3 w-20 rounded-sm" />
                                    </div>
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