import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {updateMatchSchedule} from "@/server/db/matches.repo";
import {UpdateMatchScheduleInput} from "../types";
import {convertToUTC, isValidTimezone} from "@/server/utils/timezone";

export async function updateMatchScheduleService(
    supabase: DBClient,
    p: UpdateMatchScheduleInput
): Promise<Result<Match>> {
    try {
        let scheduledAt: string | null = null;

        if (p.scheduledDate && p.scheduledTime && p.timezone) {
            if (!isValidTimezone(p.timezone)) {
                return Err({
                    message: "Invalid timezone",
                    code: "VALIDATION_ERROR"
                });
            }

            scheduledAt = convertToUTC(p.scheduledDate, p.scheduledTime, p.timezone);

            if (!scheduledAt) {
                return Err({
                    message: "Invalid date/time/timezone combination",
                    code: "VALIDATION_ERROR"
                });
            }
        }

        const result = await updateMatchSchedule(supabase, p.matchId, scheduledAt);
        if (!result.ok) {
            logger.error({ matchId: p.matchId, error: result.error }, "Failed to update match schedule");
            return result;
        }
        return Ok(result.value as Match);
    } catch (error) {
        logger.error({ error }, "Unexpected error updating match schedule");
        return Err(serializeError(error));
    }
}
