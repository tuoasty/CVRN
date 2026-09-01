import "server-only";
import {unstable_cache} from "next/cache";
import {createPublicClient} from "@/server/supabase/server-public";
import {getAllRegions, getRegionByCode} from "@/server/domains/region";
import {
    getAllSeasons,
    getSeasonBySlugAndRegion,
    getArchive,
    getSeasonHistoryDetail,
} from "@/server/domains/season";
import {
    getPlayerByUsername,
    getPlayerSeasonStats,
    getPlayerAwards,
    getPlayerTeamHistory,
    getPlayersByIds,
    getLeaderboardStatRows,
    getLeaderboardIdentity,
    getTeamLeaderboard,
} from "@/server/domains/player";
import type {PlayerDetail} from "@/server/domains/player";
import {
    getTeamWithRegionAndPlayers,
    getTeamNameHistory,
    getAllTeamsWithRegions,
    getTeamsByIds,
} from "@/server/domains/team";
import type {TeamWithRegion} from "@/server/domains/team";
import {getStandings} from "@/server/domains/standing";
import {findTeamsBySeasonId} from "@/server/db/teams.repo";
import {getPlayoffBracketBySeasonId} from "@/server/domains/playoff";
import type {PlayoffRound} from "@/server/domains/playoff";
import {
    getUpcomingMatches,
    getRecentMatches,
    getMatchDetail,
    getMatchDetailById,
    getWeekSchedule,
    getPlayoffSchedule,
    getAvailablePlayoffRounds,
    getCompletedPlayoffRounds,
    getDefaultWeekForSeason,
    getPlayoffRoundCounts,
    getWeekMatchCounts,
    getPlayoffMatchesBySeason,
    getTeamMatches,
} from "@/server/domains/match";
import type {MatchWithDetails} from "@/server/domains/match";
import {getSeasonPodium} from "@/server/domains/season";
import {getAllMediaPosts} from "@/server/domains/media";
import {getPublishedArticles, getArticleBySlug} from "@/server/domains/article";
import {getPublicSpecSnapshot} from "@/server/domains/spec";
import {Result} from "@/shared/types/result";
import {CACHE_TAGS, PUBLIC_REVALIDATE_SECONDS, STATS_REVALIDATE_SECONDS} from "./tags";

function unwrap<T>(result: Result<T, {message: string}>, label: string): T {
    if (!result.ok) {
        throw new Error(`${label}: ${result.error.message}`);
    }
    return result.value;
}

function unwrapNullable<T>(
    result: Result<T, {message: string; code?: string}>,
    label: string,
): T | null {
    if (!result.ok) {
        if (result.error.code === "NOT_FOUND") return null;
        throw new Error(`${label}: ${result.error.message}`);
    }
    return result.value;
}

