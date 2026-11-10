"use client";

import {useMemo} from "react";
import {useStandings} from "@/app/hooks/useStandings";
import {useRegions} from "@/app/hooks/useRegions";
import {useSeasons} from "@/app/hooks/useSeasons";
import {useRecentMatches, useUpcomingMatches} from "@/app/hooks/useMatches";
import {useAdminContextStore} from "@/app/stores/adminContextStore";
import type {StandingMethod} from "@/shared/types/standing";
import {buildStandingsTable} from "./model/buildStandingsTable";
import {StandingsView} from "./StandingsView";
import {StandingsHeaderSkeleton, StandingsTableSkeleton} from "./StandingsSkeleton";

const ADMIN_MATCH_LIMIT = 100;

export default function StandingsManagementPage() {
    const {selectedSeasonId} = useAdminContextStore();
    const {regions} = useRegions();
    const {seasons} = useSeasons();

    const season = seasons.find(s => s.id === selectedSeasonId) ?? null;
    const region = season ? regions.find(r => r.id === season.region_id) ?? null : null;

    const {standings, isLoading: standingsLoading} = useStandings(season?.id, region?.id);
    const {matches: completed, isLoading: completedLoading} = useRecentMatches(season?.id ?? null, ADMIN_MATCH_LIMIT);
    const {matches: upcoming, isLoading: upcomingLoading} = useUpcomingMatches(season?.id ?? null, ADMIN_MATCH_LIMIT);

    const model = useMemo(() => {
        if (!season || !region) return null;
        return buildStandingsTable({
            standings,
            completed,
            upcoming,
            method: region.standing_method as StandingMethod,
            qualifiedTeams: season.playoff_configs?.qualified_teams,
            playinTeams: season.playoff_configs?.playin_teams,
        });
    }, [season, region, standings, completed, upcoming]);

    if (!selectedSeasonId) {
        return (
            <div className="admin-container">
                <div className="admin-section">
                    <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
                    <p className="py-16 text-center text-sm text-muted-foreground">Select a season in the navbar to view standings.</p>
                </div>
            </div>
        );
    }

    const loading = !model || standingsLoading || completedLoading || upcomingLoading;

    return (
        <div className="admin-container">
            <div className="admin-section">
                {loading || !season || !region ? (
                    <>
                        <StandingsHeaderSkeleton />
                        <StandingsTableSkeleton />
                    </>
                ) : (
                    <StandingsView
                        model={model}
                        regionCode={region.code}
                        seasonSlug={season.slug}
                        linkMode="admin"
                        header={
                            <>
                                <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
                                <p className="mt-0.5 text-sm text-muted-foreground">{season.name} · {region.name}</p>
                            </>
                        }
                    />
                )}
            </div>
        </div>
    );
}
