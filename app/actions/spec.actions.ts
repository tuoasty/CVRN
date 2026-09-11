"use server";

import {revalidatePath} from "next/cache";
import {CACHE_TAGS} from "@/server/cache/tags";
import {revalidatePublicData} from "@/server/cache/revalidate";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {getCachedPlayerLeaderboard, getCachedLeaderboardIdentity} from "@/server/cache/publicReads";
import {getPositionLeaderboardStatRows, LeaderboardStatRow} from "@/server/domains/player";
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
    getSpecWinners,
    awardSpecWinner,
    deleteSpecWinner,
    AwardSpecWinnerSchema,
    DeleteSpecWinnerSchema,
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

export async function getSpecWinnersAction(seasonId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    return getSpecWinners(supabase, seasonId);
}

export async function awardSpecWinnerAction(data: unknown) {
    const parsed = AwardSpecWinnerSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    const result = await awardSpecWinner(supabase, parsed.data);
    if (result.ok) revalidatePath("/admin/seasons");
    return result;
}

export async function deleteSpecWinnerAction(data: unknown) {
    const parsed = DeleteSpecWinnerSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    const result = await deleteSpecWinner(supabase, parsed.data.id);
    if (result.ok) revalidatePath("/admin/seasons");
    return result;
}

export async function getSpecLeaderboardAction(seasonId: string, position: string | null) {
    const supabase = await createServerSupabase();
    const guard = await requireRoles(supabase, SPEC_ROLES);
    if (!guard.ok) return guard;

    try {
        const [fallbackRows, identity, slots, podium, scoped] = await Promise.all([
            getCachedPlayerLeaderboard(seasonId),
            getCachedLeaderboardIdentity(),
            getSeasonFinalsSlots(supabase, seasonId),
            getSeasonPodium(supabase, seasonId),
            position
                ? getPositionLeaderboardStatRows(supabase, {seasonId, position})
                : Promise.resolve(Ok([])),
        ]);

        const placeByTeamId: Record<string, number> = {};
        if (podium.ok) {
            for (const entry of podium.value) placeByTeamId[entry.team_id] = entry.place;
        }

        const teamRegionByPlayer = new Map<string, {team_id: string | null; region_id: string}>();
        for (const row of fallbackRows) {
            teamRegionByPlayer.set(row.player_id, {team_id: row.team_id, region_id: row.region_id});
        }

        const scopedRows = scoped.ok ? scoped.value : [];
        const matchedStatRows = scopedRows.flatMap(row => {
            const tr = teamRegionByPlayer.get(row.player_id);
            if (!tr) return [];
            return [{...row, region_id: tr.region_id, team_id: tr.team_id} as unknown as LeaderboardStatRow];
        });

        return Ok({
            matchedPlayers: joinLeaderboardIdentity(matchedStatRows, identity),
            fallbackPlayers: joinLeaderboardIdentity(fallbackRows, identity),
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