export const getCachedRegions = unstable_cache(
    async () => unwrap(await getAllRegions(createPublicClient()), "getCachedRegions"),
    ["public:regions"],
    {tags: [CACHE_TAGS.regions], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedSeasons = unstable_cache(
    async () => unwrap(await getAllSeasons(createPublicClient()), "getCachedSeasons"),
    ["public:seasons"],
    {tags: [CACHE_TAGS.seasons], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedArchive = unstable_cache(
    async () => unwrap(await getArchive(createPublicClient()), "getCachedArchive"),
    ["public:archive"],
    {tags: [CACHE_TAGS.seasons], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedSeasonHistoryDetail = unstable_cache(
    async (slug: string, regionCode: string) =>
        unwrapNullable(
            await getSeasonHistoryDetail(createPublicClient(), slug, regionCode),
            "getCachedSeasonHistoryDetail",
        ),
    ["public:season-history-detail"],
    {
        tags: [CACHE_TAGS.seasons, CACHE_TAGS.teams, CACHE_TAGS.players],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
    },
);

export const getCachedRegionByCode = unstable_cache(
    async (code: string) =>
        unwrapNullable(await getRegionByCode(createPublicClient(), code), "getCachedRegionByCode"),
    ["public:region-by-code"],
    {tags: [CACHE_TAGS.regions], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPlayerDetail = unstable_cache(
    async (username: string): Promise<PlayerDetail | null> => {
        const supabase = createPublicClient();

        const player = unwrapNullable(
            await getPlayerByUsername(supabase, {username}),
            "getCachedPlayerDetail",
        );
        if (!player) return null;

        const [stats, awards, teamHistory] = await Promise.all([
            getPlayerSeasonStats(supabase, {playerId: player.id}),
            getPlayerAwards(supabase, {playerId: player.id}),
            getPlayerTeamHistory(supabase, {playerId: player.id}),
        ]);

        return {
            player,
            seasonStats: unwrap(stats, "getCachedPlayerDetail.seasonStats"),
            awards: unwrap(awards, "getCachedPlayerDetail.awards"),
            teamHistory: unwrap(teamHistory, "getCachedPlayerDetail.teamHistory"),
        };
    },
    ["public:player-detail"],
    {tags: [CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedTeamsWithRegions = unstable_cache(
    async () =>
        unwrap(await getAllTeamsWithRegions(createPublicClient()), "getCachedTeamsWithRegions"),
    ["public:teams-with-regions"],
    {tags: [CACHE_TAGS.teams, CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedTeamsWithRegionsIncludingInactive = unstable_cache(
    async () =>
        unwrap(
            await getAllTeamsWithRegions(createPublicClient(), {includeInactive: true}),
            "getCachedTeamsWithRegionsIncludingInactive",
        ),
    ["public:teams-with-regions-including-inactive"],
    {tags: [CACHE_TAGS.teams, CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedTeamWithPlayers = unstable_cache(
    async (slug: string, seasonId: string) =>
        unwrapNullable(
            await getTeamWithRegionAndPlayers(createPublicClient(), {slug, seasonId}),
            "getCachedTeamWithPlayers",
        ),
    ["public:team-with-players"],
    {tags: [CACHE_TAGS.teams, CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedStandings = unstable_cache(
    async (seasonId: string, regionId: string) =>
        unwrap(await getStandings(createPublicClient(), {seasonId, regionId}), "getCachedStandings"),
    ["public:standings"],
    {
        tags: [CACHE_TAGS.standings, CACHE_TAGS.matches],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
    },
);

export const getCachedPlayerLeaderboard = unstable_cache(
    async (seasonId: string) =>
        unwrap(
            await getLeaderboardStatRows(createPublicClient(), {seasonId}),
            "getCachedPlayerLeaderboard",
        ),
    ["public:player-leaderboard"],
    {
        tags: [CACHE_TAGS.stats],
        revalidate: STATS_REVALIDATE_SECONDS,
    },
);

export const getCachedTeamLeaderboard = unstable_cache(
    async (teamId: string, seasonId: string) =>
        unwrap(
            await getTeamLeaderboard(createPublicClient(), {teamId, seasonId}),
            "getCachedTeamLeaderboard",
        ),
    ["public:team-leaderboard"],
    {
        tags: [CACHE_TAGS.stats],
        revalidate: STATS_REVALIDATE_SECONDS,
    },
);

export type TeamMatchHistoryResult = {
    matches: MatchWithDetails[];
    teams: Record<string, TeamWithRegion>;
};

export const getCachedTeamMatches = unstable_cache(
    async (teamId: string, seasonId: string): Promise<TeamMatchHistoryResult> => {
        const client = createPublicClient();
        const matches = unwrap(
            await getTeamMatches(client, {teamId, seasonId}),
            "getCachedTeamMatches",
        );
        const ids = [
            ...new Set(
                matches.flatMap(m =>
                    [m.match.home_team_id, m.match.away_team_id].filter(
                        (x): x is string => !!x,
                    ),
                ),
            ),
        ];
        const teamList = unwrap(await getTeamsByIds(client, ids), "getCachedTeamMatches.teams");
        const teams = Object.fromEntries(teamList.map(t => [t.id, t]));
        return {matches, teams};
    },
    ["public:team-matches"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedAllSeasonRows = unstable_cache(
    async () =>
        unwrap(await getLeaderboardStatRows(createPublicClient(), {}), "getCachedAllSeasonRows"),
    ["public:all-season-rows"],
    {
        tags: [CACHE_TAGS.stats],
        revalidate: STATS_REVALIDATE_SECONDS,
    },
);

export const getCachedPublicSpecSnapshot = unstable_cache(
    async () => unwrap(await getPublicSpecSnapshot(createPublicClient()), "getCachedPublicSpecSnapshot"),
    ["public:spec-snapshot"],
    {tags: [CACHE_TAGS.specs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedLeaderboardIdentity = unstable_cache(
    async () =>
        unwrap(await getLeaderboardIdentity(createPublicClient()), "getCachedLeaderboardIdentity"),
    ["public:leaderboard-identity"],
    {
        tags: [CACHE_TAGS.players, CACHE_TAGS.teams, CACHE_TAGS.seasons],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
    },
);

export const getCachedPlayoffBrackets = unstable_cache(
    async (seasonId: string) =>
        unwrap(
            await getPlayoffBracketBySeasonId(createPublicClient(), seasonId),
            "getCachedPlayoffBrackets",
        ),
    ["public:playoff-brackets"],
    {tags: [CACHE_TAGS.playoffs, CACHE_TAGS.matches], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedUpcomingMatches = unstable_cache(
    async (seasonId: string) => {
        const client = createPublicClient();
        const teams = unwrap(await findTeamsBySeasonId(client, seasonId), "getCachedUpcomingMatches");
        const limit = Math.max(1, Math.floor(teams.length / 2));
        return unwrap(await getUpcomingMatches(client, seasonId, limit), "getCachedUpcomingMatches");
    },
    ["public:upcoming-matches"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedRecentMatches = unstable_cache(
    async (seasonId: string) => {
        const client = createPublicClient();
        const teams = unwrap(await findTeamsBySeasonId(client, seasonId), "getCachedRecentMatches");
        const limit = Math.max(1, Math.floor(teams.length / 2));
        return unwrap(await getRecentMatches(client, seasonId, limit), "getCachedRecentMatches");
    },
    ["public:recent-matches"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedMatchDetail = unstable_cache(
    async (regionCode: string, seasonSlug: string, matchCode: string) =>
        unwrapNullable(
            await getMatchDetail(createPublicClient(), {regionCode, seasonSlug, matchCode}),
            "getCachedMatchDetail",
        ),
    ["public:match-detail"],
    {
        tags: [CACHE_TAGS.matches, CACHE_TAGS.teams, CACHE_TAGS.players, CACHE_TAGS.media],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
    },
);

export const getCachedMatchDetailById = unstable_cache(
    async (matchId: string) =>
        unwrapNullable(
            await getMatchDetailById(createPublicClient(), matchId),
            "getCachedMatchDetailById",
        ),
    ["public:match-detail-by-id"],
    {
        tags: [CACHE_TAGS.matches, CACHE_TAGS.teams, CACHE_TAGS.players, CACHE_TAGS.media],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
    },
);

export const getCachedSeasonPodium = unstable_cache(
    async (seasonId: string) =>
        unwrap(await getSeasonPodium(createPublicClient(), seasonId), "getCachedSeasonPodium"),
    ["public:season-podium"],
    {tags: [CACHE_TAGS.seasons, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedAllMediaPosts = unstable_cache(
    async () => unwrap(await getAllMediaPosts(createPublicClient(), {}), "getCachedAllMediaPosts"),
    ["public:media-posts"],
    {tags: [CACHE_TAGS.media], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPublishedArticles = unstable_cache(
    async (seasonId?: string) =>
        unwrap(await getPublishedArticles(createPublicClient(), seasonId), "getCachedPublishedArticles"),
    ["public:articles"],
    {tags: [CACHE_TAGS.articles, CACHE_TAGS.media, CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedArticleBySlug = unstable_cache(
    async (slug: string) =>
        unwrap(await getArticleBySlug(createPublicClient(), slug), "getCachedArticleBySlug"),
    ["public:article-by-slug"],
    {tags: [CACHE_TAGS.articles, CACHE_TAGS.media, CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedTeamNameHistory = unstable_cache(
    async (teamId: string) =>
        unwrap(await getTeamNameHistory(createPublicClient(), teamId), "getCachedTeamNameHistory"),
    ["public:team-name-history"],
    {tags: [CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedWeekSchedule = unstable_cache(
    async (seasonId: string, week: number) =>
        unwrap(await getWeekSchedule(createPublicClient(), {seasonId, week}), "getCachedWeekSchedule"),
    ["public:week-schedule"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPlayoffSchedule = unstable_cache(
    async (seasonId: string, round: PlayoffRound) =>
        unwrap(
            await getPlayoffSchedule(createPublicClient(), {seasonId, round}),
            "getCachedPlayoffSchedule",
        ),
    ["public:playoff-schedule"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.playoffs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedDefaultWeekForSeason = unstable_cache(
    async (seasonId: string) =>
        unwrap(
            await getDefaultWeekForSeason(createPublicClient(), seasonId),
            "getCachedDefaultWeekForSeason",
        ),
    ["public:default-week"],
    {tags: [CACHE_TAGS.matches], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedAvailablePlayoffRounds = unstable_cache(
    async (seasonId: string) =>
        unwrap(
            await getAvailablePlayoffRounds(createPublicClient(), seasonId),
            "getCachedAvailablePlayoffRounds",
        ),
    ["public:available-playoff-rounds"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.playoffs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedCompletedPlayoffRounds = unstable_cache(
    async (seasonId: string) =>
        unwrap(
            await getCompletedPlayoffRounds(createPublicClient(), seasonId),
            "getCachedCompletedPlayoffRounds",
        ),
    ["public:completed-playoff-rounds"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.playoffs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPlayoffRoundCounts = unstable_cache(
    async (seasonId: string) =>
        unwrap(
            await getPlayoffRoundCounts(createPublicClient(), seasonId),
            "getCachedPlayoffRoundCounts",
        ),
    ["public:playoff-round-counts"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.playoffs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPlayoffMatches = unstable_cache(
    async (seasonId: string) =>
        unwrap(
            await getPlayoffMatchesBySeason(createPublicClient(), seasonId),
            "getCachedPlayoffMatches",
        ),
    ["public:playoff-matches"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.playoffs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedWeekMatchCounts = unstable_cache(
    async (seasonId: string) =>
        unwrap(await getWeekMatchCounts(createPublicClient(), seasonId), "getCachedWeekMatchCounts"),
    ["public:week-match-counts"],
    {tags: [CACHE_TAGS.matches], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPlayersByIds = unstable_cache(
    async (joinedIds: string) => {
        const playerIds = joinedIds ? joinedIds.split(",") : [];
        if (playerIds.length === 0) return [];
        return unwrap(
            await getPlayersByIds(createPublicClient(), {playerIds}),
            "getCachedPlayersByIds",
        );
    },
    ["public:players-by-ids"],
    {tags: [CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export function playerIdsCacheKey(ids: string[]): string {
    return [...new Set(ids)].sort().join(",");
}

export const getCachedSeasonBySlugAndRegion = unstable_cache(
    async (slug: string, regionId: string) =>
        unwrapNullable(
            await getSeasonBySlugAndRegion(createPublicClient(), slug, regionId),
            "getCachedSeasonBySlugAndRegion",
        ),
    ["public:season-by-slug-region"],
    {tags: [CACHE_TAGS.seasons], revalidate: PUBLIC_REVALIDATE_SECONDS},
);
