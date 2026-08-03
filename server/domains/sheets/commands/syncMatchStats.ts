import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {findMatchSheetConfigById} from "@/server/db/matchSheetConfig.repo";
import {replaceMatchStats} from "@/server/db/playerMatchStats.repo";
import {buildMatchStatsPlan, MatchStatsPlan, PlayerOverrides} from "./buildMatchStatsPlan";

export async function syncMatchStats(
    supabase: DBClient,
    configId: string,
    opts?: {force?: boolean; playerOverrides?: PlayerOverrides}
): Promise<Result<MatchStatsPlan>> {
    const configRes = await findMatchSheetConfigById(supabase, configId);
    if (!configRes.ok) return configRes;
    if (!configRes.value) return Err({message: "Stats sheet config not found", code: "NOT_FOUND"});

    const planRes = await buildMatchStatsPlan(supabase, configRes.value, {
        playerOverrides: opts?.playerOverrides,
    });
    if (!planRes.ok) return planRes;
    const plan = planRes.value;

    const fatal = plan.errors.filter(e => e.kind !== "skippable");
    if (fatal.length > 0) {
        return Err({
            message: `Cannot sync: ${fatal.length} blocking error(s) in the sheet. Fix them and preview again.`,
            code: "VALIDATION_ERROR",
        });
    }

    if (plan.errors.length > 0 && !opts?.force) {
        return Err({
            message: `Cannot sync: ${plan.errors.length} error(s) in the sheet. Fix them and preview again.`,
            code: "VALIDATION_ERROR",
        });
    }

    for (let n = 1; n <= plan.summary.sets; n++) {
        if (!plan.rows.some(r => r.set_number === n)) {
            return Err({
                message: `Cannot sync: set ${n} has no stat rows. Writing would erase its existing stats.`,
                code: "VALIDATION_ERROR",
            });
        }
    }

    const writeRes = await replaceMatchStats(supabase, plan.matchId, plan.rows);
    if (!writeRes.ok) return writeRes;

    return Ok(plan);
}
