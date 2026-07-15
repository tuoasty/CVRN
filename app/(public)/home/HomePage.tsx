"use client";

import { useSeasonContext } from "@/app/(public)/[region]/[season]/context";
import { useUpcomingMatches, useRecentMatches } from "@/app/hooks/useMatches";
import { useTeams } from "@/app/hooks/useTeams";
import { useSeasonPodium } from "@/app/hooks/useSeasonPodium";
import { Calendar, Clock, Trophy } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import CompactMatchCard from "@/app/(public)/home/CompactMatchCard";
import FeaturedMatchCard from "@/app/(public)/home/FeaturedMatchCard";
import SeasonChampionCard from "@/app/(public)/home/SeasonChampionCard";
import MediaSidebar from "@/app/(public)/home/MediaSidebar";
import StandingsPreview from "@/app/(public)/home/StandingsPreview";
import { StandingMethod } from "@/shared/types/standing";
import { useStandings } from "@/app/hooks/useStandings";
import { MatchWithDetails } from "@/server/domains/match";
import { computeMatchLabels } from "@/app/utils/matchLabel";
import { buildPublicMatchHref } from "@/app/utils/matchDetailHref";

export default function HomePage() {
    const { season, region } = useSeasonContext();

    const selectedSeasonId = season.id;
    const selectedRegionId = region.id;
    const regionCode = region.code.toLowerCase();
    const seasonSlug = season.slug;

    const { teams, isLoading: loadingTeams } = useTeams();

    const { matches: upcomingMatches, isLoading: loadingUpcoming } = useUpcomingMatches(selectedSeasonId, 5);
    const { matches: recentMatches, isLoading: loadingRecent } = useRecentMatches(selectedSeasonId, 6);
    const { standings, isLoading: standingsLoading } = useStandings(selectedSeasonId, selectedRegionId);

    const isSeasonCompleted = season.end_date
        ? new Date(season.end_date) < new Date()
        : false;

    const bothSections = !isSeasonCompleted;
    const upcomingDisplay = bothSections ? upcomingMatches.slice(0, 4) : upcomingMatches;
    const recentDisplay   = bothSections ? recentMatches.slice(0, 4) : recentMatches.slice(0, 6);

    const { podium, isLoading: podiumLoading } = useSeasonPodium(
        isSeasonCompleted ? selectedSeasonId : null
    );

    const hasFeaturedUpcoming = !isSeasonCompleted && upcomingMatches.length > 0;
    const hasFeaturedRecent = !isSeasonCompleted && upcomingMatches.length === 0 && recentMatches.length > 0;
    const featuredMatch = hasFeaturedUpcoming
        ? upcomingMatches[0]
        : hasFeaturedRecent
        ? recentMatches[0]
        : undefined;

    const featuredHomeTeam = teams.find((t) => t.id === featuredMatch?.match.home_team_id);
    const featuredAwayTeam = teams.find((t) => t.id === featuredMatch?.match.away_team_id);

    const upcomingLabels = computeMatchLabels(upcomingMatches);
    const recentLabels = computeMatchLabels(recentMatches);

    const featuredLabel = hasFeaturedUpcoming
        ? upcomingLabels[0]
        : hasFeaturedRecent
        ? computeMatchLabels([recentMatches[0]])[0]
        : "";

    const featuredLoading = loadingUpcoming || loadingTeams || (isSeasonCompleted && podiumLoading);

    return (
        <>
            <div className="page-wide py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
                    {/* Left Sidebar */}
                    <aside className="hidden lg:block space-y-6">
                        {!isSeasonCompleted && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-border">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        Upcoming
                                    </h3>
                                </div>
                                {(loadingUpcoming || loadingTeams) ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4].map((i) => (
                                            <Skeleton key={i} className={bothSections ? 'h-[100px] rounded-sm' : 'h-[120px] rounded-sm'} />
                                        ))}
                                    </div>
                                ) : upcomingDisplay.length === 0 ? (
                                    <div className="panel p-4 text-center">
                                        <p className="text-xs text-muted-foreground">No upcoming matches</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {upcomingDisplay.map((matchDetails: MatchWithDetails, i) => {
                                            const homeTeam = teams.find((t) => t.id === matchDetails.match.home_team_id);
                                            const awayTeam = teams.find((t) => t.id === matchDetails.match.away_team_id);
                                            return (
                                                <CompactMatchCard
                                                    key={matchDetails.match.id}
                                                    matchDetails={matchDetails}
                                                    homeTeam={homeTeam}
                                                    awayTeam={awayTeam}
                                                    regionCode={regionCode}
                                                    matchLabel={upcomingLabels[i]}
                                                    compact={bothSections}
                                                    href={buildPublicMatchHref({
                                                        matchCode: matchDetails.match.match_code,
                                                        homeTeamName: homeTeam?.name,
                                                        awayTeamName: awayTeam?.name,
                                                        regionCode,
                                                        seasonSlug,
                                                    })}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <Calendar className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                    Recent
                                </h3>
                            </div>
                            {(loadingRecent || loadingTeams) ? (
                                <div className="space-y-2">
                                    {(bothSections ? [1,2,3,4] : [1,2,3,4,5,6]).map((i) => (
                                        <Skeleton key={i} className={bothSections ? 'h-[100px] rounded-sm' : 'h-[120px] rounded-sm'} />
                                    ))}
                                </div>
                            ) : recentDisplay.length === 0 ? (
                                <div className="panel p-4 text-center">
                                    <p className="text-xs text-muted-foreground">No recent matches</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentDisplay.map((matchDetails: MatchWithDetails, i) => {
                                        const homeTeam = teams.find((t) => t.id === matchDetails.match.home_team_id);
                                        const awayTeam = teams.find((t) => t.id === matchDetails.match.away_team_id);
                                        return (
                                            <CompactMatchCard
                                                key={matchDetails.match.id}
                                                matchDetails={matchDetails}
                                                homeTeam={homeTeam}
                                                awayTeam={awayTeam}
                                                regionCode={regionCode}
                                                matchLabel={recentLabels[i]}
                                                compact={bothSections}
                                                href={buildPublicMatchHref({
                                                    matchCode: matchDetails.match.match_code,
                                                    homeTeamName: homeTeam?.name,
                                                    awayTeamName: awayTeam?.name,
                                                    regionCode,
                                                    seasonSlug,
                                                })}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Center Column */}
                    <section className="space-y-6">
                        {featuredLoading ? (
                            <Skeleton className="h-[376px] rounded-sm" />
                        ) : isSeasonCompleted ? (
                            <SeasonChampionCard podium={podium} seasonName={season.name} regionCode={regionCode} seasonSlug={seasonSlug} />
                        ) : featuredMatch ? (
                            <FeaturedMatchCard
                                matchDetails={featuredMatch}
                                homeTeam={featuredHomeTeam}
                                awayTeam={featuredAwayTeam}
                                regionCode={regionCode}
                                matchLabel={featuredLabel}
                                isRecent={hasFeaturedRecent}
                                href={buildPublicMatchHref({
                                    matchCode: featuredMatch.match.match_code,
                                    homeTeamName: featuredHomeTeam?.name,
                                    awayTeamName: featuredAwayTeam?.name,
                                    regionCode,
                                    seasonSlug,
                                })}
                            />
                        ) : (
                            <div className="panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent h-[376px] flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <Trophy className="h-12 w-12 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">No upcoming matches scheduled</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="border-t-2 border-primary/20 pt-4">
                                <h3 className="text-base font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
                                    Season Standings
                                </h3>
                                <StandingsPreview
                                    standings={standings}
                                    isLoading={standingsLoading}
                                    qualifiedTeams={season.playoff_configs?.qualified_teams}
                                    regionCode={regionCode}
                                    seasonSlug={seasonSlug}
                                    standingMethod={region.standing_method as StandingMethod}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Right Sidebar */}
                    <aside>
                        <MediaSidebar />
                    </aside>
                </div>
            </div>
        </>
    );
}
