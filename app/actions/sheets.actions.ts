"use server"

import {z} from "zod";
import {revalidatePath} from "next/cache";
import {revalidatePublicData, SHEET_SYNC_TAGS} from "@/server/cache/revalidate";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {readSheetRangeWithColors} from "@/server/utils/googleSheets";
import {parseTeamsSheet} from "@/server/domains/sheets/helpers/parseTeamsSheet";
import {parseQualifierRows} from "@/server/domains/sheets/helpers/parseQualifierRows";
import {
    findAllSheetConfigs,
    findSheetConfigById,
    insertSheetConfig,
    updateSheetConfig,
    deleteSheetConfig,
    updateCronEnabled,
} from "@/server/db/sheetConfig.repo";
import {
    findAllSyncLogs,
    findSyncLogsByConfigId,
    findLatestSyncLogByConfigId,
    deleteSyncLogsByConfigId,
} from "@/server/db/sheetSyncLog.repo";
import {clearSeasonRosters} from "@/server/db/players.repo";
import {hardDeleteTeamsBySeasonId} from "@/server/db/teams.repo";
import {deleteTeamNameHistoryBySeasonId} from "@/server/db/teamNameHistory.repo";
import {deleteSeasonMatchesBySeasonId} from "@/server/db/matches.repo";
import {deletePlayoffMatchesBySeasonId} from "@/server/db/playoff.repo";
import {syncSheet} from "@/server/domains/sheets/commands/syncSheet";
import {revertSyncs} from "@/server/domains/sheets/commands/revertSyncs";
import {requireSuperAdmin} from "@/server/domains/auth";

const SaveSheetConfigSchema = z.object({
    seasonId: z.string().uuid(),
    sheetId: z.string().min(1, "Sheet ID required"),
    tabName: z.string().min(1, "Tab name required"),
    sheetType: z.enum(['qualifier', 'playoff', 'teams']),
    headerRow: z.number().int().min(1).default(9),
    blockHeight: z.number().int().min(1).default(18),
    blockStride: z.number().int().min(1).default(5),
});

const UpdateSheetConfigSchema = z.object({
    id: z.string().uuid(),
    sheetId: z.string().min(1, "Sheet ID required").optional(),
    tabName: z.string().min(1, "Tab name required").optional(),
    sheetType: z.enum(['qualifier', 'playoff', 'teams']).optional(),
    headerRow: z.number().int().min(1).optional(),
    blockHeight: z.number().int().min(1).optional(),
    blockStride: z.number().int().min(1).optional(),
});

async function requireAuth(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    const {data: {user}} = await supabase.auth.getUser();
    return user;
}

export async function previewSheetAction(input: {
    sheetId: string;
    tabName: string;
    sheetType: string;
    headerRow: number;
    blockHeight: number;
    blockStride: number;
}) {
    try {
        const {values, bgColors, fgColors} = await readSheetRangeWithColors(input.sheetId, input.tabName);
        if (input.sheetType === 'qualifier') {
            const {results, errors} = parseQualifierRows(values, fgColors, input.headerRow);
            const totalRows = values.length;
            const sampleCodes = values
                .slice(input.headerRow, input.headerRow + 5)
                .map((r, i) => `row${input.headerRow + i + 1}[E]="${r[4] ?? ''}"`)
                .join(', ');
            return Ok({type: 'qualifier' as const, data: results, errors, totalRows, sampleCodes});
        }
        const teams = parseTeamsSheet(values, input.headerRow, input.blockHeight, input.blockStride, bgColors);
        return Ok({type: 'teams' as const, data: teams});
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
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;
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
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;

    const configResult = await findSheetConfigById(supabase, configId);
    if (!configResult.ok) return configResult;
    if (!configResult.value) return Err({message: "Config not found", code: "NOT_FOUND" as const});

    const errs: string[] = [];

    if (options.wipeData) {
        const seasonId = configResult.value.season_id;
        const sheetType = configResult.value.sheet_type;

        if (sheetType === 'playoff' || sheetType === 'qualifier' || sheetType === 'teams') {
            const r = await deletePlayoffMatchesBySeasonId(supabase, seasonId);
            if (!r.ok) errs.push(`Playoff matches: ${r.error.message}`);
        }
        if (sheetType === 'qualifier' || sheetType === 'teams') {
            const r = await deleteSeasonMatchesBySeasonId(supabase, seasonId);
            if (!r.ok) errs.push(`Season matches: ${r.error.message}`);
        }
        if (sheetType === 'teams') {
            const r1 = await clearSeasonRosters(supabase, seasonId);
            if (!r1.ok) errs.push(`Rosters: ${r1.error.message}`);
            const r2 = await deleteTeamNameHistoryBySeasonId(supabase, seasonId);
            if (!r2.ok) errs.push(`Name history: ${r2.error.message}`);
            const r3 = await hardDeleteTeamsBySeasonId(supabase, seasonId);
            if (!r3.ok) errs.push(`Teams: ${r3.error.message}`);
        }
    }

    if (options.clearLogs) {
        const r3 = await deleteSyncLogsByConfigId(supabase, configId);
        if (!r3.ok) errs.push(`Logs: ${r3.error.message}`);
    }

    if (errs.length > 0) return Err({message: errs.join('; '), code: 'DB_ERROR' as const});

    revalidatePath('/admin/sync');
    revalidatePath('/admin/sync/history');

    if (options.wipeData) revalidatePublicData(SHEET_SYNC_TAGS);
    return Ok(true as const);
}

export async function runSyncAction(configId: string) {
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const result = await syncSheet(supabase, configId, 'manual');
    if (result.ok) {
        revalidatePath('/admin/sync');
        revalidatePublicData(SHEET_SYNC_TAGS);
    }
    return result;
}

export async function getLastSyncTimesAction(configIds: string[]): Promise<{ok: true; value: Record<string, string | null>} | {ok: false; error: {message: string; code: string}}> {
    const supabase = await createServerSupabase();
    const results = await Promise.all(
        configIds.map(id => findLatestSyncLogByConfigId(supabase, id).then(r => ({id, r})))
    );
    const times: Record<string, string | null> = {};
    for (const {id, r} of results) {
        times[id] = r.ok && r.value ? r.value.synced_at : null;
    }
    return {ok: true, value: times};
}

export async function toggleCronEnabledAction(configId: string, enabled: boolean) {
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const result = await updateCronEnabled(supabase, configId, enabled);
    if (result.ok) revalidatePath('/admin/sync');
    return result;
}

const RevertSyncsSchema = z.object({
    configId: z.string().uuid(),
    targetSyncId: z.string().uuid(),
});

export async function revertSyncsAction(configId: string, targetSyncId: string) {
    const parsed = RevertSyncsSchema.safeParse({configId, targetSyncId});
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR" as const});
    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "Not authenticated", code: "UNAUTHORIZED" as const});
    const result = await revertSyncs(supabase, parsed.data);
    if (result.ok) {
        revalidatePath('/admin/sync/history');
        revalidatePath('/admin/sync');

        revalidatePublicData(SHEET_SYNC_TAGS);
    }
    return result;
}
