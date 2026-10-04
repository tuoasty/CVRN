"use server"

import {createServerSupabase} from "@/server/supabase/server";
import {Err, Ok} from "@/shared/types/result";
import {getAllSeasons, getSeasonBySlugAndRegion, createSeason, updateSeason, deleteSeason, getSeasonById} from "@/server/domains/season";
import {SeasonSlugRegionSchema, SeasonIdSchema, CreateSeasonSchema, UpdateSeasonSchema} from "@/server/domains/season";
import {
    getSeasonPodium, getSeasonAwards, getSeasonHistoryDetail,
    upsertSeasonPodiumSlot, deleteSeasonPodiumSlot, deriveAndSaveSeasonPodium,
    upsertSeasonAward, deleteSeasonAward, storeAwardAvatar, fetchChampionRosterAwards,
    batchUpsertSeasonAwards, updateSeasonAward, reorderSeasonAwards,
    getSeasonAllStarTeams, upsertSeasonAllStarTeamName, UpsertSeasonAllStarTeamNameSchema,
    setAllStarCaptain, SetAllStarCaptainSchema,
    UpsertSeasonPodiumSlotSchema, DeleteSeasonPodiumSlotSchema,
    DeriveSeasonPodiumSchema, UpsertSeasonAwardSchema, DeleteSeasonAwardSchema,
    BatchUpsertSeasonAwardsSchema, UpdateSeasonAwardSchema, ReorderSeasonAwardsSchema,
} from "@/server/domains/season";
import {getRobloxFullAvatarsById} from "@/server/roblox/users";
import {requireSuperAdmin} from "@/server/domains/auth";
import {revalidatePath} from "next/cache";
import {z} from "zod";

async function requireAuth(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    const {data: {user}} = await supabase.auth.getUser();
    return user;
}

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
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await createSeason(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function updateSeasonAction(data: unknown) {
    const parsed = UpdateSeasonSchema.safeParse(data);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
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

export async function getSeasonHistoryDetailAction(slug: string, regionCode:string) {
    const supabase = await createServerSupabase();
    return getSeasonHistoryDetail(supabase, slug, regionCode);
}

export async function deriveAndSaveSeasonPodiumAction(input: unknown) {
    const parsed = DeriveSeasonPodiumSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await deriveAndSaveSeasonPodium(supabase, parsed.data.seasonId);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function upsertSeasonPodiumSlotAction(input: unknown) {
    const parsed = UpsertSeasonPodiumSlotSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await upsertSeasonPodiumSlot(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function deleteSeasonPodiumSlotAction(input: unknown) {
    const parsed = DeleteSeasonPodiumSlotSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await deleteSeasonPodiumSlot(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function upsertSeasonAwardAction(input: unknown) {
    const parsed = UpsertSeasonAwardSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await upsertSeasonAward(supabase, parsed.data, user.id);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function deleteSeasonAwardAction(input: unknown) {
    const parsed = DeleteSeasonAwardSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await deleteSeasonAward(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function batchUpsertSeasonAwardsAction(input: unknown) {
    const parsed = BatchUpsertSeasonAwardsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await batchUpsertSeasonAwards(supabase, parsed.data, user.id);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function updateSeasonAwardAction(input: unknown) {
    const parsed = UpdateSeasonAwardSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await updateSeasonAward(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function reorderSeasonAwardsAction(input: unknown) {
    const parsed = ReorderSeasonAwardsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
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
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await upsertSeasonAllStarTeamName(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function setAllStarCaptainAction(input: unknown) {
    const parsed = SetAllStarCaptainSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await setAllStarCaptain(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}

export async function previewAwardAvatarAction(input: unknown) {
    const parsed = z.object({playerId: z.uuid()}).safeParse(input);
    if (!parsed.success) return Err({message: "Invalid player ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});

    const {data: player} = await supabase
        .from("players")
        .select("roblox_user_id")
        .eq("id", parsed.data.playerId)
        .single();

    if (!player?.roblox_user_id) return Err({message: "Player not found", code: "NOT_FOUND"});

    const robloxId = String(player.roblox_user_id);
    const avatarResult = await getRobloxFullAvatarsById([robloxId]);
    if (!avatarResult.ok) return avatarResult;

    const avatar = avatarResult.value.find(a => String(a.targetId) === robloxId);
    if (!avatar?.imageUrl) return Err({message: "Could not fetch avatar from Roblox", code: "INTEGRATION_ERROR"});

    return Ok({cdnUrl: avatar.imageUrl});
}

export async function saveAwardAvatarAction(input: unknown) {
    const parsed = z.object({awardId: z.uuid(), cdnUrl: z.string().url()}).safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    return storeAwardAvatar(parsed.data.awardId, parsed.data.cdnUrl);
}

export async function fetchChampionRosterAwardsAction(input: unknown) {
    const parsed = z.object({seasonId: z.uuid()}).safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await fetchChampionRosterAwards(supabase, parsed.data.seasonId, user.id);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}
