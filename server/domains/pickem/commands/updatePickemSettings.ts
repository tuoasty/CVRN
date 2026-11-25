import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {updatePickemSettingsRow} from "@/server/db/pickems.repo";
import {toPickemSettings} from "../helpers/toPickemShapes";
import type {PickemSettings, PickemSettingsInput} from "../types";

export async function updatePickemSettings(supabase: DBClient, input: PickemSettingsInput, userId: string): Promise<Result<PickemSettings>> {
    try {
        const updated = await updatePickemSettingsRow(supabase, {
            seed: input.seed,
            rake: input.rake,
            odds_floor: input.oddsFloor,
            sigma: input.sigma,
            shrink_sets: input.shrinkSets,
            prob_clamp: input.probClamp,
            stake_min: input.stakeMin,
            stake_max: input.stakeMax,
            updated_by: userId,
        });
        if (!updated.ok) return updated;
        return Ok(toPickemSettings(updated.value));
    } catch (error) {
        return Err(serializeError(error));
    }
}
