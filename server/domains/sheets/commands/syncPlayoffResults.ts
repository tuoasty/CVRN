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

    // Also validates the template key — an unknown one comes back as VALIDATION_ERROR.
    const orderResult = getTemplateMatchOrder(template);
    if (!orderResult.ok) {
        logger.error({ seasonId: config.season_id, template, error: orderResult.error }, "Failed to derive playoff match order");
        return orderResult;
    }
    const codeOrder = orderResult.value;

    // questionable year parse method
    const year = parseInt(seasonResult.value.start_date.substring(0, 4), 10);

    // Codes only. These never mutate, so a prefetch is safe here — the match rows
    // themselves are re-read inside the loop (see below).
    const playoffMatchesResult = await findPlayoffMatchesBySeason(supabase, config.season_id);
    if(!playoffMatchesResult.ok) return playoffMatchesResult;
    const knownCodes = new Set(playoffMatchesResult.value
      .map(match => match.match_code)
      .filter((code): code is string => code !== null))

    // Parse all playoff matches
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

    // Template order, not sheet order: completing W1 fills QF1's home slot via
    // advance_playoff_winner, so W1 must be processed first or QF1 is skipped as TBD.
    for (const code of codeOrder) {
      const sheetMatch = parsedByCode.get(code.toUpperCase());

      // Absent from the sheet, or a block whose team cells are still empty. An
      // unplayed bracket is the normal state — not an error.
      if (!sheetMatch) continue;

      const row = sheetMatch.rowNumber;

      const existingResult = await findMatchByCode(supabase, code, config.season_id);
      if (!existingResult.ok) {
        errors.push({row, message: `[${code}] DB error looking up match: ${existingResult.error.message}`});
        rowsErrored++;
        continue;
      }
      const match = existingResult.value;

      // Playoff matches exist only via buildPlayoffBracket. Never insert one here.
      if (!match) {
        errors.push({row, message: `[${code}] No playoff match with this code exists for the season — generate the bracket first`});
        rowsErrored++;
        continue;
      }

      // A null slot means the feeder hasn't completed yet. Skip silently: the sheet's
      // scores are home-then-away by sheet layout, and only the team names establish
      // which side is which, so scoring an unfilled slot would transpose them.
      if (!match.home_team_id || !match.away_team_id) continue;

      // DB wins. The sheet is a results feed; advance_playoff_winner owns topology.
      // Verify the names agree, never write a team id.
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
        // Never void from a sheet we don't own: void_match cascades a subtree reset
        // and would wipe an entire bracket branch on a blanked cell.
        if (match.status === 'completed') {
          errors.push({
            row,
            message: `[${code}] Completed in the database but has no scores in the sheet. Reverting a playoff result must be done from the admin match editor.`,
          });
          rowsErrored++;
          continue;
        }

        if (scheduledAt) {
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
        continue;
      }

      // The template sets bo3/bo5 per match; a bo5 GF scored 3-2 fails validation
      // against a defaulted best_of of 3.
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

      // Both RPCs call advance_playoff_winner internally for match_type='playoffs'.
      // Do not advance the bracket from here.
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
