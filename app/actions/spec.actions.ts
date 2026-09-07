"use server";

import {revalidatePath} from "next/cache";
import {CACHE_TAGS} from "@/server/cache/tags";
import {revalidatePublicData} from "@/server/cache/revalidate";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {getCachedPlayerLeaderboard, getCachedLeaderboardIdentity} from "@/server/cache/publicReads";
import {joinLeaderboardIdentity} from "@/app/features/leaderboard/joinLeaderboardIdentity";
import {requireRoles} from "@/server/domains/auth";
import {getSeasonFinalsSlots, getSeasonPodium} from "@/server/domains/season";
import {
    getSpecs,
    saveSpec,
    removeSpec,
    SaveSpecSchema,
    generateSpecSnapshot,
    getPlacementBonus,
    savePlacementBonus,
    resetPlacementBonus,
    SavePlacementBonusSchema,
} from "@/server/domains/spec";
import {deleteSpecSnapshot} from "@/server/db/specSnapshot.repo";

const SPEC_ROLES = ["admin", "super_admin", "spec_manager"] as const;

export async function getSpecsAction() {
    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
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
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    const result = await saveSpec(supabase, parsed.data);
    if (result.ok) revalidatePath("/admin/specs");
    return result;
}

export async function deleteSpecAction(id: string) {
    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    const result = await removeSpec(supabase, id);
    if (result.ok) revalidatePath("/admin/specs");
    return result;
}

export async function generateSpecSnapshotAction() {
    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    const result = await generateSpecSnapshot(supabase);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/spec-requirements");
    }
    return result;
}

export async function deleteSpecSnapshotAction() {
    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    const result = await deleteSpecSnapshot(supabase);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/spec-requirements");
    }
    return result;
}

export async function getPlacementBonusAction(regionId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    return getPlacementBonus(supabase, regionId);
}

export async function savePlacementBonusAction(data: unknown) {
    const parsed = SavePlacementBonusSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    return savePlacementBonus(supabase, parsed.data);
}

export async function resetPlacementBonusAction(regionId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    return resetPlacementBonus(supabase, regionId);
}

export async function getSpecLeaderboardAction(seasonId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    try {

        const [statRows, identity, slots, podium] = await Promise.all([
            getCachedPlayerLeaderboard(seasonId),
            getCachedLeaderboardIdentity(),
            getSeasonFinalsSlots(supabase, seasonId),
            getSeasonPodium(supabase, seasonId),
        ]);

        const placeByTeamId: Record<string, number> = {};
        if (podium.ok) {
            for (const entry of podium.value) placeByTeamId[entry.team_id] = entry.place;
        }

        return Ok({
            players: joinLeaderboardIdentity(statRows, identity),
            placeByTeamId,
            upperFinalistTeamId: slots.ok ? slots.value.upperFinalistTeamId : null,
        });
    } catch (err) {
        return Err({
            message: err instanceof Error ? err.message : "Failed to load season stats",
            code: "DB_ERROR" as const,
        });
    }
}
