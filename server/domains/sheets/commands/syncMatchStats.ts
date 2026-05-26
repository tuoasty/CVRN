import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {findMatchSheetConfigById} from "@/server/db/matchSheetConfig.repo";
import {replaceMatchStats} from "@/server/db/playerMatchStats.repo";
import {buildMatchStatsPlan, MatchStatsPlan} from "./buildMatchStatsPlan";

// Validate-first + atomic-write orchestrator. Mirrors syncSheet's shape:
// load config (repo) → run the pipeline (buildMatchStatsPlan) → write (RPC).
// Refuses to write if the pipeline produced any errors. The match's existing
// rows are replaced in one RPC call (delete + insert in one transaction).
export async function syncMatchStats(
    supabase: DBClient,
    configId: string
): Promise<Result<MatchStatsPlan>> {
    const configRes = await findMatchSheetConfigById(supabase, configId);
    if (!configRes.ok) return configRes;
    if (!configRes.value) return Err({message: "Stats sheet config not found", code: "NOT_FOUND"});

    const planRes = await buildMatchStatsPlan(supabase, configRes.value);
    if (!planRes.ok) return planRes;
    const plan = planRes.value;

    if (plan.errors.length > 0) {
        return Err({
            message: `Cannot sync: ${plan.errors.length} error(s) in the sheet. Fix them and preview again.`,
            code: "VALIDATION_ERROR",
        });
    }

    const writeRes = await replaceMatchStats(supabase, plan.matchId, plan.rows);
    if (!writeRes.ok) return writeRes;

    return Ok(plan);
}
