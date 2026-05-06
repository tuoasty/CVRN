"use server"

import {createServerSupabase} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {getAllSeasons, getSeasonBySlugAndRegion, createSeason, updateSeason, deleteSeason} from "@/server/domains/season";
import {SeasonSlugRegionSchema, SeasonIdSchema, CreateSeasonSchema, UpdateSeasonSchema} from "@/server/domains/season";
import {revalidatePath} from "next/cache";

async function requireAuth(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    const {data: {user}} = await supabase.auth.getUser();
    return user;
}

export async function getAllSeasonsAction() {
    const supabase = await createServerSupabase();
    return getAllSeasons(supabase);
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
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});
    const result = await deleteSeason(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/seasons');
    return result;
}
