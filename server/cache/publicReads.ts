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
    getPlayerSpecs,
    getPlayerTeamHistory,
    getPlayersByIds,
    getLeaderboardStatRows,
    getLeaderboardIdentity,
    getTeamLeaderboard,
    getPlayerDetailByRobloxUserId,
    getPlayerRawStatsBySeasonNumber,
    getRawStatSummaryBySeasonNumber,
} from "@/server/domains/player";
import {pickMainTeam} from "@/server/domains/player/helpers/pickMainTeam";
import {getPublicPlayerCards} from "@/server/domains/playerCard";
import type {PublicPlayerCard} from "@/server/domains/playerCard";
import {findHeldSpecSeasonId} from "@/server/db/seasons.repo";
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
import {findPlayerSeasonMemberships} from "@/server/db/players.repo";
import {getPlayoffBracketBySeasonId} from "@/server/domains/playoff";
import type {PlayoffRound} from "@/server/domains/playoff";
import {
    getPlayerRecentMatches,
    getUpcomingMatches,
    getRecentMatches,
    getMatchDetail,
    getMatchDetailById,
    getWeekSchedule,
    getPlayoffSchedule,
    getSeasonPlayoffSchedule,
    getAvailablePlayoffRounds,
    getCompletedPlayoffRounds,
    getDefaultWeekForSeason,
    getPlayoffRoundCounts,
    getWeekMatchCounts,
    getPlayoffMatchesBySeason,
    getTeamMatches,
    getMatchSitemapRows,
} from "@/server/domains/match";
import type {MatchWithDetails, PlayerRecentMatch, SeasonPlayoffSchedule} from "@/server/domains/match";
import {getSeasonPodium, getSeasonAwards} from "@/server/domains/season";
import {getMatchStatTotalsByMatchIds} from "@/server/domains/matchStats";
import {getAllMediaPosts} from "@/server/domains/media";
import {getPublishedArticles, getArticleBySlug} from "@/server/domains/article";
import {getPublishedUpdateLogIndex, getPublishedUpdateLog} from "@/server/domains/updateLog";
import {getGameDatasetPayloads, getPublicInformation} from "@/server/domains/gameData";
import {getPublicSpecSnapshot, getPublishedSpecRegions, getPublicSpecs, getRecentSpecWinners} from "@/server/domains/spec";
import {getRecords} from "@/server/domains/record";
import {getSeasonOverallInputs} from "@/server/domains/overall";
import {getBoosterRobloxIds} from "@/server/domains/booster";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import type {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {CACHE_TAGS, CARDS_REVALIDATE_SECONDS, PUBLIC_REVALIDATE_SECONDS, STATS_REVALIDATE_SECONDS, RAW_STATS_REVALIDATE_SECONDS} from "./tags";

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
    {tags: [CACHE_TAGS.seasons, CACHE_TAGS.media], revalidate: PUBLIC_REVALIDATE_SECONDS},
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

        const found = unwrapNullable(
            await getPlayerByUsername(supabase, {username}),
            "getCachedPlayerDetail",
        );
        if (!found) return null;

        const [stats, awards, specs, teamHistory] = await Promise.all([
            getPlayerSeasonStats(supabase, {playerId: found.id}),
            getPlayerAwards(supabase, {playerId: found.id}),
            getPlayerSpecs(supabase, {playerId: found.id}),
            getPlayerTeamHistory(supabase, {playerId: found.id}),
        ]);

        const specList = unwrap(specs, "getCachedPlayerDetail.specs");
        const seasonStats = unwrap(stats, "getCachedPlayerDetail.seasonStats");
        const history = unwrap(teamHistory, "getCachedPlayerDetail.teamHistory");

        const main = pickMainTeam(history, seasonStats);
        const player = main ? {
            ...found,
            current_team: {
                team_id: main.team_id,
                season_id: main.season_id,
                team_name: main.team_name,
                team_logo_url: main.team_logo_url,
                team_logo_bg_removed: main.team_logo_bg_removed,
                team_brick_color: main.team_brick_color,
                season_name: main.season_name,
                region_code: main.region_code,
                region_name: main.region_name,
            },
            current_position: main.position,
        } : found;

        let activeSpec: PlayerDetail["activeSpec"] = null;
        const currentSeasonId = player.current_team?.season_id;
        if (currentSeasonId) {
            const heldRes = await findHeldSpecSeasonId(supabase, currentSeasonId);
            const heldSeasonId = heldRes.ok ? heldRes.value : null;
            if (heldSeasonId) {
                activeSpec = specList.find(s => s.season_id === heldSeasonId) ?? null;
            }
        }

        return {
            player,
            seasonStats,
            awards: unwrap(awards, "getCachedPlayerDetail.awards"),
            specs: specList,
            activeSpec,
            teamHistory: history,
        };
    },
    ["public:player-detail"],
    {tags: [CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPlayerCards = unstable_cache(
    async (playerId: string): Promise<PublicPlayerCard[]> =>
        unwrap(await getPublicPlayerCards(createPublicClient(), {playerId}), "getCachedPlayerCards"),
    ["public:player-cards"],
    {tags: [CACHE_TAGS.playerCards], revalidate: CARDS_REVALIDATE_SECONDS},
);

export const getCachedPlayerRecentMatches = unstable_cache(
    async (playerId: string): Promise<PlayerRecentMatch[]> =>
        unwrap(await getPlayerRecentMatches(createPublicClient(), {playerId}), "getCachedPlayerRecentMatches"),
    ["public:player-recent-matches"],
    {
        tags: [CACHE_TAGS.matches, CACHE_TAGS.teams, CACHE_TAGS.players, CACHE_TAGS.stats, CACHE_TAGS.rawStats],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
    },
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
    async (regionId: string) =>
        unwrap(await getPublicSpecSnapshot(createPublicClient(), regionId), "getCachedPublicSpecSnapshot"),
    ["public:spec-snapshot"],
    {tags: [CACHE_TAGS.specs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPublicSpecs = unstable_cache(
    async () => unwrap(await getPublicSpecs(createPublicClient()), "getCachedPublicSpecs"),
    ["public:specs"],
    {tags: [CACHE_TAGS.specs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedRecentSpecWinners = unstable_cache(
    async () => unwrap(await getRecentSpecWinners(createPublicClient()), "getCachedRecentSpecWinners"),
    ["public:recent-spec-winners"],
    {tags: [CACHE_TAGS.specs, CACHE_TAGS.seasons, CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPublishedSpecRegions = unstable_cache(
    async () => unwrap(await getPublishedSpecRegions(createPublicClient()), "getCachedPublishedSpecRegions"),
    ["public:spec-snapshot-regions"],
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

export const getCachedSeasonUpcomingMatches = unstable_cache(
    async (seasonId: string) =>
        unwrap(await getUpcomingMatches(createPublicClient(), seasonId, 500), "getCachedSeasonUpcomingMatches"),
    ["public:season-upcoming-matches"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedSeasonCompletedMatches = unstable_cache(
    async (seasonId: string) =>
        unwrap(await getRecentMatches(createPublicClient(), seasonId, 500), "getCachedSeasonCompletedMatches"),
    ["public:season-completed-matches"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedMatchStatTotals = unstable_cache(
    async (joinedIds: string) => {
        const matchIds = joinedIds ? joinedIds.split(",") : [];
        if (matchIds.length === 0) return [];
        return unwrap(await getMatchStatTotalsByMatchIds(createPublicClient(), matchIds), "getCachedMatchStatTotals");
    },
    ["public:match-stat-totals"],
    {tags: [CACHE_TAGS.stats], revalidate: STATS_REVALIDATE_SECONDS},
);

export const getCachedSeasonAwards = unstable_cache(
    async (seasonId: string) =>
        unwrap(await getSeasonAwards(createPublicClient(), seasonId), "getCachedSeasonAwards"),
    ["public:season-awards"],
    {tags: [CACHE_TAGS.seasons, CACHE_TAGS.players, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
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

export const getCachedUpdateLogIndex = unstable_cache(
    async () => unwrap(await getPublishedUpdateLogIndex(createPublicClient()), "getCachedUpdateLogIndex"),
    ["public:update-log-index"],
    {tags: [CACHE_TAGS.updateLogs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedUpdateLogByVersion = unstable_cache(
    async (version: string) =>
        unwrap(await getPublishedUpdateLog(createPublicClient(), version), "getCachedUpdateLogByVersion"),
    ["public:update-log-by-version"],
    {tags: [CACHE_TAGS.updateLogs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedGameDatasets = unstable_cache(
    async () => unwrap(await getGameDatasetPayloads(createPublicClient()), "getCachedGameDatasets"),
    ["public:game-datasets"],
    {tags: [CACHE_TAGS.gameData], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPublicInformation = unstable_cache(
    async () => unwrap(await getPublicInformation(createPublicClient()), "getCachedPublicInformation"),
    ["public:information:v3"],
    {tags: [CACHE_TAGS.gameData], revalidate: PUBLIC_REVALIDATE_SECONDS},
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

export const getCachedSeasonPlayoffSchedule = unstable_cache(
    async (seasonId: string): Promise<SeasonPlayoffSchedule> =>
        unwrap(
            await getSeasonPlayoffSchedule(createPublicClient(), seasonId),
            "getCachedSeasonPlayoffSchedule",
        ),
    ["public:season-playoff-schedule"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.playoffs, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
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

export const getCachedMatchSitemapRows = unstable_cache(
    async () => unwrap(await getMatchSitemapRows(createPublicClient()), "getCachedMatchSitemapRows"),
    ["public:match-sitemap-rows"],
    {tags: [CACHE_TAGS.matches], revalidate: PUBLIC_REVALIDATE_SECONDS},
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

export const getCachedPlayerSeasonMemberships = unstable_cache(
    async (seasonId: string, joinedIds: string) => {
        const playerIds = joinedIds ? joinedIds.split(",") : [];
        if (playerIds.length === 0) return [];
        return unwrap(
            await findPlayerSeasonMemberships(createPublicClient(), playerIds, seasonId),
            "getCachedPlayerSeasonMemberships",
        );
    },
    ["public:player-season-memberships"],
    {tags: [CACHE_TAGS.teams, CACHE_TAGS.players], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export function playerIdsCacheKey(ids: string[]): string {
    return [...new Set(ids)].sort().join(",");
}

export const getCachedPlayerDetailByRobloxId = unstable_cache(
    async (robloxUserId: string, seasonNumber: number | null) =>
        getPlayerDetailByRobloxUserId(createPublicClient(), {robloxUserId, seasonNumber}),
    ["public:player-detail-by-roblox-id"],
    {tags: [CACHE_TAGS.rawStats], revalidate: RAW_STATS_REVALIDATE_SECONDS},
);

export const getCachedBoosterRobloxIds = unstable_cache(
    async () => unwrap(
        await getBoosterRobloxIds(getSupabaseAdmin() as unknown as DBClient),
        "getCachedBoosterRobloxIds",
    ),
    ["public:booster-roblox-ids"],
    {tags: [CACHE_TAGS.boosters], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedPlayerStatsByRobloxId = unstable_cache(
    async (robloxUserId: string, seasonNumber: number | null) =>
        getPlayerRawStatsBySeasonNumber(createPublicClient(), {robloxUserId, seasonNumber}),
    ["public:player-stats-by-roblox-id"],
    {tags: [CACHE_TAGS.rawStats], revalidate: RAW_STATS_REVALIDATE_SECONDS},
);

export const getCachedRawStatSummary = unstable_cache(
    async (seasonNumber: number | null) =>
        getRawStatSummaryBySeasonNumber(createPublicClient(), seasonNumber),
    ["public:raw-stat-summary"],
    {tags: [CACHE_TAGS.rawStats], revalidate: RAW_STATS_REVALIDATE_SECONDS},
);

export const getCachedSeasonBySlugAndRegion = unstable_cache(
    async (slug: string, regionId: string) =>
        unwrapNullable(
            await getSeasonBySlugAndRegion(createPublicClient(), slug, regionId),
            "getCachedSeasonBySlugAndRegion",
        ),
    ["public:season-by-slug-region"],
    {tags: [CACHE_TAGS.seasons], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedRecords = unstable_cache(
    async (regionCode: string | null, seasonNumber: number | null) =>
        unwrapNullable(
            await getRecords(createPublicClient(), {
                regionCode: regionCode ?? undefined,
                seasonNumber: seasonNumber ?? undefined,
            }),
            "getCachedRecords",
        ),
    ["public:records"],
    {
        tags: [CACHE_TAGS.stats, CACHE_TAGS.players, CACHE_TAGS.teams, CACHE_TAGS.seasons],
        revalidate: STATS_REVALIDATE_SECONDS,
    },
);

export const getCachedSeasonOverallInputs = unstable_cache(
    async (seasonNumber: number) =>
        unwrap(await getSeasonOverallInputs(createPublicClient(), seasonNumber), "getCachedSeasonOverallInputs"),
    ["admin:overall-inputs-by-season-number"],
    {
        tags: [CACHE_TAGS.rawStats, CACHE_TAGS.players, CACHE_TAGS.teams],
        revalidate: RAW_STATS_REVALIDATE_SECONDS,
    },
);
