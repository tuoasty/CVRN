"use server";

import {revalidatePath} from "next/cache";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {getCachedPlayerLeaderboard} from "@/server/cache/publicReads";
import {requireAdmin} from "@/server/domains/auth";
import {getSeasonPodium} from "@/server/domains/season";
import {getSpecs, saveSpec, removeSpec, SaveSpecSchema} from "@/server/domains/spec";

// Admin-guarded rather than public: `specs` itself is readable by anyone, but the
// embedded requirements are not, and a caller who silently got empty arrays back
// would read as "this spec has no requirements" instead of "you can't see them".
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

/**
 * Season stat rows for the calibration screen.
 *
 * `getPlayerLeaderboardAction` was deleted when the public board moved to a server
 * component — a cookie-bound, uncacheable POST for the heaviest read in the app. This
 * is not that: the season comes from the admin store rather than the route, so a
 * server component cannot resolve it, and it reads through `getCachedPlayerLeaderboard`,
 * so an admin switching seasons hits the same warm cache the public board fills.
 */
export async function getSpecLeaderboardAction(seasonId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;

    try {
        const [players, podium] = await Promise.all([
            getCachedPlayerLeaderboard(seasonId),
            getSeasonPodium(supabase, seasonId),
        ]);

        // A plain object, not a Map — server action results cross the wire as JSON.
        const placements: Record<string, number> = {};
        if (podium.ok) {
            for (const entry of podium.value) {
                if (entry.team_id) placements[entry.team_id] = entry.place;
            }
        }

        return Ok({players, placements});
    } catch (err) {
        return Err({
            message: err instanceof Error ? err.message : "Failed to load season stats",
            code: "DB_ERROR" as const,
        });
    }
}
