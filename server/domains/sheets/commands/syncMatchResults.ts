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
    rpcVoidMatch,
} from "@/server/db/matches.repo";
import {findSeasonById} from "@/server/db/seasons.repo";
import {validateAndCalculateMatchResult} from "@/server/domains/match/helpers/validateAndCalculateMatchResult";
import {resolveAndAssignMatchOfficials} from "@/server/domains/sheets/helpers/resolveMatchOfficials";
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

            const mc = result.matchCode;

            if (!homeTeamId) {
                errors.push({row: result.rowNumber, message: `[${mc}] Home team "${result.homeTeamName}" not found in season`});
                rowsErrored++;
                continue;
            }
            if (!awayTeamId) {
                errors.push({row: result.rowNumber, message: `[${mc}] Away team "${result.awayTeamName}" not found in season`});
                rowsErrored++;
                continue;
            }

            const week = parseInt(mc.split('-')[0], 10);
            if (isNaN(week)) {
                errors.push({row: result.rowNumber, message: `[${mc}] Cannot parse week number from match code`});
                rowsErrored++;
                continue;
            }

            const scheduledAt = result.scheduleRaw ? parseScheduleCell(result.scheduleRaw, year) : null;
            if (result.scheduleRaw && !scheduledAt) {
                errors.push({row: result.rowNumber, message: `[${mc}] Schedule "${result.scheduleRaw}": unrecognized format — expected "Month Dth, H:MM AM/PM [GMT±N]" (e.g. "May 2nd, 5:00 PM [GMT+8]")`});
                rowsErrored++;
            }

            const existingResult = await findMatchByCode(supabase, mc, config.season_id);
            if (!existingResult.ok) {
                errors.push({row: result.rowNumber, message: `[${mc}] DB error looking up match: ${existingResult.error.message}`});
                rowsErrored++;
                continue;
            }
            let match = existingResult.value;

            const hasScores = result.isForfeit || result.sets.length > 0;
            const hasSchedule = scheduledAt !== null;

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
                    errors.push({row: result.rowNumber, message: `[${mc}] Failed to create match: ${insertResult.error.message}`});
                    rowsErrored++;
                    continue;
                }
                match = insertResult.value[0];
            }

            // Resolve and assign referees/media from sheet
            if (result.referees.length > 0 || result.media.length > 0) {
                const officialErrors = await resolveAndAssignMatchOfficials(
                    supabase,
                    match.id,
                    result.referees,
                    result.media,
                    result.rowNumber,
                    mc,
                );
                if (officialErrors.length > 0) {
                    errors.push(...officialErrors);
                    rowsErrored += officialErrors.length;
                }
            }

            if (!hasScores) {
                if (match.status === 'completed') {
                    // Sheet has no scores — revert completed match
                    const voidResult = await rpcVoidMatch(supabase, match.id);
                    if (!voidResult.ok) {
                        errors.push({row: result.rowNumber, message: `[${mc}] Failed to revert completed match: ${voidResult.error.message}`});
                        rowsErrored++;
                        continue;
                    }
                    // void_match deletes match_officials — re-assign from sheet
                    if (result.referees.length > 0 || result.media.length > 0) {
                        const officialErrors = await resolveAndAssignMatchOfficials(
                            supabase, match.id, result.referees, result.media, result.rowNumber, mc,
                        );
                        if (officialErrors.length > 0) {
                            errors.push(...officialErrors);
                            rowsErrored += officialErrors.length;
                        }
                    }
                    changes.push({
                        type: 'match_result',
                        entityId: match.id,
                        before: {status: 'completed'},
                        after: {matchCode: mc, status: hasSchedule ? 'scheduled' : 'pending', reverted: true},
                    });
                    if (hasSchedule) {
                        const scheduleResult = await updateMatchSchedule(supabase, match.id, scheduledAt);
                        if (!scheduleResult.ok) {
                            errors.push({row: result.rowNumber, message: `[${mc}] Failed to update schedule after revert: ${scheduleResult.error.message}`});
                            rowsErrored++;
                        }
                    }
                    continue;
                }

                // Not completed — normal schedule/created logic
                if (hasSchedule) {
                    if (!wasCreated) {
                        const scheduleResult = await updateMatchSchedule(supabase, match.id, scheduledAt);
                        if (!scheduleResult.ok) {
                            errors.push({row: result.rowNumber, message: `[${mc}] Failed to update schedule: ${scheduleResult.error.message}`});
                            rowsErrored++;
                            continue;
                        }
                    }
                    changes.push({
                        type: 'match_result',
                        entityId: match.id,
                        before: wasCreated ? {} : {status: match.status},
                        after: {matchCode: mc, status: 'scheduled', scheduledAt, created: wasCreated},
                    });
                } else if (wasCreated) {
                    changes.push({
                        type: 'match_result',
                        entityId: match.id,
                        before: {},
                        after: {matchCode: mc, status: 'pending', created: true},
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
                errors.push({row: result.rowNumber, message: `[${mc}] Invalid match result: ${calcResult.error.message}`});
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
                errors.push({row: result.rowNumber, message: `[${mc}] Failed to complete match: ${completeResult.error.message}`});
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
