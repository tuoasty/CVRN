import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {SyncChange} from "@/server/domains/sheets/types";
import {findSyncLogById, findSyncLogsForRevert, insertSyncLog} from "@/server/db/sheetSyncLog.repo";
import {deleteTeamById, unDisbandTeamById, updateTeamById} from "@/server/db/teams.repo";
import {hardDeletePlayerTeamSeason, restorePlayerTeamSeason, restorePlayerRole} from "@/server/db/players.repo";
import {deleteTeamNameHistoryById} from "@/server/db/teamNameHistory.repo";
import {generateSlug} from "@/server/domains/team/helpers/generateSlug";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

async function applyInverse(supabase: DBClient, change: SyncChange): Promise<Result<void>> {
    const {type, entityId, before, after} = change;
    const isLegacyCreation = type === 'team_rename' && Object.keys(before).length === 0;

    if (type === 'team_creation' || isLegacyCreation) {
        const r = await deleteTeamById(supabase, entityId);
        return r.ok ? Ok(undefined) : r;
    }

    if (type === 'team_rename') {
        const b = before as {name: string};
        const a = after as {teamNameHistoryId?: string};
        const renameResult = await updateTeamById(supabase, entityId, {
            name: b.name,
            slug: generateSlug(b.name),
        });
        if (!renameResult.ok) return renameResult;
        if (a.teamNameHistoryId) {
            const delResult = await deleteTeamNameHistoryById(supabase, a.teamNameHistoryId);
            if (!delResult.ok) return delResult;
        }
        return Ok(undefined);
    }

    if (type === 'team_disband') {
        const r = await unDisbandTeamById(supabase, entityId);
        return r.ok ? Ok(undefined) : r;
    }

    if (type === 'player_add') {
        const a = after as {playerTeamSeasonId?: string};
        if (!a.playerTeamSeasonId) {
            logger.warn({entityId}, "player_add revert: no playerTeamSeasonId, skipping (legacy log)");
            return Ok(undefined);
        }
        const r = await hardDeletePlayerTeamSeason(supabase, a.playerTeamSeasonId);
        return r.ok ? Ok(undefined) : r;
    }

    if (type === 'player_remove') {
        const b = before as {playerTeamSeasonId?: string};
        if (!b.playerTeamSeasonId) {
            logger.warn({entityId}, "player_remove revert: no playerTeamSeasonId, skipping (legacy log)");
            return Ok(undefined);
        }
        const r = await restorePlayerTeamSeason(supabase, b.playerTeamSeasonId);
        return r.ok ? Ok(undefined) : r;
    }

    if (type === 'role_change') {
        const b = before as {role: string; teamId: string};
        const r = await restorePlayerRole(supabase, entityId, b.teamId, b.role);
        return r.ok ? Ok(undefined) : r;
    }

    return Ok(undefined);
}

export async function revertSyncs(
    supabase: DBClient,
    input: {configId: string; targetSyncId: string}
): Promise<Result<{syncsReverted: number; changesReverted: number}>> {
    try {
        const targetResult = await findSyncLogById(supabase, input.targetSyncId);
        if (!targetResult.ok) return targetResult;
        if (!targetResult.value) return Err(serializeError(new Error("Target sync log not found"), "NOT_FOUND"));

        const logsResult = await findSyncLogsForRevert(supabase, input.configId, targetResult.value.synced_at);
        if (!logsResult.ok) return logsResult;

        const errors: {row: number; message: string}[] = [];
        const invertedChanges: SyncChange[] = [];

        for (const log of logsResult.value) {
            const changes = (log.changes as unknown as SyncChange[]) ?? [];
            const reversed = [...changes].reverse();

            for (const change of reversed) {
                const result = await applyInverse(supabase, change);
                if (!result.ok) {
                    logger.error({changeType: change.type, entityId: change.entityId, error: result.error}, "Revert change failed");
                    errors.push({row: 0, message: `Revert ${change.type} ${change.entityId}: ${result.error.message}`});
                } else {
                    invertedChanges.push(change);
                }
            }
        }

        await insertSyncLog(supabase, {
            sheetConfigId: input.configId,
            triggeredBy: 'rollback',
            status: errors.length === 0 ? 'success' : 'partial',
            rowsProcessed: logsResult.value.length,
            rowsErrored: errors.length,
            errors,
            changes: invertedChanges,
        });

        return Ok({
            syncsReverted: logsResult.value.length,
            changesReverted: invertedChanges.length,
        });
    } catch (error) {
        logger.error({error, configId: input.configId}, "Unexpected error in revertSyncs");
        return Err(serializeError(error));
    }
}
