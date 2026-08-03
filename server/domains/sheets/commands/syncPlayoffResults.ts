import { findSeasonById } from "@/server/db/seasons.repo";
import { readSheetRangeWithColors } from "@/server/utils/googleSheets";
import { logger } from "@/server/utils/logger";
import { serializeError } from "@/server/utils/serializeableError";
import { DBClient, SheetConfig } from "@/shared/types/db";
import { Err, Ok, Result } from "@/shared/types/result";
import { SyncChange, SyncError, SyncResult } from "../types";
import { findAllTeamsBySeasonIdIncludingDeleted } from "@/server/db/teams.repo";
import { findTeamNameHistoryByTeamIds } from "@/server/db/teamNameHistory.repo";
import { resolveTeamNames } from "../helpers/resolveTeamNames";
import {
  findMatchByCode,
  findMatchSets,
  findPlayoffMatchesBySeason,
  rpcCompleteMatch,
  rpcReapplyMatchResult,
  updateMatchSchedule,
} from "@/server/db/matches.repo";
import { parsePlayoffMatches } from "../helpers/parsePlayoffMatches";
import { getTemplateMatchOrder } from "../../playoff";
import { findPlayoffConfigBySeasonId } from "@/server/db/playoff.repo";
import { parsePlayoffScheduleCell } from "../helpers/parseScheduleCell";
import { resolveAndAssignMatchOfficials } from "../helpers/resolveMatchOfficials";
import { hasMatchResultChanged } from "../helpers/hasMatchResultChanged";
import { validateAndCalculateMatchResult } from "@/server/domains/match/helpers/validateAndCalculateMatchResult";

