import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {SyncResult, SyncTrigger} from "@/server/domains/sheets/types";
import {findSheetConfigById} from "@/server/db/sheetConfig.repo";
import {insertSyncLog} from "@/server/db/sheetSyncLog.repo";
import {syncTeamRoster} from "./syncTeamRoster";
import {syncMatchResults} from "./syncMatchResults";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function syncSheet(
    supabase: DBClient,
    configId: string,
    triggeredBy: SyncTrigger
): Promise<Result<SyncResult>> {
    try {
        const configResult = await findSheetConfigById(supabase, configId);
        if (!configResult.ok) return configResult;
        if (!configResult.value) {
            return Err({message: "Sheet config not found", code: "NOT_FOUND"});
        }
        const config = configResult.value;

        let syncResult: Result<SyncResult>;
        if (config.sheet_type === 'teams') {
            syncResult = await syncTeamRoster(supabase, config);
        } else if (config.sheet_type === 'qualifier') {
            syncResult = await syncMatchResults(supabase, config);
        } else {
            return Err({message: `Sheet type "${config.sheet_type}" sync not yet implemented`, code: "VALIDATION_ERROR"});
        }

        const status = !syncResult.ok
            ? 'failed'
            : syncResult.value.rowsErrored > 0 && syncResult.value.rowsProcessed === 0
              ? 'failed'
              : syncResult.value.rowsErrored > 0
                ? 'partial'
                : syncResult.value.errors.length > 0
                  ? 'warning'
                  : 'success';

        const result = syncResult.ok ? syncResult.value : {
            rowsProcessed: 0,
            rowsErrored: 1,
            errors: [{row: 0, message: syncResult.error.message}],
            changes: [],
        };

        await insertSyncLog(supabase, {
            sheetConfigId: configId,
            triggeredBy,
            status,
            rowsProcessed: result.rowsProcessed,
            rowsErrored: result.rowsErrored,
            errors: result.errors,
            changes: result.changes,
        });

        if (!syncResult.ok) return syncResult;
        return Ok(result);
    } catch (error) {
        logger.error({error, configId}, "Unexpected error in syncSheet");
        return Err(serializeError(error));
    }
}
