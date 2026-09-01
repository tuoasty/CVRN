"use client";

import { useMemo } from "react";
import { useSeasonContext } from "@/app/(public)/[region]/[season]/context";
import { Calendar, Clock, Trophy } from "lucide-react";
import CompactMatchCard from "@/app/(public)/home/CompactMatchCard";
import FeaturedMatchCard from "@/app/(public)/home/FeaturedMatchCard";
import FeaturedMatchCarousel, { type FeaturedSlide, type FeaturedAwardSlide, type FeaturedMatchSlide } from "@/app/(public)/home/FeaturedMatchCarousel";
import SeasonChampionCard from "@/app/(public)/home/SeasonChampionCard";
import MediaSidebar from "@/app/(public)/home/MediaSidebar";
import ArticleCard from "@/app/(public)/articles/ArticleCard";
import { MatchWithDetails } from "@/server/domains/match";
import { computeMatchLabels } from "@/app/utils/matchLabel";
import { buildPublicMatchHref, buildPublicTeamHref, buildPublicPlayerHref } from "@/app/utils/matchDetailHref";
import { usePlayersByIds } from "@/app/hooks/usePlayers";
import type { TeamWithRegion } from "@/server/domains/team";
import type { SeasonPodiumEntryWithTeam } from "@/server/domains/season";
import type { MediaPost } from "@/server/domains/media";
import type { ArticleListItem } from "@/server/domains/article";

type Props = {
    teams: TeamWithRegion[];
    upcomingMatches: MatchWithDetails[];
    recentMatches: MatchWithDetails[];
    podium: SeasonPodiumEntryWithTeam[];
    mediaPosts: MediaPost[];
    articles: ArticleListItem[];
};

