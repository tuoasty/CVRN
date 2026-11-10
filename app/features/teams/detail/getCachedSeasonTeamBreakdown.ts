import "server-only";
import {unstable_cache} from "next/cache";
import {
    getCachedAllSeasonRows,
    getCachedCardAttributes,
    getCachedPlayerLeaderboard,
    getCachedSeasonCompletedMatches,
    getCachedSeasonRosters,
    getCachedSeasons,
    getCachedTeamsWithRegions,
} from "@/server/cache/publicReads";
import {CACHE_TAGS, PUBLIC_REVALIDATE_SECONDS} from "@/server/cache/tags";
import type {PlayerLeaderboardRow, PositionCounts} from "@/server/domains/player";
import type {PositionCode} from "@/shared/volleyball/positions";
import {buildSeasonBreakdown, type TeamBreakdown} from "./model/breakdown";
import {positionChain} from "./model/roster";

function careerPositionCounts(rows: PlayerLeaderboardRow[]): Map<string, PositionCounts> {
    const out = new Map<string, Record<string, number>>();
    for (const row of rows) {
        const counts = out.get(row.player_id) ?? {};
        for (const [code, n] of Object.entries(row.position_counts ?? {})) {
            counts[code] = (counts[code] ?? 0) + (n ?? 0);
        }
        out.set(row.player_id, counts);
    }
    return out as Map<string, PositionCounts>;
}

export const getCachedSeasonTeamBreakdown = unstable_cache(
    async (seasonId: string): Promise<Record<string, TeamBreakdown>> => {
        const seasons = await getCachedSeasons();
        const season = seasons.find((s) => s.id === seasonId);
        if (!season) return {};

        const [rosters, teams, allRows, previousCards, seasonRows, completedMatches] = await Promise.all([
            getCachedSeasonRosters(seasonId),
            getCachedTeamsWithRegions(),
            getCachedAllSeasonRows(),
            getCachedCardAttributes(season.season_number - 1),
            getCachedPlayerLeaderboard(seasonId),
            getCachedSeasonCompletedMatches(seasonId),
        ]);

        const numberBySeason = new Map(seasons.map((s) => [s.id, s.season_number]));
        const rows = allRows as unknown as PlayerLeaderboardRow[];
        const preCutoffRows = rows.filter((r) => {
            const n = r.season_id ? numberBySeason.get(r.season_id) : undefined;
            return n !== undefined && n < season.season_number;
        });

        const careerCounts = careerPositionCounts(preCutoffRows);
        const positionsByPlayer = new Map<string, PositionCode[]>(
            rosters.map((r) => [
                r.playerId,
                positionChain({
                    seasonCounts: null,
                    seasonSets: 0,
                    listed: r.position,
                    careerCounts: careerCounts.get(r.playerId) ?? null,
                }),
            ]),
        );

        const breakdown = buildSeasonBreakdown({
            teamIds: teams.filter((t) => t.season_id === seasonId && !t.deleted_at && !t.is_bye).map((t) => t.id),
            rosters,
            preCutoffRows,
            previousCards,
            seasonRows: seasonRows as unknown as PlayerLeaderboardRow[],
            completedMatches,
            positionsByPlayer,
        });

        return Object.fromEntries(breakdown);
    },
    ["public:season-team-breakdown"],
    {
        tags: [CACHE_TAGS.stats, CACHE_TAGS.matches, CACHE_TAGS.teams, CACHE_TAGS.players, CACHE_TAGS.playerCards],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
    },
);
