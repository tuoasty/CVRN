"use server"

import {revalidatePath} from "next/cache";
import {revalidatePublicData} from "@/server/cache/revalidate";
import {bumpCacheVersion} from "@/server/cache/version";
import {CACHE_TAGS} from "@/server/cache/tags";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {requireGroups} from "@/server/domains/auth";
import {
    insertMatchSheetConfig,
    deleteMatchSheetConfig,
    findMatchSheetConfigById,
} from "@/server/db/matchSheetConfig.repo";
import {clearMatchStats} from "@/server/db/playerMatchStats.repo";
import {getSeasonPlayoffMatches} from "@/server/domains/matchStats/queries/getSeasonPlayoffMatches";
import {SaveMatchSheetConfigSchema} from "@/server/domains/matchStats/types";
import {buildMatchStatsPlan, PlayerOverrides} from "@/server/domains/sheets/commands/buildMatchStatsPlan";
import {syncMatchStats} from "@/server/domains/sheets/commands/syncMatchStats";
import {refreshRecords} from "@/server/domains/record";

export async function getSeasonPlayoffMatchesAction(seasonId: string) {
    const supabase = await createServerSupabase();
    return getSeasonPlayoffMatches(supabase, seasonId);
}

export async function saveMatchSheetConfigAction(data: unknown) {
    const parsed = SaveMatchSheetConfigSchema.safeParse(data);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR" as const});
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin", "statistics"]);
    if (!guard.ok) return guard;
    const result = await insertMatchSheetConfig(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/stats');
    return result;
}

export async function deleteMatchSheetConfigAction(id: string) {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin", "statistics"]);
    if (!guard.ok) return guard;
    const result = await deleteMatchSheetConfig(supabase, id);
    if (result.ok) revalidatePath('/admin/stats');
    return result;
}

export async function clearMatchStatsAction(matchId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin", "statistics"]);
    if (!guard.ok) return guard;
    const result = await clearMatchStats(supabase, matchId);
    if (result.ok) {
        revalidatePath('/admin/stats');
        revalidatePublicData([CACHE_TAGS.matches, CACHE_TAGS.rawStats]);
    }
    return result;
}

export async function previewMatchStatsAction(configId: string, playerOverrides?: PlayerOverrides) {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin", "statistics"]);
    if (!guard.ok) return guard;

    const configRes = await findMatchSheetConfigById(supabase, configId);
    if (!configRes.ok) return configRes;
    if (!configRes.value) return Err({message: "Stats sheet config not found", code: "NOT_FOUND" as const});

    return buildMatchStatsPlan(supabase, configRes.value, {playerOverrides});
}

export async function syncMatchStatsAction(
    configId: string,
    force = false,
    playerOverrides?: PlayerOverrides
) {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin", "statistics"]);
    if (!guard.ok) return guard;
    const result = await syncMatchStats(supabase, configId, {force, playerOverrides});
    if (result.ok) {
        revalidatePath('/admin/stats');

        revalidatePublicData([CACHE_TAGS.matches, CACHE_TAGS.rawStats]);
    }
    return result;
}

export async function publishStatsAction() {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin", "statistics"]);
    if (!guard.ok) return guard;

    const refreshed = await refreshRecords(supabase);
    if (!refreshed.ok) return refreshed;

    revalidatePublicData([CACHE_TAGS.matches, CACHE_TAGS.stats, CACHE_TAGS.players, CACHE_TAGS.rawStats]);
    await bumpCacheVersion(supabase, [CACHE_TAGS.stats]);
    return Ok(true);
}
