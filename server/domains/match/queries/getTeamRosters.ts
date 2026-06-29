import { DBClient } from "@/shared/types/db";
import { Ok, Err, Result } from "@/shared/types/result";
import { serializeError, SerializableError } from "@/server/utils/serializeableError";

export type RosterPlayer = {
    player_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    role: "captain" | "vice_captain" | "court_captain" | "player";
};

export type TeamRosters = {
    home: RosterPlayer[];
    away: RosterPlayer[];
};

const ROLE_ORDER: Record<string, number> = {
    captain: 0,
    vice_captain: 1,
    court_captain: 2,
    player: 3,
};

function sortRoster(players: RosterPlayer[]): RosterPlayer[] {
    return [...players].sort((a, b) => {
        const roleA = ROLE_ORDER[a.role] ?? 4;
        const roleB = ROLE_ORDER[b.role] ?? 4;
        if (roleA !== roleB) return roleA - roleB;
        return (a.display_name ?? a.username ?? "").localeCompare(
            b.display_name ?? b.username ?? ""
        );
    });
}

export async function getTeamRosters(
    supabase: DBClient,
    homeTeamId: string,
    awayTeamId: string
): Promise<Result<TeamRosters, SerializableError>> {
    const { data, error } = await supabase
        .from("player_team_seasons")
        .select(`
            role,
            team_id,
            player:players (
                id,
                username,
                display_name,
                avatar_url
            )
        `)
        .in("team_id", [homeTeamId, awayTeamId])
        .is("left_at", null);

    if (error) return Err(serializeError(error, "DB_ERROR"));

    const rows = (data ?? []) as unknown as Array<{
        role: string;
        team_id: string;
        player: {
            id: string;
            username: string | null;
            display_name: string | null;
            avatar_url: string | null;
        } | null;
    }>;

    const toPlayer = (row: (typeof rows)[number]): RosterPlayer | null => {
        if (!row.player) return null;
        return {
            player_id: row.player.id,
            display_name: row.player.display_name,
            username: row.player.username,
            avatar_url: row.player.avatar_url,
            role: (row.role as RosterPlayer["role"]) ?? "player",
        };
    };

    const home = sortRoster(
        rows
            .filter(r => r.team_id === homeTeamId)
            .map(toPlayer)
            .filter((p): p is RosterPlayer => p !== null)
    );

    const away = sortRoster(
        rows
            .filter(r => r.team_id === awayTeamId)
            .map(toPlayer)
            .filter((p): p is RosterPlayer => p !== null)
    );

    return Ok({ home, away });
}
