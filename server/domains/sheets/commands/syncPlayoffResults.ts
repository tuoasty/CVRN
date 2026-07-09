import { findSeasonById } from "@/server/db/seasons.repo";
import { readSheetRangeWithColors } from "@/server/utils/googleSheets";
import { logger } from "@/server/utils/logger";
import { serializeError } from "@/server/utils/serializeableError";
import { DBClient, SheetConfig } from "@/shared/types/db";
import { Err, Ok, Result } from "@/shared/types/result";
import { SyncChange, SyncResult } from "../types";
import { findTeamsBySeasonId } from "@/server/db/teams.repo";
import { findTeamNameHistoryByTeamIds } from "@/server/db/teamNameHistory.repo";
import { resolveTeamNames } from "../helpers/resolveTeamNames";
import { findPlayoffMatchesBySeason } from "@/server/db/matches.repo";
import { parsePlayoffMatches } from "../helpers/parsePlayoffMatches";
import { templates } from "../../playoff";
import { findPlayoffConfigBySeasonId } from "@/server/db/playoff.repo";

export async function syncPlayoffResults(
  supabase: DBClient,
  config: SheetConfig
): Promise<Result<SyncResult>>{
  try {
    const {values} = await readSheetRangeWithColors(config.sheet_id, config.tab_name);

    const [seasonResult, configResult] = await Promise.all([
      findSeasonById(supabase, config.season_id),
      findPlayoffConfigBySeasonId(supabase, config.season_id),
    ]);

    if (!seasonResult.ok) return seasonResult;
    if (!seasonResult.value) {
        return Err({message: "Season not found", code: "NOT_FOUND"});
    }

    const season = seasonResult.value;
    if (!season) {
      logger.error({ seasonId: config.season_id }, "Season not found");
      return Err({
        message: "Season not found",
        code: "NOT_FOUND"
      });
    }

    if (!season.playoff_started) {
      return Err({
        message: "Playoffs has not yet started",
        code: "CONFLICT"
      });
    }

    if (!configResult.ok) {
        logger.error({ seasonId: config.season_id, error: configResult.error }, "Failed to look up playoff config");
        return configResult;
    }
    const seasonConfig = configResult.value;
    if (!seasonConfig) {
        logger.error({ seasonId: config.season_id }, "Playoff config not found");
        return Err({
            message: "No playoff configuration found for this season",
            code: "NOT_FOUND"
        });
    }
    const template = seasonConfig.template;
    if (!template) {
        return Err({
            message: "This season's playoff configuration has no template set",
            code: "VALIDATION_ERROR"
        });
    }
    if (!(template in templates)) {
        return Err({
            message: `Unknown playoff template "${template}"`,
            code: "VALIDATION_ERROR"
        });
    }

    const playoffConfig = templates[template as keyof typeof templates];
    // questionable year parse method
    const year = parseInt(seasonResult.value.start_date.substring(0, 4), 10);

    // get all playoff matches with codes here.

    const playoffMatchesResult = await findPlayoffMatchesBySeason(supabase, config.season_id);
    if(!playoffMatchesResult.ok) return playoffMatchesResult;
    const knownCodes = new Set(playoffMatchesResult.value
      .map(match => match.match_code)
      .filter((code): code is string => code !== null))

    // Parse all playoff matches
    const {results: parsed, errors: parseErrors} = parsePlayoffMatches(values, knownCodes)

    const teamsResult = await findTeamsBySeasonId(supabase, config.season_id);
    if (!teamsResult.ok) return teamsResult;
    const teamIds = teamsResult.value.map(t => t.id);
    const historyResult = await findTeamNameHistoryByTeamIds(supabase, teamIds);
    if (!historyResult.ok) return historyResult;
    const nameMap = resolveTeamNames(teamsResult.value, historyResult.value);

    const changes: SyncChange[] = [];
    let rowsProcessed = 0;
    let rowsErrored = parseErrors.length;
    const errors = [...parseErrors];

    // obtain code order from template (DAG), then find the respective coded match from results
    // loop through code order instead of results

    // get code order here, helper function
    

    return Ok({rowsProcessed, rowsErrored, errors, changes})

  } catch (error) {
    logger.error({error, configId: config.id}, "Unexpected error in syncPlayoffResults");
    return Err(serializeError(error));
  }
}