"use server";

import {revalidatePath} from "next/cache";
import {CACHE_TAGS} from "@/server/cache/tags";
import {revalidatePublicData} from "@/server/cache/revalidate";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import {DBClient} from "@/shared/types/db";
import {getCachedPlayerLeaderboard, getCachedLeaderboardIdentity} from "@/server/cache/publicReads";
import {getPositionLeaderboardStatRows, LeaderboardStatRow} from "@/server/domains/player";
import {joinLeaderboardIdentity} from "@/app/features/leaderboard/joinLeaderboardIdentity";
import { requireGroups } from "@/server/domains/auth";
import {getSeasonFinalsSlots, getSeasonPodium} from "@/server/domains/season";
import {z} from "zod";
import {
    getSpecs,
    getSpecsAllRegions,
    getSpecCatalog,
    saveSpecIdentity,
    setSpecVaulted,
    SetSpecVaultedSchema,
    saveSpecFacts,
    SaveSpecFactsSchema,
    saveRegionRequirements,
    removeSpec,
    storeSpecPhoto,
    removeSpecPhoto,
    SaveSpecIdentitySchema,
    SaveRegionRequirementsSchema,
    exportSpecRequirements,
    importSpecRequirements,
    ExportSpecRequirementsSchema,
    ImportSpecRequirementsSchema,
    generateSpecSnapshot,
    getPlacementBonus,
    savePlacementBonus,
    resetPlacementBonus,
    SavePlacementBonusSchema,
    getHeightRanges,
    saveHeightRanges,
    SaveHeightRangesSchema,
    getSpecWinners,
    awardSpecWinner,
    deleteSpecWinner,
    AwardSpecWinnerSchema,
    DeleteSpecWinnerSchema,
} from "@/server/domains/spec";
import {deleteSpecSnapshot} from "@/server/db/specSnapshot.repo";

const RegionIdSchema = z.string().uuid();
const SpecIdSchema = z.string().uuid();

function invalidRegion() {
    return Err({message: "A valid region is required", code: "VALIDATION_ERROR" as const});
}

export async function getSpecsAction(regionId: string) {
    if (!RegionIdSchema.safeParse(regionId).success) return invalidRegion();

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    return getSpecs(supabase, regionId);
}

export async function getSpecsAllRegionsAction() {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    return getSpecsAllRegions(supabase);
}

export async function getSpecCatalogAction() {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    return getSpecCatalog(supabase);
}

export async function saveSpecIdentityAction(data: unknown) {
    const parsed = SaveSpecIdentitySchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    const result = await saveSpecIdentity(supabase, parsed.data);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/admin/specs");
    }
    return result;
}

export async function setSpecVaultedAction(data: unknown) {
    const parsed = SetSpecVaultedSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    const result = await setSpecVaulted(supabase, parsed.data);
    if (result.ok) {
        revalidatePath("/admin/specs");
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/information/specs");
    }
    return result;
}

export async function saveSpecFactsAction(data: unknown) {
    const parsed = SaveSpecFactsSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();

    const guard = await requireGroups(supabase, ['admin', 'information']);
    if (!guard.ok) return guard;

    const result = await saveSpecFacts(supabase, parsed.data);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/admin/specs");

    }
    return result;
}


export async function uploadSpecPhotoAction(specId: string, formData: FormData) {
    if (!SpecIdSchema.safeParse(specId).success) {
        return Err({message: "A valid spec is required", code: "VALIDATION_ERROR" as const});
    }

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'information']);
    if (!guard.ok) return guard;

    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) {
        return Err({message: "No file provided", code: "VALIDATION_ERROR" as const});
    }

    const admin = getSupabaseAdmin() as unknown as DBClient;
    const result = await storeSpecPhoto(admin, {specId, file, userId: guard.value.userId});
    if (!result.ok) return result;

    revalidatePublicData([CACHE_TAGS.specs]);
    revalidatePath("/admin/game-data/specs");
    return Ok({photoUrl: result.value.photo_url as string});
}

export async function removeSpecPhotoAction(specId: string) {
    if (!SpecIdSchema.safeParse(specId).success) {
        return Err({message: "A valid spec is required", code: "VALIDATION_ERROR" as const});
    }

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'information']);
    if (!guard.ok) return guard;

    const admin = getSupabaseAdmin() as unknown as DBClient;
    const result = await removeSpecPhoto(admin, specId);
    if (!result.ok) return result;

    revalidatePublicData([CACHE_TAGS.specs]);
    revalidatePath("/admin/game-data/specs");
    return Ok(null);
}


export async function saveRegionRequirementsAction(data: unknown) {
    const parsed = SaveRegionRequirementsSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    const result = await saveRegionRequirements(supabase, parsed.data);
    if (result.ok) revalidatePath("/admin/specs");
    return result;
}

export async function exportSpecRequirementsAction(data: unknown) {
    const parsed = ExportSpecRequirementsSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    return exportSpecRequirements(supabase, parsed.data);
}

export async function importSpecRequirementsAction(data: unknown) {
    const parsed = ImportSpecRequirementsSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    const result = await importSpecRequirements(supabase, {
        regionId: parsed.data.regionId,
        file: parsed.data.file,
        mode: parsed.data.mode,
        dryRun: parsed.data.dryRun,
    });
    if (result.ok && result.value.status === "applied") {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/admin/specs");
    }
    return result;
}

export async function deleteSpecAction(id: string) {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['super_admin']);
    if (!guard.ok) return guard;

    const result = await removeSpec(supabase, id);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/admin/specs");
    }
    return result;
}

export async function generateSpecSnapshotAction(regionId: string) {
    if (!RegionIdSchema.safeParse(regionId).success) return invalidRegion();

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    const result = await generateSpecSnapshot(supabase, regionId);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/information/specs");
    }
    return result;
}

export async function deleteSpecSnapshotAction(regionId: string) {
    if (!RegionIdSchema.safeParse(regionId).success) return invalidRegion();

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    const result = await deleteSpecSnapshot(supabase, regionId);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/information/specs");
    }
    return result;
}

export async function getPlacementBonusAction(regionId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
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
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    return savePlacementBonus(supabase, parsed.data);
}

export async function resetPlacementBonusAction(regionId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    return resetPlacementBonus(supabase, regionId);
}

export async function getHeightRangesAction(regionId: string) {
    if (!RegionIdSchema.safeParse(regionId).success) return invalidRegion();
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    return getHeightRanges(supabase, regionId);
}

export async function saveHeightRangesAction(data: unknown) {
    const parsed = SaveHeightRangesSchema.safeParse(data);
    if (!parsed.success) {
        return Err({
            message: parsed.error.issues.map(i => i.message).join(", "),
            code: "VALIDATION_ERROR" as const,
        });
    }

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    const result = await saveHeightRanges(supabase, parsed.data);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/information/specs");
    }
    return result;
}

export async function getSpecWinnersAction(seasonId: string) {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
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
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    const result = await awardSpecWinner(supabase, parsed.data);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/admin/seasons");
    }
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
    const guard = await requireGroups(supabase, ['admin', 'specs']);
    if (!guard.ok) return guard;

    const result = await deleteSpecWinner(supabase, parsed.data.id);
    if (result.ok) {
        revalidatePublicData([CACHE_TAGS.specs]);
        revalidatePath("/admin/seasons");
    }
    return result;
}

export async function getSpecLeaderboardAction(seasonId: string, position: string | null) {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'specs']);
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
