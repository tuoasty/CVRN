import type {
    LeaderboardIdentity,
    LeaderboardStatRow,
    PlayerLeaderboardRow,
} from "@/server/domains/player";

export function joinLeaderboardIdentity(
    rows: LeaderboardStatRow[],
    identity: LeaderboardIdentity
): PlayerLeaderboardRow[] {
    return rows.flatMap(row => {

        const player = identity.players[row.player_id];
        if (!player) return [];

        const season = identity.seasons[row.season_id];
        const team = row.team_id ? identity.teams[row.team_id] : undefined;

        return [{
            ...row,
            username: player.username,
            display_name: player.display_name,
            avatar_url: player.avatar_url,
            season_name: season?.name ?? "",
            season_slug: season?.slug ?? "",
            season_start_date: season?.start_date ?? "",
            region_code: season?.region_code ?? "",
            team_name: team?.name ?? null,
            team_slug: team?.slug ?? null,
            team_logo_url: team?.logo_url ?? null,
            team_logo_bg_removed: team?.logo_bg_removed ?? null,
        }];
    });
}
