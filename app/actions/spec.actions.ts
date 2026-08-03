"use server";

import {revalidatePath} from "next/cache";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {getCachedPlayerLeaderboard, getCachedLeaderboardIdentity} from "@/server/cache/publicReads";
import {joinLeaderboardIdentity} from "@/app/features/leaderboard/joinLeaderboardIdentity";
import {requireAdmin} from "@/server/domains/auth";
import {getSeasonFinalsSlots} from "@/server/domains/season";
import {getSpecs, saveSpec, removeSpec, SaveSpecSchema} from "@/server/domains/spec";
import {placementTiersFromSlots} from "@/server/domains/spec/helpers/placementBonus";

export async function getSpecsAction() {
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;

    return getSpecs(supabase);
}

export async function saveSpecAction(data: unknown) {
    const parsed = SaveSpecSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;

    const result = await saveSpec(supabase, parsed.data);
    if (result.ok) revalidatePath("/admin/specs");
    return result;
}

export async function deleteSpecAction(id: string) {
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;

    const result = await removeSpec(supabase, id);
    if (result.ok) revalidatePath("/admin/specs");
    return result;
}

export async function getSpecLeaderboardAction(seasonId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;

    try {

        const [statRows, identity, slots] = await Promise.all([
            getCachedPlayerLeaderboard(seasonId),
            getCachedLeaderboardIdentity(),
            getSeasonFinalsSlots(supabase, seasonId),
        ]);

        return Ok({
            players: joinLeaderboardIdentity(statRows, identity),
            placementTiers: slots.ok ? placementTiersFromSlots(slots.value) : {},
        });
    } catch (err) {
        return Err({
            message: err instanceof Error ? err.message : "Failed to load season stats",
            code: "DB_ERROR" as const,
        });
    }
}
