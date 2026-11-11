"use server"

import {Result} from "@/shared/types/result";
import {DashboardColumn, getAdminDashboard} from "@/server/domains/admin";
import {createServerSupabase} from "@/server/supabase/server";
import { requireGroups } from "@/server/domains/auth";

export async function getAdminDashboardAction(): Promise<Result<DashboardColumn[]>> {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['admin', 'graphics', 'media']);
    if (!guard.ok) return guard;

    return getAdminDashboard(supabase);
}
