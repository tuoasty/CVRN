"use server"

import {Err, Result} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {requireGroups} from "@/server/domains/auth";
import {
    getStaffPage,
    saveRoleMapping,
    setUserBlocks,
    SaveRoleMappingSchema,
    SetUserBlocksSchema,
    StaffPage,
} from "@/server/domains/staff";

export async function getStaffPageAction(): Promise<Result<StaffPage>> {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["super_admin"]);
    if (!guard.ok) return guard;
    return getStaffPage(supabase);
}

export async function saveRoleMappingAction(input: unknown): Promise<Result<true>> {
    const parsed = SaveRoleMappingSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["super_admin"]);
    if (!guard.ok) return guard;
    return saveRoleMapping(supabase, parsed.data, guard.value.userId);
}

export async function setUserBlocksAction(input: unknown): Promise<Result<true>> {
    const parsed = SetUserBlocksSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["super_admin"]);
    if (!guard.ok) return guard;
    return setUserBlocks(supabase, parsed.data, guard.value.userId);
}
