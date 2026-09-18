import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function resolveSeasonNumber(
    supabase: DBClient,
    param: "current" | number
): Promise<Result<number>> {
    if (typeof param === "number") return Ok(param);

    try {
        const {data, error} = await supabase
            .from("seasons")
            .select("season_number")
            .lte("start_date", new Date().toISOString())
            .order("start_date", {ascending: false})
            .limit(1)
            .maybeSingle();
        if (error) {
            logger.error({error}, "Failed to resolve current season number");
            return Err(serializeError(error, "DB_ERROR"));
        }
        if (!data) {
            return Err({message: "No current season found", code: "NOT_FOUND"});
        }
        return Ok(data.season_number);
    } catch (error) {
        logger.error({error}, "Unexpected error resolving current season number");
        return Err(serializeError(error));
    }
}
