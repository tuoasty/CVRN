import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {LeaderboardIdentity} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getLeaderboardIdentity(
    supabase: DBClient
): Promise<Result<LeaderboardIdentity>> {
    try {
        const [playersRes, teamsRes, seasonsRes] = await Promise.all([
            supabase.from("players").select("id, username, display_name, avatar_url"),
            supabase.from("teams").select("id, name, slug, logo_url, logo_bg_removed").is("deleted_at", null),
            supabase.from("seasons").select("id, name, slug, start_date, regions(code)"),
        ]);

        const error = playersRes.error ?? teamsRes.error ?? seasonsRes.error;
        if (error) {
            logger.error({error}, "Failed to fetch leaderboard identity");
            return Err(serializeError(error, "DB_ERROR"));
        }

        const identity: LeaderboardIdentity = {players: {}, teams: {}, seasons: {}};

        for (const p of playersRes.data ?? []) {
            if (!p.username) continue;
            identity.players[p.id] = {
                username: p.username,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
            };
        }

        for (const t of teamsRes.data ?? []) {
            identity.teams[t.id] = {
                name: t.name,
                slug: t.slug,
                logo_url: t.logo_url,
                logo_bg_removed: t.logo_bg_removed ?? false,
            };
        }

        for (const s of seasonsRes.data ?? []) {
            const region = s.regions as {code: string} | {code: string}[] | null;
            const code = Array.isArray(region) ? region[0]?.code : region?.code;
            identity.seasons[s.id] = {
                name: s.name,
                slug: s.slug,
                start_date: s.start_date,
                region_code: code ?? "",
            };
        }

        return Ok(identity);
    } catch (error) {
        logger.error({error}, "Unexpected error in getLeaderboardIdentity");
        return Err(serializeError(error));
    }
}
