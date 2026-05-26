"use server"

import {revalidatePath} from "next/cache";
import {Err} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {
    insertMatchSheetConfig,
    deleteMatchSheetConfig,
    findMatchSheetConfigById,
} from "@/server/db/matchSheetConfig.repo";
import {getSeasonPlayoffMatches} from "@/server/domains/matchStats/queries/getSeasonPlayoffMatches";
import {SaveMatchSheetConfigSchema} from "@/server/domains/matchStats/types";
import {buildMatchStatsPlan} from "@/server/domains/sheets/commands/buildMatchStatsPlan";
import {syncMatchStats} from "@/server/domains/sheets/commands/syncMatchStats";

async function requireAuth(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    const {data: {user}} = await supabase.auth.getUser();
    return user;
}

export async function getSeasonPlayoffMatchesAction(seasonId: string) {
    const supabase = await createServerSupabase();
    return getSeasonPlayoffMatches(supabase, seasonId);
}

export async function saveMatchSheetConfigAction(data: unknown) {
    const parsed = SaveMatchSheetConfigSchema.safeParse(data);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR" as const});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const result = await insertMatchSheetConfig(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/stats');
    return result;
}

export async function deleteMatchSheetConfigAction(id: string) {
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const result = await deleteMatchSheetConfig(supabase, id);
    if (result.ok) revalidatePath('/admin/stats');
    return result;
}

// Read-only: run the full parse + resolve pipeline and return the plan.
// UI uses this to show the structural summary + errors before the user commits.
export async function previewMatchStatsAction(configId: string) {
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});

    const configRes = await findMatchSheetConfigById(supabase, configId);
    if (!configRes.ok) return configRes;
    if (!configRes.value) return Err({message: "Stats sheet config not found", code: "NOT_FOUND" as const});

    return buildMatchStatsPlan(supabase, configRes.value);
}

// Delegates to the syncMatchStats command (load config → build plan → refuse
// if errors → atomic replace via RPC). Mirrors runSyncAction.
export async function syncMatchStatsAction(configId: string) {
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const result = await syncMatchStats(supabase, configId);
    if (result.ok) revalidatePath('/admin/stats');
    return result;
}
