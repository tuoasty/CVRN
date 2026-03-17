// /app/(public)/main/page.tsx

"use client";

import { useEffect, useState } from "react";
import { usePublicContextStore } from "@/app/stores/publicContextStore";
import { useUpcomingMatches, useRecentMatches } from "@/app/hooks/useMatches";
import { useSeasons } from "@/app/hooks/useSeasons";
import { useTeams } from "@/app/hooks/useTeams";
import { useRegions } from "@/app/hooks/useRegions";
import { Calendar, Clock, Trophy } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import SeasonSelectionMiddleware from "@/app/components/ui/SeasonSelectorMiddleware";
import CompactMatchCard from "@/app/(public)/home/CompactMatchCard";
import FeaturedMatchCard from "@/app/(public)/home/FeaturedMatchCard";
import MediaSidebar from "@/app/(public)/home/MediaSidebar";
import StandingsPreview from "@/app/(public)/home/StandingsPreview";
import { useStandings } from "@/app/hooks/useStandings";
import { StandingWithInfo } from "@/server/dto/standing.dto";

export default function HomePage() {
    const { selectedSeasonId, selectedRegionId } = usePublicContextStore();
    
    const { seasons } = useSeasons();
    const { regions } = useRegions();
    const { teams, isLoading: loadingTeams } = useTeams();
    
    const { matches: upcomingMatches, isLoading: loadingUpcoming } = useUpcomingMatches(selectedSeasonId || null, 5);
    const { matches: recentMatches, isLoading: loadingRecent } = useRecentMatches(selectedSeasonId || null, 5);

    const { standings, isLoading: standingsLoading } = useStandings(selectedSeasonId || undefined, selectedRegionId || undefined);

    const loading = loadingTeams || loadingUpcoming || loadingRecent;

    const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);
    const regionCode = regions.find((r) => r.id === selectedRegionId)?.code;

    const featuredMatch = upcomingMatches[0];
    const featuredHomeTeam = teams.find((t) => t.id === featuredMatch?.match.home_team_id);
    const featuredAwayTeam = teams.find((t) => t.id === featuredMatch?.match.away_team_id);

    return (
        <>
            <SeasonSelectionMiddleware />

            <div className="max-w-[1440px] mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
                    {/* Left Sidebar - Recent/Upcoming Matches */}
                    <aside className="space-y-6">
                        {/* Upcoming Matches */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <Clock className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                    Upcoming
                                </h3>
                            </div>

                            {loading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-32 rounded-sm" />
                                    ))}
                                </div>
                            ) : upcomingMatches.length === 0 ? (
                                <div className="panel p-4 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        No upcoming matches
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {upcomingMatches.map((matchDetails: any) => {
                                        const homeTeam = teams.find((t) => t.id === matchDetails.match.home_team_id);
                                        const awayTeam = teams.find((t) => t.id === matchDetails.match.away_team_id);

                                        return (
                                            <CompactMatchCard
                                                key={matchDetails.match.id}
                                                matchDetails={matchDetails}
                                                homeTeam={homeTeam}
                                                awayTeam={awayTeam}
                                                regionCode={regionCode}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Recent Matches */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <Calendar className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                    Recent
                                </h3>
                            </div>

                            {loading ? (
                                <div className="space-y-2">
                                    {[1, 2].map((i) => (
                                        <Skeleton key={i} className="h-32 rounded-sm" />
                                    ))}
                                </div>
                            ) : recentMatches.length === 0 ? (
                                <div className="panel p-4 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        No recent matches
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentMatches.map((matchDetails: any) => {
                                        const homeTeam = teams.find((t) => t.id === matchDetails.match.home_team_id);
                                        const awayTeam = teams.find((t) => t.id === matchDetails.match.away_team_id);

                                        return (
                                            <CompactMatchCard
                                                key={matchDetails.match.id}
                                                matchDetails={matchDetails}
                                                homeTeam={homeTeam}
                                                awayTeam={awayTeam}
                                                regionCode={regionCode}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Center Column - Featured Match + Standings */}
                    <main className="space-y-6">
                        {/* Featured Match */}
                        {loading ? (
                            <Skeleton className="h-64 rounded-sm" />
                        ) : featuredMatch ? (
                            <FeaturedMatchCard
                                matchDetails={featuredMatch}
                                homeTeam={featuredHomeTeam}
                                awayTeam={featuredAwayTeam}
                                regionCode={regionCode}
                            />
                        ) : (
                            <div className="panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Trophy className="h-12 w-12 text-muted-foreground/40 mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        No upcoming matches scheduled
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Standings */}
                        <div className="space-y-3">
                            <div className="border-t-2 border-primary/20 pt-4">
                                <h3 className="text-base font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
                                    Season Standings
                                </h3>
                                <StandingsPreview
                                    standings={standings}
                                    isLoading={standingsLoading}
                                    qualifiedTeams={selectedSeason?.playoff_configs?.qualified_teams}
                                />
                            </div>
                        </div>
                    </main>

                    {/* Right Sidebar - Media */}
                    <aside>
                        <MediaSidebar />
                    </aside>
                </div>
            </div>
        </>
    );
}