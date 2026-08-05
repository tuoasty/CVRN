import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonPodium, insertSeasonAward, deleteSeasonAwardsByCategory} from "@/server/db/seasonHistory.repo";
import {findAllTeamPlayers} from "@/server/db/players.repo";
import {getRobloxFullAvatarsById} from "@/server/roblox/users";
import {storeAwardAvatar} from "./storeAwardAvatar";

export async function fetchChampionRosterAwards(
    supabase: DBClient,
    seasonId: string,
    createdBy: string
): Promise<Result<{count: number; skipped: boolean}>> {
    try {
        const podiumResult = await findSeasonPodium(supabase, seasonId);
        if (!podiumResult.ok) return podiumResult as Result<{count: number; skipped: boolean}>;

        const champion = (podiumResult.value as {place: number; team_id: string}[]).find(p => p.place === 1);
        if (!champion) return Ok({count: 0, skipped: true});

        const playersResult = await findAllTeamPlayers(supabase, champion.team_id, seasonId);
        if (!playersResult.ok) return playersResult as Result<{count: number; skipped: boolean}>;

        const seen = new Set<string>();
        const records = playersResult.value.filter(r => {
            if (!r.player) return false;
            if (seen.has(r.player.id)) return false;
            seen.add(r.player.id);
            return true;
        });

        if (records.length === 0) return Ok({count: 0, skipped: false});

        const ROLE_RANK: Record<string, number> = {captain: 0, vice_captain: 1, court_captain: 2};
        records.sort((a, b) => (ROLE_RANK[a.role ?? ""] ?? 3) - (ROLE_RANK[b.role ?? ""] ?? 3));

        const robloxIds = records.map(r => String(r.player!.roblox_user_id));

        const avatarResult = await getRobloxFullAvatarsById(robloxIds);
        const avatarMap = new Map<string, string>();
        if (avatarResult.ok) {
            for (const thumb of avatarResult.value) {
                avatarMap.set(String(thumb.targetId), thumb.imageUrl);
            }
        } else {
            logger.error({seasonId, error: avatarResult.error}, "fetchChampionRosterAwards: avatar fetch failed");
        }

        const deleteResult = await deleteSeasonAwardsByCategory(supabase, seasonId, "champion_roster");
        if (!deleteResult.ok) {
            logger.error({seasonId, error: deleteResult.error}, "fetchChampionRosterAwards: failed to clear old entries");
            return deleteResult as Result<{count: number; skipped: boolean}>;
        }

        let count = 0;
        for (const record of records) {
            const p = record.player!;
            const cdnUrl = avatarMap.get(String(p.roblox_user_id)) ?? null;
            if (!cdnUrl) {
                logger.warn({playerId: p.id, username: p.username}, "fetchChampionRosterAwards: no avatar URL, inserting without avatar");
            }

            const insertResult = await insertSeasonAward(supabase, {
                seasonId,
                playerId: p.id,
                awardName: record.role ?? "Member",
                category: "champion_roster",
                createdBy,
            });
            if (!insertResult.ok) {
                logger.error({playerId: p.id, error: insertResult.error}, "fetchChampionRosterAwards: failed to insert award");
                continue;
            }

            if (cdnUrl) {
                const storeResult = await storeAwardAvatar(insertResult.value.id, cdnUrl);
                if (!storeResult.ok) {
                    logger.error({awardId: insertResult.value.id, error: storeResult.error}, "fetchChampionRosterAwards: failed to store avatar");
                }
            }

            count++;
        }

        return Ok({count, skipped: false});
    } catch (error) {
        logger.error({error, seasonId}, "fetchChampionRosterAwards: unexpected error");
        return Err(serializeError(error));
    }
}
