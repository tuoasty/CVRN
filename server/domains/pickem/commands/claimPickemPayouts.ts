import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {markPicksClaimed} from "@/server/db/pickems.repo";
import type {AckPayoutsBody, AckPayoutsResponse} from "../types/gameSchemas";

export async function claimPickemPayouts(supabase: DBClient, body: AckPayoutsBody): Promise<Result<AckPayoutsResponse>> {
    try {
        const claimed = await markPicksClaimed(supabase, body.roblox_user_id, [...new Set(body.pick_ids)]);
        if (!claimed.ok) return claimed;
        return Ok({claimed_pick_ids: claimed.value});
    } catch (error) {
        return Err(serializeError(error));
    }
}
