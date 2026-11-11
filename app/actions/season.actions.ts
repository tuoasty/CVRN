"use server"

import {createServerSupabase} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {getAllSeasons, getSeasonBySlugAndRegion, createSeason, updateSeason, deleteSeason, getSeasonById} from "@/server/domains/season";
import {SeasonSlugRegionSchema, SeasonIdSchema, CreateSeasonSchema, UpdateSeasonSchema} from "@/server/domains/season";
import {
    getSeasonPodium, getSeasonAwards, getSeasonHistoryDetail,
    upsertSeasonPodiumSlot, deleteSeasonPodiumSlot, deriveAndSaveSeasonPodium,
    upsertSeasonAward, deleteSeasonAward, refreshAwardAvatar, fetchChampionRosterAwards,
    batchUpsertSeasonAwards, updateSeasonAward, reorderSeasonAwards,
    getSeasonAllStarTeams, upsertSeasonAllStarTeamName, UpsertSeasonAllStarTeamNameSchema,
    setAllStarCaptain, SetAllStarCaptainSchema,
    UpsertSeasonPodiumSlotSchema, DeleteSeasonPodiumSlotSchema,
    DeriveSeasonPodiumSchema, UpsertSeasonAwardSchema, DeleteSeasonAwardSchema,
    BatchUpsertSeasonAwardsSchema, UpdateSeasonAwardSchema, ReorderSeasonAwardsSchema,
    getAwardNameSuggestions, AwardNameSuggestionsSchema, getSeasonResultsPage,
    addAwardName, AddAwardNameSchema,
} from "@/server/domains/season";
import {requireAdmin, requireSuperAdmin} from "@/server/domains/auth";
import {revalidatePath} from "next/cache";
import {z} from "zod";

export async function getAllSeasonsAction() {
    const supabase = await createServerSupabase();
    return getAllSeasons(supabase);
}

export async function getSeasonByIdAction(input: unknown) {
    const parsed = SeasonIdSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getSeasonById(supabase, parsed.data);
}

export async function getSeasonBySlugAndRegionAction(input: unknown) {
    const parsed = SeasonSlugRegionSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getSeasonBySlugAndRegion(supabase, parsed.data.slug, parsed.data.regionId);
}

export async function createSeasonAction(data: unknown) {
    const parsed = CreateSeasonSchema.safeParse(data);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await createSeason(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function updateSeasonAction(data: unknown) {
    const parsed = UpdateSeasonSchema.safeParse(data);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await updateSeason(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function deleteSeasonAction(data: unknown) {
    const parsed = SeasonIdSchema.safeParse(data);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await deleteSeason(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function getSeasonPodiumAction(input: unknown) {
    const parsed = SeasonIdSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getSeasonPodium(supabase, parsed.data.seasonId);
}

export async function getSeasonAwardsAction(input: unknown) {
    const parsed = SeasonIdSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getSeasonAwards(supabase, parsed.data.seasonId);
}

export async function getSeasonResultsPageAction(input: unknown) {
    const parsed = SeasonIdSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    return getSeasonResultsPage(supabase, parsed.data.seasonId);
}

export async function getAwardNameSuggestionsAction(input: unknown) {
    const parsed = AwardNameSuggestionsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    return getAwardNameSuggestions(supabase, parsed.data);
}

export async function addAwardNameAction(input: unknown) {
    const parsed = AddAwardNameSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    return addAwardName(supabase, parsed.data);
}

export async function getSeasonHistoryDetailAction(slug: string, regionCode:string) {
    const supabase = await createServerSupabase();
    return getSeasonHistoryDetail(supabase, slug, regionCode);
}

export async function deriveAndSaveSeasonPodiumAction(input: unknown) {
    const parsed = DeriveSeasonPodiumSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await deriveAndSaveSeasonPodium(supabase, parsed.data.seasonId);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function upsertSeasonPodiumSlotAction(input: unknown) {
    const parsed = UpsertSeasonPodiumSlotSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await upsertSeasonPodiumSlot(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function deleteSeasonPodiumSlotAction(input: unknown) {
    const parsed = DeleteSeasonPodiumSlotSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await deleteSeasonPodiumSlot(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function upsertSeasonAwardAction(input: unknown) {
    const parsed = UpsertSeasonAwardSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await upsertSeasonAward(supabase, parsed.data, guard.value);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function deleteSeasonAwardAction(input: unknown) {
    const parsed = DeleteSeasonAwardSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await deleteSeasonAward(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function batchUpsertSeasonAwardsAction(input: unknown) {
    const parsed = BatchUpsertSeasonAwardsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await batchUpsertSeasonAwards(supabase, parsed.data, guard.value);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function updateSeasonAwardAction(input: unknown) {
    const parsed = UpdateSeasonAwardSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await updateSeasonAward(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function reorderSeasonAwardsAction(input: unknown) {
    const parsed = ReorderSeasonAwardsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await reorderSeasonAwards(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function getSeasonAllStarTeamsAction(input: unknown) {
    const parsed = SeasonIdSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getSeasonAllStarTeams(supabase, parsed.data.seasonId);
}

export async function upsertSeasonAllStarTeamNameAction(input: unknown) {
    const parsed = UpsertSeasonAllStarTeamNameSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await upsertSeasonAllStarTeamName(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function setAllStarCaptainAction(input: unknown) {
    const parsed = SetAllStarCaptainSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await setAllStarCaptain(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function refreshAwardAvatarAction(input: unknown) {
    const parsed = z.object({awardId: z.uuid()}).safeParse(input);
    if (!parsed.success) return Err({message: "Invalid award ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    return refreshAwardAvatar(supabase, parsed.data.awardId);
}

export async function fetchChampionRosterAwardsAction(input: unknown) {
    const parsed = z.object({seasonId: z.uuid()}).safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;
    const result = await fetchChampionRosterAwards(supabase, parsed.data.seasonId, guard.value);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}
