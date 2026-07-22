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
} from "@/server/domains/player";
import type {PlayerDetail} from "@/server/domains/player";
import {
    getTeamWithRegionAndPlayers,
    getTeamNameHistory,
    getAllTeamsWithRegions,
} from "@/server/domains/team";
import {getStandings} from "@/server/domains/standing";
import {getPlayoffBracketBySeasonId} from "@/server/domains/playoff";
import type {PlayoffRound} from "@/server/domains/playoff";
import {
    getUpcomingMatches,
    getRecentMatches,
    getMatchDetail,
    getWeekSchedule,
    getPlayoffSchedule,
    getAvailablePlayoffRounds,
    getDefaultWeekForSeason,
    getPlayoffRoundCounts,
    getWeekMatchCounts,
    getPlayoffMatchesBySeason,
} from "@/server/domains/match";
import {getSeasonPodium} from "@/server/domains/season";
import {getAllMediaPosts} from "@/server/domains/media";
import {Result} from "@/shared/types/result";
import {CACHE_TAGS, PUBLIC_REVALIDATE_SECONDS} from "./tags";

/**
 * Cached, cookie-free reads for public pages.
 *
 * Two rules make this work, and breaking either one silently undoes the caching:
 *
 * 1. Always use `createPublicClient()`, never `createServerSupabase()`. The latter calls
 *    `cookies()`, which is a Dynamic API — it forces every route beneath the calling
 *    layout to render per-request, so nothing can be served from the CDN. (`unstable_cache`
 *    also throws outright if `cookies()` is called inside it.)
 *
 * 2. Never cache a failure. `unstable_cache` stores whatever the callback returns, so a
 *    momentary Supabase hiccup returning `[]` would be pinned for the full 24h window.
 *    `unwrap` throws instead, which leaves the cache empty, and callers catch to degrade
 *    gracefully — so a transient error costs one bad render, not a bad day.
 *
 * Results here are shared across ALL viewers. Only ever cache data that is safe for
 * anonymous users. The publishable key plus RLS public-read policies is the structural
 * guard: this client cannot read admin-only rows even if wired incorrectly.
 */
function unwrap<T>(result: Result<T, {message: string}>, label: string): T {
    if (!result.ok) {
        throw new Error(`${label}: ${result.error.message}`);
    }
    return result.value;
}

/**
 * For queries that signal "genuinely does not exist" as `Err` with code NOT_FOUND.
 *
 * The distinction matters far more once results are cached: a real absence is a stable
 * fact worth caching as `null` (and it shields us from bots probing random slugs), while
 * a transient DB failure must throw so nothing is written. The underlying queries return
 * `Err` for both cases, so callers that treat any `Err` as a 404 will happily cache a
 * "season not found" page for 24h because Supabase blipped once.
 *
 * Note the cached `null` depends on region/season mutations calling `revalidateTag` —
 * otherwise a newly created season stays invisible for up to the fallback window.
 */
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

// Podium and awards for one archived season. Tagged with teams and players because the
// detail embeds team logos and player avatars.
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

// Arguments participate in the cache key, so each region code gets its own entry.
export const getCachedRegionByCode = unstable_cache(
    async (code: string) =>
        unwrapNullable(await getRegionByCode(createPublicClient(), code), "getCachedRegionByCode"),
    ["public:region-by-code"],
    {tags: [CACHE_TAGS.regions], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

/**
 * Mirrors `getPlayerDetailAction`, minus the cookie-bound client and the read-path
 * Roblox sync. Profile freshness now comes from the nightly sync-players cron, so a
 * page view no longer triggers outbound Roblox calls.
 *
 * Returns `null` for an unknown username so the caller can 404 without caching a
 * transient failure as a permanent miss.
 */
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

/**
 * All teams with their nested season/region. Callers filter by season in memory — the set
 * is ~220 rows and the card grid needs the nested region shape this query already builds.
 * Tagged with players too: captain and playerCount derive from rosters.
 */
export const getCachedTeamsWithRegions = unstable_cache(
    async () =>
        unwrap(await getAllTeamsWithRegions(createPublicClient()), "getCachedTeamsWithRegions"),
    ["public:teams-with-regions"],
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

// Standings are a database view computed from match results, so they change only when
// matches do — invalidated by the matches tag as well as standings.
export const getCachedStandings = unstable_cache(
    async (seasonId: string, regionId: string) =>
        unwrap(await getStandings(createPublicClient(), {seasonId, regionId}), "getCachedStandings"),
    ["public:standings"],
    {
        tags: [CACHE_TAGS.standings, CACHE_TAGS.matches],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
    },
);

// Brackets advance when matches complete (advance_playoff_winner runs inside the RPC),
// so match mutations must invalidate this too.
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
    async (seasonId: string, limit: number) =>
        unwrap(
            await getUpcomingMatches(createPublicClient(), seasonId, limit),
            "getCachedUpcomingMatches",
        ),
    ["public:upcoming-matches"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

export const getCachedRecentMatches = unstable_cache(
    async (seasonId: string, limit: number) =>
        unwrap(await getRecentMatches(createPublicClient(), seasonId, limit), "getCachedRecentMatches"),
    ["public:recent-matches"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

// Box scores live here too, so per-set stats invalidate alongside the match itself.
export const getCachedMatchDetail = unstable_cache(
    async (regionCode: string, seasonSlug: string, matchCode: string) =>
        unwrapNullable(
            await getMatchDetail(createPublicClient(), {regionCode, seasonSlug, matchCode}),
            "getCachedMatchDetail",
        ),
    ["public:match-detail"],
    {
        tags: [CACHE_TAGS.matches, CACHE_TAGS.teams, CACHE_TAGS.players],
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

export const getCachedTeamNameHistory = unstable_cache(
    async (teamId: string) =>
        unwrap(await getTeamNameHistory(createPublicClient(), teamId), "getCachedTeamNameHistory"),
    ["public:team-name-history"],
    {tags: [CACHE_TAGS.teams], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

/* ── Matches page ──────────────────────────────────────────────────────────────
 *
 * These back the /[region]/[season]/matches route, which used to fetch all of this
 * client-side through nine SWR hooks (nine uncacheable server-action POSTs per view,
 * two of them waterfalled behind the schedule resolving).
 *
 * Note the cache-key cardinality on the parameterised ones. `unstable_cache` derives a
 * separate entry per argument tuple, so these are only safe because their argument space
 * is small and bounded: weeks and rounds per season. Do not extend this pattern to
 * anything keyed on free-form user input (a search box, a page offset) — that mints an
 * unbounded number of entries and blows the Data Cache write budget.
 */

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

export const getCachedPlayoffRoundCounts = unstable_cache(
    async (seasonId: string) =>
        unwrap(
            await getPlayoffRoundCounts(createPublicClient(), seasonId),
            "getCachedPlayoffRoundCounts",
        ),
    ["public:playoff-round-counts"],
    {tags: [CACHE_TAGS.matches, CACHE_TAGS.playoffs], revalidate: PUBLIC_REVALIDATE_SECONDS},
);

// Full match rows for a season's bracket. The public playoffs page used to fetch the
// ENTIRE matches table client-side (`findAllMatches` — no filter, no limit) on every view,
// to render ~30 cards.
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

/**
 * MVP players for a schedule. Takes a pre-sorted, comma-joined id list rather than an
 * array so the cache key is stable — `["b","a"]` and `["a","b"]` must not mint two entries.
 * Callers should use `playerIdsCacheKey()`.
 */
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

/** Stable cache key for `getCachedPlayersByIds` — dedupes and sorts. */
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