export default function HomePage({
    teams,
    upcomingMatches,
    recentMatches,
    podium,
    mediaPosts,
    articles,
}: Props) {
    const { season, region } = useSeasonContext();

    const regionCode = region.code.toLowerCase();
    const seasonSlug = season.slug;

    const isSeasonCompleted = season.end_date
        ? new Date(season.end_date) < new Date()
        : false;

    const bothSections = !isSeasonCompleted;
    const upcomingDisplay = bothSections ? upcomingMatches.slice(0, 4) : upcomingMatches;
    const recentDisplay   = bothSections ? recentMatches.slice(0, 4) : recentMatches.slice(0, 6);

    const hasFeaturedUpcoming = !isSeasonCompleted && upcomingMatches.length > 0;
    const hasFeaturedRecent = !isSeasonCompleted && upcomingMatches.length === 0 && recentMatches.length > 0;
    const featuredMatch = hasFeaturedUpcoming
        ? upcomingMatches[0]
        : hasFeaturedRecent
        ? recentMatches[0]
        : undefined;

    const featuredHomeTeam = teams.find((t) => t.id === featuredMatch?.match.home_team_id);
    const featuredAwayTeam = teams.find((t) => t.id === featuredMatch?.match.away_team_id);

    const featuredGfx = featuredMatch
        ? mediaPosts.find((p) => p.type === "gfx" && p.match_id === featuredMatch.match.id) ?? null
        : null;

    const upcomingLabels = computeMatchLabels(upcomingMatches);
    const recentLabels = computeMatchLabels(recentMatches);

    const totwPost = mediaPosts
        .filter((p) => p.type === "totw" && p.image_url && p.season_id === season.id)
        .sort((a, b) => b.published_at.localeCompare(a.published_at))[0] ?? null;
    const potwPost = mediaPosts
        .filter((p) => p.type === "potw" && p.image_url && p.season_id === season.id)
        .sort((a, b) => b.published_at.localeCompare(a.published_at))[0] ?? null;

    const idsToFetch = useMemo(() => {
        const ids = new Set<string>();
        if (potwPost?.player_id) ids.add(potwPost.player_id);
        mediaPosts.forEach((p) => { if (p.author_id) ids.add(p.author_id); });
        return Array.from(ids);
    }, [potwPost?.player_id, mediaPosts]);

    const { players: fetchedPlayers } = usePlayersByIds(idsToFetch);
    const playerById = useMemo(
        () => new Map(fetchedPlayers.map((p) => [p.id, p])),
        [fetchedPlayers]
    );

    const potwPlayer = potwPost?.player_id ? playerById.get(potwPost.player_id) ?? null : null;
    const totwTeam = totwPost?.team_id ? teams.find((t) => t.id === totwPost.team_id) : undefined;

    const authorNameFor = (gfx: MediaPost): string | null => {
        if (!gfx.author_id) return null;
        const a = playerById.get(gfx.author_id);
        return a ? (a.display_name || a.username) : null;
    };

    const totwSlide: FeaturedAwardSlide | null = totwPost?.image_url
        ? {
              kind: "totw",
              gfx: totwPost,
              subjectName: totwTeam?.name ?? "Team of the Week",
              subjectAvatarUrl: totwTeam?.logo_url,
              subjectSubtext: null,
              weekLabel: totwPost.description,
              authorName: authorNameFor(totwPost),
              href: buildPublicTeamHref({ regionCode, seasonSlug, teamSlug: totwTeam?.slug }),
          }
        : null;
    const potwSlide: FeaturedAwardSlide | null = potwPost?.image_url
        ? {
              kind: "potw",
              gfx: potwPost,
              subjectName: potwPlayer ? (potwPlayer.display_name || potwPlayer.username) : null,
              subjectAvatarUrl: potwPlayer?.avatar_url,
              subjectSubtext: potwPlayer?.username ? `@${potwPlayer.username}` : null,
              weekLabel: potwPost.description,
              authorName: authorNameFor(potwPost),
              href: potwPlayer ? buildPublicPlayerHref(potwPlayer.username) : null,
          }
        : null;

    const awardSlides: FeaturedAwardSlide[] = isSeasonCompleted
        ? []
        : [totwSlide, potwSlide].filter((s): s is FeaturedAwardSlide => s !== null);

    const featuredLabel = hasFeaturedUpcoming
        ? upcomingLabels[0]
        : hasFeaturedRecent
        ? computeMatchLabels([recentMatches[0]])[0]
        : "";

    const buildMatchSlide = (m: MatchWithDetails, label: string, isRecent: boolean): FeaturedMatchSlide | null => {
        const gfx = mediaPosts.find(
            (p) => p.type === "gfx" && p.image_url && p.match_id === m.match.id
        );
        if (!gfx) return null;
        const homeTeam = teams.find((t) => t.id === m.match.home_team_id);
        const awayTeam = teams.find((t) => t.id === m.match.away_team_id);
        return {
            kind: "match",
            matchDetails: m,
            homeTeam,
            awayTeam,
            gfx,
            matchLabel: label,
            isRecent,
            authorName: authorNameFor(gfx),
            href: buildPublicMatchHref({
                matchCode: m.match.match_code,
                homeTeamName: homeTeam?.name,
                awayTeamName: awayTeam?.name,
                regionCode,
                seasonSlug,
            }),
        };
    };

    const upcomingSlides: FeaturedMatchSlide[] = isSeasonCompleted
        ? []
        : upcomingMatches
              .map((m, i) => buildMatchSlide(m, upcomingLabels[i], false))
              .filter((s): s is FeaturedMatchSlide => s !== null);

    const resultSlides: FeaturedMatchSlide[] = isSeasonCompleted
        ? []
        : recentMatches
              .map((m, i) => buildMatchSlide(m, recentLabels[i], true))
              .filter((s): s is FeaturedMatchSlide => s !== null);

    const MAX_SLIDES = 5;
    const upcomingTaken = upcomingSlides.slice(0, Math.max(0, MAX_SLIDES - awardSlides.length));
    const tier2Slots = MAX_SLIDES - upcomingTaken.length;
    const resultsTaken = resultSlides.slice(0, Math.max(0, tier2Slots - awardSlides.length));
    const tier2 = [...awardSlides, ...resultsTaken].sort((a, b) =>
        b.gfx.created_at.localeCompare(a.gfx.created_at)
    );

    const slides: FeaturedSlide[] = [...upcomingTaken, ...tier2].slice(0, MAX_SLIDES);

    return (
        <>
            <div className="page-wide py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
                    {}
                    <aside className="hidden lg:block space-y-6">
                        {!isSeasonCompleted && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-border">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        Upcoming
                                    </h3>
                                </div>
                                {upcomingDisplay.length === 0 ? (
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
                            {recentDisplay.length === 0 ? (
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

                    {}
                    <section className="space-y-6">
                        {isSeasonCompleted ? (
                            <SeasonChampionCard podium={podium} seasonName={season.name} regionCode={regionCode} seasonSlug={seasonSlug} />
                        ) : slides.length > 0 ? (
                            <FeaturedMatchCarousel slides={slides} regionCode={regionCode} />
                        ) : featuredMatch ? (
                            <FeaturedMatchCard
                                matchDetails={featuredMatch}
                                homeTeam={featuredHomeTeam}
                                awayTeam={featuredAwayTeam}
                                regionCode={regionCode}
                                matchLabel={featuredLabel}
                                isRecent={hasFeaturedRecent}
                                gfx={featuredGfx}
                                href={buildPublicMatchHref({
                                    matchCode: featuredMatch.match.match_code,
                                    homeTeamName: featuredHomeTeam?.name,
                                    awayTeamName: featuredAwayTeam?.name,
                                    regionCode,
                                    seasonSlug,
                                })}
                            />
                        ) : (
                            <div className="panel p-6 border border-border h-[376px] flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <Trophy className="h-12 w-12 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">No upcoming matches scheduled</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="border-t border-border pt-4">
                                <h3 className="text-base font-bold uppercase tracking-wider text-foreground mb-4">
                                    Latest News
                                </h3>
                                {articles.length === 0 ? (
                                    <div className="panel p-6 text-center">
                                        <p className="text-sm text-muted-foreground">No articles yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {articles.slice(0, 4).map((a) => (
                                            <ArticleCard key={a.id} article={a} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {}
                    <aside>
                        <MediaSidebar posts={mediaPosts} />
                    </aside>
                </div>
            </div>
        </>
    );
}