import { teamNameKey as norm } from "@/server/domains/team/helpers/normalizeTeamName";

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

    const orderResult = getTemplateMatchOrder(template);
    if (!orderResult.ok) {
        logger.error({ seasonId: config.season_id, template, error: orderResult.error }, "Failed to derive playoff match order");
        return orderResult;
    }
    const codeOrder = orderResult.value;

    const year = parseInt(seasonResult.value.start_date.substring(0, 4), 10);

    const playoffMatchesResult = await findPlayoffMatchesBySeason(supabase, config.season_id);
    if(!playoffMatchesResult.ok) return playoffMatchesResult;
    const knownCodes = new Set(playoffMatchesResult.value
      .map(match => match.match_code)
      .filter((code): code is string => code !== null))

    const {results: parsed, errors: parseErrors} = parsePlayoffMatches(values, knownCodes)

    const teamsResult = await findAllTeamsBySeasonIdIncludingDeleted(supabase, config.season_id);
    if (!teamsResult.ok) return teamsResult;
    const teamIds = teamsResult.value.map(t => t.id);
    const historyResult = await findTeamNameHistoryByTeamIds(supabase, teamIds);
    if (!historyResult.ok) return historyResult;
    const nameMap = resolveTeamNames(teamsResult.value, historyResult.value);

    const changes: SyncChange[] = [];
    let rowsProcessed = 0;
    let rowsErrored = parseErrors.length;
    const errors: SyncError[] = [...parseErrors];

    const parsedByCode = new Map(parsed.map(p => [p.matchCode.toUpperCase(), p]));

    for (const code of codeOrder) {
      const sheetMatch = parsedByCode.get(code.toUpperCase());

      if (!sheetMatch) continue;

      const row = sheetMatch.rowNumber;

      const existingResult = await findMatchByCode(supabase, code, config.season_id);
      if (!existingResult.ok) {
        errors.push({row, message: `[${code}] DB error looking up match: ${existingResult.error.message}`});
        rowsErrored++;
        continue;
      }
      const match = existingResult.value;

      if (!match) {
        errors.push({row, message: `[${code}] No playoff match with this code exists for the season — generate the bracket first`});
        rowsErrored++;
        continue;
      }

      if (!match.home_team_id || !match.away_team_id) continue;

      const sheetHomeId = nameMap.get(norm(sheetMatch.homeTeamName));
      const sheetAwayId = nameMap.get(norm(sheetMatch.awayTeamName));
      if (!sheetHomeId || !sheetAwayId) {
        const unknown = !sheetHomeId ? sheetMatch.homeTeamName : sheetMatch.awayTeamName;
        errors.push({row, message: `[${code}] Team "${unknown}" not found in season`});
        rowsErrored++;
        continue;
      }
      if (sheetHomeId !== match.home_team_id || sheetAwayId !== match.away_team_id) {
        const nameOf = (id: string) => teamsResult.value.find(t => t.id === id)?.name ?? id;
        errors.push({
          row,
          message: `[${code}] Sheet says "${sheetMatch.homeTeamName}" vs "${sheetMatch.awayTeamName}" but the bracket advanced "${nameOf(match.home_team_id)}" vs "${nameOf(match.away_team_id)}". Fix the sheet — sync will not overwrite the bracket.`,
        });
        rowsErrored++;
        continue;
      }

      rowsProcessed++;

      const schedule = sheetMatch.scheduleRaw ? parsePlayoffScheduleCell(sheetMatch.scheduleRaw, year) : null;
      if (sheetMatch.scheduleRaw && !schedule) {
        errors.push({row, message: `[${code}] Schedule "${sheetMatch.scheduleRaw}": unrecognized format`});
        rowsErrored++;
      }
      const scheduledAt = schedule?.iso ?? null;

      if (sheetMatch.referees.length > 0 || sheetMatch.media.length > 0) {
        const officialErrors = await resolveAndAssignMatchOfficials(
          supabase,
          match.id,
          sheetMatch.referees,
          sheetMatch.media,
          row,
          code,
        );
        if (officialErrors.length > 0) {
          errors.push(...officialErrors);
          rowsErrored += officialErrors.length;
        }
      }

      const hasScores = sheetMatch.isForfeit || sheetMatch.sets.length > 0;

      if (!hasScores) {

        if (match.status === 'completed') {
          errors.push({
            row,
            message: `[${code}] Completed in the database but has no scores in the sheet. Reverting a playoff result must be done from the admin match editor.`,
          });
          rowsErrored++;
          continue;
        }

        if (scheduledAt) {
          const scheduleUnchanged = scheduledAt === match.scheduled_at && match.status === 'scheduled';
          if (!scheduleUnchanged) {
            const scheduleResult = await updateMatchSchedule(supabase, match.id, scheduledAt, 'scheduled');
            if (!scheduleResult.ok) {
              errors.push({row, message: `[${code}] Failed to update schedule: ${scheduleResult.error.message}`});
              rowsErrored++;
              continue;
            }
            changes.push({
              type: 'match_result',
              entityId: match.id,
              before: {status: match.status, scheduledAt: match.scheduled_at},
              after: {matchCode: code, status: 'scheduled', scheduledAt},
            });
          }
        }
        continue;
      }

      if (!match.best_of) {
        errors.push({row, message: `[${code}] Match has no best_of set — regenerate the bracket`});
        rowsErrored++;
        continue;
      }

      let forfeitingTeam: 'home' | 'away' | undefined;
      if (sheetMatch.isForfeit) {
        forfeitingTeam = norm(sheetMatch.winner ?? '') === norm(sheetMatch.homeTeamName) ? 'away' : 'home';
      }

      const calcResult = validateAndCalculateMatchResult(
        {
          sets: sheetMatch.sets,
          isForfeit: sheetMatch.isForfeit,
          forfeitingTeam,
          matchMvpPlayerId: null,
          loserMvpPlayerId: null,
        },
        {
          best_of: match.best_of,
          match_type: 'playoffs',
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
        },
      );
      if (!calcResult.ok) {
        errors.push({row, message: `[${code}] Invalid match result: ${calcResult.error.message}`});
        rowsErrored++;
        continue;
      }
      const calc = calcResult.value;

      const resultParams = {
        matchId: match.id,
        sets: calc.setsToInsert,
        homeSetsWon: calc.homeSetsWon,
        awaySetsWon: calc.awaySetsWon,
        homeLvr: calc.homeTeamLvr,
        awayLvr: calc.awayTeamLvr,
        homePoints: calc.homeTeamPoints,
        awayPoints: calc.awayTeamPoints,
        homeBonus: calc.homeTeamBonus,
        awayBonus: calc.awayTeamBonus,
        pointDiff: calc.pointDiff,
        mvpPlayerId: null,
        loserMvpPlayerId: null,
        isForfeit: sheetMatch.isForfeit,
      };

      if (match.status === 'completed') {
        const existingSetsResult = await findMatchSets(supabase, match.id);
        if (!existingSetsResult.ok) {
          errors.push({row, message: `[${code}] Failed to load existing sets: ${existingSetsResult.error.message}`});
          rowsErrored++;
          continue;
        }
        const unchanged = !hasMatchResultChanged(
          existingSetsResult.value,
          match.is_forfeit ?? false,
          calc.setsToInsert,
          sheetMatch.isForfeit,
        );
        if (unchanged) continue;
      }

      const completeResult = match.status === 'completed'
        ? await rpcReapplyMatchResult(supabase, resultParams)
        : await rpcCompleteMatch(supabase, {...resultParams, scheduledAt});

      if (!completeResult.ok) {
        errors.push({row, message: `[${code}] Failed to complete match: ${completeResult.error.message}`});
        rowsErrored++;
        continue;
      }

      changes.push({
        type: 'match_result',
        entityId: match.id,
        before: {status: match.status},
        after: {
          matchCode: code,
          status: 'completed',
          homeSetsWon: calc.homeSetsWon,
          awaySetsWon: calc.awaySetsWon,
          isForfeit: sheetMatch.isForfeit,
        },
      });
    }

    return Ok({rowsProcessed, rowsErrored, errors, changes})

  } catch (error) {
    logger.error({error, configId: config.id}, "Unexpected error in syncPlayoffResults");
    return Err(serializeError(error));
  }
}
