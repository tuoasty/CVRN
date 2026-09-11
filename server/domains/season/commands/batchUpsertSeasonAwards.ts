import {DBClient} from "@/shared/types/db";
import {Err, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {insertSeasonAwards, findSeasonAwards} from "@/server/db/seasonHistory.repo";
import {getRobloxFullAvatarsById} from "@/server/roblox/users";
import {storeAwardAvatar} from "./storeAwardAvatar";
import {BatchUpsertSeasonAwardsInput, SeasonAwardEntryWithPlayer} from "../types";

export async function batchUpsertSeasonAwards(
    supabase: DBClient,
    input: BatchUpsertSeasonAwardsInput,
    createdBy: string
): Promise<Result<SeasonAwardEntryWithPlayer[]>> {
    try {
        const insertResult = await insertSeasonAwards(
            supabase,
            input.seasonId,
            input.awards.map(a => ({
                playerId: a.playerId,
                awardName: a.awardName,
                category: a.category,
                createdBy,
            }))
        );
        if (!insertResult.ok) return insertResult as Result<SeasonAwardEntryWithPlayer[]>;

        const inserted = insertResult.value;

        const playerIds = Array.from(new Set(inserted.map(a => a.player_id)));
        const {data: playersData, error: playersError} = await supabase
            .from("players")
            .select("id, roblox_user_id")
            .in("id", playerIds);
        if (playersError) {
            logger.error({seasonId: input.seasonId, error: playersError}, "batchUpsertSeasonAwards: failed to read players");
        }

        const robloxByPlayer = new Map<string, string>();
        for (const p of playersData ?? []) {
            if (p.roblox_user_id != null) robloxByPlayer.set(p.id, String(p.roblox_user_id));
        }

        const robloxIds = Array.from(new Set([...robloxByPlayer.values()]));
        const avatarByRoblox = new Map<string, string>();
        if (robloxIds.length > 0) {
            const avatarResult = await getRobloxFullAvatarsById(robloxIds);
            if (avatarResult.ok) {
                for (const thumb of avatarResult.value) avatarByRoblox.set(String(thumb.targetId), thumb.imageUrl);
            } else {
                logger.error({seasonId: input.seasonId, error: avatarResult.error}, "batchUpsertSeasonAwards: avatar fetch failed");
            }
        }

        for (const award of inserted) {
            const robloxId = robloxByPlayer.get(award.player_id);
            const cdnUrl = robloxId ? avatarByRoblox.get(robloxId) : undefined;
            if (!cdnUrl) continue;
            const storeResult = await storeAwardAvatar(award.id, cdnUrl);
            if (!storeResult.ok) {
                logger.error({awardId: award.id, error: storeResult.error}, "batchUpsertSeasonAwards: failed to store avatar");
            }
        }

        return findSeasonAwards(supabase, input.seasonId) as Promise<Result<SeasonAwardEntryWithPlayer[]>>;
    } catch (error) {
        logger.error({error, seasonId: input.seasonId}, "batchUpsertSeasonAwards: unexpected error");
        return Err(serializeError(error));
    }
}
