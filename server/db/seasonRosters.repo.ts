import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {normalizePositionInput} from "@/shared/volleyball/positions";
import type {RosterRole, SeasonRosterEntry} from "@/server/domains/team/types";

type RosterRow = {
    team_id: string;
    player_id: string;
    position: string | null;
    role: string | null;
    player: {display_name: string | null; username: string | null; avatar_url: string | null} | null;
};

const ROLES = new Set<RosterRole>(["captain", "vice_captain", "court_captain", "player"]);

function toRole(role: string | null): RosterRole {
    return role && ROLES.has(role as RosterRole) ? (role as RosterRole) : "player";
}

export async function findSeasonRosters(supabase: DBClient, seasonId: string): Promise<Result<SeasonRosterEntry[]>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .select("team_id, player_id, position, role, player:players!player_id(display_name, username, avatar_url)")
        .eq("season_id", seasonId)
        .is("left_at", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(((data ?? []) as unknown as RosterRow[]).map((r) => ({
        teamId: r.team_id,
        playerId: r.player_id,
        displayName: r.player?.display_name ?? null,
        username: r.player?.username ?? null,
        avatarUrl: r.player?.avatar_url ?? null,
        position: r.position ? normalizePositionInput(r.position) : null,
        role: toRole(r.role),
    })));
}
