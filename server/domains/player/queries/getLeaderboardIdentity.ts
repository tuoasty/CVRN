import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {LeaderboardIdentity} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
    fetchPage: (from: number, to: number) => PromiseLike<{data: T[] | null; error: {message: string} | null}>
): Promise<{data: T[]; error: {message: string} | null}> {
    const all: T[] = [];
    let from = 0;

    while (true) {
        const {data, error} = await fetchPage(from, from + PAGE_SIZE - 1);
        if (error) return {data: all, error};
        if (!data || data.length === 0) break;

        all.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    return {data: all, error: null};
}

export async function getLeaderboardIdentity(
    supabase: DBClient
): Promise<Result<LeaderboardIdentity>> {
    try {
        const [playersRes, teamsRes, seasonsRes] = await Promise.all([
            fetchAllPages((from, to) =>
                supabase.from("players").select("id, username, display_name, avatar_url").range(from, to)
            ),
            fetchAllPages((from, to) =>
                supabase
                    .from("teams")
                    .select("id, name, slug, logo_url, logo_bg_removed")
                    .is("deleted_at", null)
                    .range(from, to)
            ),
            fetchAllPages((from, to) =>
                supabase.from("seasons").select("id, name, slug, start_date, regions(code)").range(from, to)
            ),
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
