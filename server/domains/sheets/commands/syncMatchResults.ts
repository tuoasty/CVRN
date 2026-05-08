import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, SheetConfig} from "@/shared/types/db";
import {SyncChange, SyncResult} from "@/server/domains/sheets/types";
import {parseQualifierRows} from "@/server/domains/sheets/helpers/parseQualifierRows";
import {parseScheduleCell} from "@/server/domains/sheets/helpers/parseScheduleCell";
import {resolveTeamNames} from "@/server/domains/sheets/helpers/resolveTeamNames";
import {readSheetRangeWithColors} from "@/server/utils/googleSheets";
import {findTeamsBySeasonId} from "@/server/db/teams.repo";
import {
    insertMatches,
    findMatchByCode,
    updateMatchSchedule,
    rpcCompleteMatch,
    rpcReapplyMatchResult,
} from "@/server/db/matches.repo";
import {findSeasonById} from "@/server/db/seasons.repo";
import {validateAndCalculateMatchResult} from "@/server/domains/match/helpers/validateAndCalculateMatchResult";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {randomUUID} from "node:crypto";

export async function syncMatchResults(
    supabase: DBClient,
    config: SheetConfig
): Promise<Result<SyncResult>> {
    try {
        const {values} = await readSheetRangeWithColors(config.sheet_id, config.tab_name);

        const seasonResult = await findSeasonById(supabase, config.season_id);
        if (!seasonResult.ok) return seasonResult;
        if (!seasonResult.value) {
            return Err({message: "Season not found", code: "NOT_FOUND"});
        }
        const year = parseInt(seasonResult.value.start_date.substring(0, 4), 10);

        const {results: parsed, errors: parseErrors} = parseQualifierRows(values, config.header_row ?? 8);

        const teamsResult = await findTeamsBySeasonId(supabase, config.season_id);
        if (!teamsResult.ok) return teamsResult;
        const nameMap = resolveTeamNames(teamsResult.value);

        const changes: SyncChange[] = [];
        let rowsProcessed = 0;
        let rowsErrored = parseErrors.length;
        const errors = [...parseErrors];

        for (const result of parsed) {
            rowsProcessed++;

            const homeTeamId = nameMap.get(result.homeTeamName.toLowerCase().trim());
            const awayTeamId = nameMap.get(result.awayTeamName.toLowerCase().trim());

            if (!homeTeamId) {
                errors.push({row: result.rowNumber, message: `Home team "${result.homeTeamName}" not found in season`});
                rowsErrored++;
                continue;
            }
            if (!awayTeamId) {
                errors.push({row: result.rowNumber, message: `Away team "${result.awayTeamName}" not found in season`});
                rowsErrored++;
                continue;
            }

            const week = parseInt(result.matchCode.split('-')[0], 10);
            if (isNaN(week)) {
                errors.push({row: result.rowNumber, message: `Match code "${result.matchCode}": cannot parse week number`});
                rowsErrored++;
                continue;
            }

            const scheduledAt = result.scheduleRaw ? parseScheduleCell(result.scheduleRaw, year) : null;
            if (result.scheduleRaw && !scheduledAt) {
                errors.push({row: result.rowNumber, message: `Schedule "${result.scheduleRaw}": unrecognized format — expected "Month Dth, H:MM AM/PM [GMT±N]" (e.g. "May 2nd, 5:00 PM [GMT+8]")`});
                rowsErrored++;
            }

            const existingResult = await findMatchByCode(supabase, result.matchCode, config.season_id);
            if (!existingResult.ok) {
                errors.push({row: result.rowNumber, message: `DB error looking up match: ${existingResult.error.message}`});
                rowsErrored++;
                continue;
            }
            let match = existingResult.value;

            const hasScores = result.isForfeit || result.sets.length > 0;
            const hasSchedule = scheduledAt !== null;

            if (!hasScores && match?.status === 'completed') {
                // Don't touch completed matches when sheet has no scores
                rowsProcessed--;
                continue;
            }

            // Create match if it doesn't exist
            const wasCreated = !match;
            if (!match) {
                const initialStatus = hasScores ? 'pending' : hasSchedule ? 'scheduled' : 'pending';
                const insertResult = await insertMatches(supabase, [{
                    id: randomUUID(),
                    seasonId: config.season_id,
                    homeTeamId,
                    awayTeamId,
                    week,
                    scheduledAt,
                    status: initialStatus,
                    matchType: 'season',
                    matchCode: result.matchCode,
                }]);
                if (!insertResult.ok) {
                    errors.push({row: result.rowNumber, message: `Failed to create match: ${insertResult.error.message}`});
                    rowsErrored++;
                    continue;
                }
                match = insertResult.value[0];
            }

            if (!hasScores) {
                // Case B/C: schedule only or nothing
                if (hasSchedule && match.status !== 'completed') {
                    if (!wasCreated) {
                        // Existing match — update schedule in DB
                        const scheduleResult = await updateMatchSchedule(supabase, match.id, scheduledAt);
                        if (!scheduleResult.ok) {
                            errors.push({row: result.rowNumber, message: `Failed to update schedule: ${scheduleResult.error.message}`});
                            rowsErrored++;
                            continue;
                        }
                    }
                    changes.push({
                        type: 'match_result',
                        entityId: match.id,
                        before: wasCreated ? {} : {status: match.status},
                        after: {matchCode: result.matchCode, status: 'scheduled', scheduledAt, created: wasCreated},
                    });
                } else if (wasCreated) {
                    // New match with no schedule — still record creation
                    changes.push({
                        type: 'match_result',
                        entityId: match.id,
                        before: {},
                        after: {matchCode: result.matchCode, status: 'pending', created: true},
                    });
                }
                continue;
            }

            // Case A: has scores — complete or re-apply
            let forfeitingTeam: 'home' | 'away' | undefined;
            if (result.isForfeit) {
                const winnerNorm = result.winner?.toLowerCase().trim() ?? '';
                if (winnerNorm === result.homeTeamName.toLowerCase().trim()) {
                    forfeitingTeam = 'away';
                } else {
                    forfeitingTeam = 'home';
                }
            }

            const matchContext = {
                best_of: match.best_of ?? 3,
                match_type: 'season',
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
            };
            const matchInput = {
                sets: result.sets,
                isForfeit: result.isForfeit,
                forfeitingTeam,
                matchMvpPlayerId: null,
                loserMvpPlayerId: null,
            };

            const calcResult = validateAndCalculateMatchResult(matchInput, matchContext);
            if (!calcResult.ok) {
                errors.push({row: result.rowNumber, message: `Invalid match result: ${calcResult.error.message}`});
                rowsErrored++;
                continue;
            }
            const calc = calcResult.value;

            const rpcParams = {
                matchId: match.id,
                sets: calc.setsToInsert,
                homeSetsWon: calc.homeSetsWon,
                awaySetsWon: calc.awaySetsWon,
                homeLvr: calc.homeTeamLvr,
                awayLvr: calc.awayTeamLvr,
                mvpPlayerId: null,
                loserMvpPlayerId: null,
                isForfeit: result.isForfeit,
                scheduledAt,
            };

            let completeResult;
            if (match.status === 'completed') {
                const {scheduledAt: _sa, ...reapplyParams} = rpcParams;
                completeResult = await rpcReapplyMatchResult(supabase, reapplyParams);
            } else {
                completeResult = await rpcCompleteMatch(supabase, rpcParams);
            }

            if (!completeResult.ok) {
                errors.push({row: result.rowNumber, message: `Failed to complete match: ${completeResult.error.message}`});
                rowsErrored++;
                continue;
            }

            changes.push({
                type: 'match_result',
                entityId: match.id,
                before: {status: match.status},
                after: {
                    matchCode: result.matchCode,
                    status: 'completed',
                    homeSetsWon: calc.homeSetsWon,
                    awaySetsWon: calc.awaySetsWon,
                    isForfeit: result.isForfeit,
                },
            });
        }

        return Ok({rowsProcessed, rowsErrored, errors, changes});
    } catch (error) {
        logger.error({error, configId: config.id}, "Unexpected error in syncMatchResults");
        return Err(serializeError(error));
    }
}
