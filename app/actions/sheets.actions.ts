"use server"

import {z} from "zod";
import {revalidatePath} from "next/cache";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {readSheetRangeWithColors} from "@/server/utils/googleSheets";
import {parseTeamsSheet} from "@/server/domains/sheets/helpers/parseTeamsSheet";
import {
    findAllSheetConfigs,
    findSheetConfigById,
    insertSheetConfig,
    updateSheetConfig,
    deleteSheetConfig,
} from "@/server/db/sheetConfig.repo";
import {
    findAllSyncLogs,
    findSyncLogsByConfigId,
    deleteSyncLogsByConfigId,
} from "@/server/db/sheetSyncLog.repo";
import {clearSeasonRosters} from "@/server/db/players.repo";
import {hardDeleteTeamsBySeasonId} from "@/server/db/teams.repo";
import {syncSheet} from "@/server/domains/sheets/commands/syncSheet";

const SaveSheetConfigSchema = z.object({
    seasonId: z.string().uuid(),
    sheetId: z.string().min(1, "Sheet ID required"),
    tabName: z.string().min(1, "Tab name required"),
    sheetType: z.enum(['qualifier', 'playoff', 'teams']),
    headerRow: z.number().int().min(1).default(9),
    blockHeight: z.number().int().min(1).default(18),
    blockStride: z.number().int().min(1).default(5),
    isActive: z.boolean().default(true),
});

const UpdateSheetConfigSchema = z.object({
    id: z.string().uuid(),
    sheetId: z.string().min(1, "Sheet ID required").optional(),
    tabName: z.string().min(1, "Tab name required").optional(),
    sheetType: z.enum(['qualifier', 'playoff', 'teams']).optional(),
    headerRow: z.number().int().min(1).optional(),
    blockHeight: z.number().int().min(1).optional(),
    blockStride: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
});

async function requireAuth(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    const {data: {user}} = await supabase.auth.getUser();
    return user;
}

export async function previewSheetAction(input: {
    sheetId: string;
    tabName: string;
    headerRow: number;
    blockHeight: number;
    blockStride: number;
}) {
    try {
        const {values, bgColors} = await readSheetRangeWithColors(input.sheetId, input.tabName);
        const teams = parseTeamsSheet(values, input.headerRow, input.blockHeight, input.blockStride, bgColors);
        return Ok(teams);
    } catch (error) {
        return Err({
            message: error instanceof Error ? error.message : 'Failed to read sheet',
            code: 'INTEGRATION_ERROR' as const,
        });
    }
}

export async function getSheetConfigsAction() {
    const supabase = await createServerSupabase();
    return findAllSheetConfigs(supabase);
}

export async function saveSheetConfigAction(data: unknown) {
    const parsed = SaveSheetConfigSchema.safeParse(data);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR" as const});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const result = await insertSheetConfig(supabase, parsed.data);
    if (result.ok) revalidatePath('/admin/sync');
    return result;
}

export async function updateSheetConfigAction(data: unknown) {
    const parsed = UpdateSheetConfigSchema.safeParse(data);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR" as const});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const {id, ...rest} = parsed.data;
    const result = await updateSheetConfig(supabase, id, rest);
    if (result.ok) revalidatePath('/admin/sync');
    return result;
}

export async function deleteSheetConfigAction(id: string) {
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const result = await deleteSheetConfig(supabase, id);
    if (result.ok) revalidatePath('/admin/sync');
    return result;
}

export async function getSyncLogsAction(configId?: string, limit = 100) {
    const supabase = await createServerSupabase();
    if (configId) return findSyncLogsByConfigId(supabase, configId, limit);
    return findAllSyncLogs(supabase, limit);
}

export async function resetConfigAction(configId: string, options: {
    wipeData: boolean;
    clearLogs: boolean;
}) {
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});

    const configResult = await findSheetConfigById(supabase, configId);
    if (!configResult.ok) return configResult;
    if (!configResult.value) return Err({message: "Config not found", code: "NOT_FOUND" as const});

    const errs: string[] = [];

    if (options.wipeData) {
        const seasonId = configResult.value.season_id;
        const r1 = await clearSeasonRosters(supabase, seasonId);
        if (!r1.ok) errs.push(`Rosters: ${r1.error.message}`);
        const r2 = await hardDeleteTeamsBySeasonId(supabase, seasonId);
        if (!r2.ok) errs.push(`Teams: ${r2.error.message}`);
    }

    if (options.clearLogs) {
        const r3 = await deleteSyncLogsByConfigId(supabase, configId);
        if (!r3.ok) errs.push(`Logs: ${r3.error.message}`);
    }

    if (errs.length > 0) return Err({message: errs.join('; '), code: 'DB_ERROR' as const});

    revalidatePath('/admin/sync');
    revalidatePath('/admin/sync/history');
    return Ok(true as const);
}

export async function runSyncAction(configId: string) {
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const result = await syncSheet(supabase, configId, 'manual');
    if (result.ok) revalidatePath('/admin/sync');
    return result;
}
