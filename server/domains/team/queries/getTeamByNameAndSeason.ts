import {Err, Ok} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamByNameAndSeason} from "@/server/db/teams.repo";
import {GetTeamByNameSeason} from "../types";

export async function getTeamByNameAndSeason(supabase: DBClient, p: GetTeamByNameSeason) {
    try {
        const {data, error} = await findTeamByNameAndSeason(supabase, p);
        if (error) {
            logger.error({name: p.name, seasonId: p.seasonId, error}, "Failed to fetch team by name and season");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch team",
                name: "FetchError"
            });
        }

        return Ok(data);
    } catch (error) {
        return Err(serializeError(error));
    }
}
