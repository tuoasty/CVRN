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
                    name: "ValidationError",
                    message: "Invalid timezone"
                });
            }

            scheduledAt = convertToUTC(p.scheduledDate, p.scheduledTime, p.timezone);

            if (!scheduledAt) {
                return Err({
                    name: "ValidationError",
                    message: "Invalid date/time/timezone combination"
                });
            }
        }

        const { data, error } = await updateMatchSchedule(
            supabase,
            p.matchId,
            scheduledAt
        );

        if (error) {
            logger.error({ matchId: p.matchId, error }, "Failed to update match schedule");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "UpdateError",
                message: "Failed to update match schedule"
            });
        }

        return Ok(data as Match);
    } catch (error) {
        logger.error({ error }, "Unexpected error updating match schedule");
        return Err(serializeError(error));
    }
}
