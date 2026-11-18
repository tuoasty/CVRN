import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, SheetConfig} from "@/shared/types/db";
import {SyncChange, SyncResult} from "@/server/domains/sheets/types";
import {parseQualifierRows} from "@/server/domains/sheets/helpers/parseQualifierRows";
import {parseScheduleCell} from "@/server/domains/sheets/helpers/parseScheduleCell";
import {resolveTeamNames} from "@/server/domains/sheets/helpers/resolveTeamNames";
import {teamNameKey} from "@/server/domains/team/helpers/normalizeTeamName";
import {readSheetRangeWithColors} from "@/server/utils/googleSheets";
import {findAllTeamsBySeasonIdIncludingDeleted, getOrCreateByeTeam} from "@/server/db/teams.repo";
import {findStandingMethodBySeasonId} from "@/server/db/regions.repo";
import {findTeamNameHistoryByTeamIds} from "@/server/db/teamNameHistory.repo";
import {
    insertMatches,
    findMatchByCode,
    findMatchSets,
    updateMatchSchedule,
    rpcCompleteMatch,
    rpcReapplyMatchResult,
    rpcVoidMatch,
} from "@/server/db/matches.repo";
import {findSeasonById} from "@/server/db/seasons.repo";
import {validateAndCalculateMatchResult} from "@/server/domains/match/helpers/validateAndCalculateMatchResult";
import {resolveAndAssignMatchOfficials} from "@/server/domains/sheets/helpers/resolveMatchOfficials";
import {hasMatchResultChanged} from "@/server/domains/sheets/helpers/hasMatchResultChanged";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {randomUUID} from "node:crypto";

export async function syncMatchResults(
    supabase: DBClient,
    config: SheetConfig
): Promise<Result<SyncResult>> {
    try {
        const {values, fgColors} = await readSheetRangeWithColors(config.sheet_id, config.tab_name);

        const seasonResult = await findSeasonById(supabase, config.season_id);
        if (!seasonResult.ok) return seasonResult;
        if (!seasonResult.value) {
            return Err({message: "Season not found", code: "NOT_FOUND"});
        }
        const year = parseInt(seasonResult.value.start_date.substring(0, 4), 10);

        const {results: parsed, errors: parseErrors} = parseQualifierRows(values, fgColors, config.header_row ?? 8);

        const teamsResult = await findAllTeamsBySeasonIdIncludingDeleted(supabase, config.season_id);
        if (!teamsResult.ok) return teamsResult;
        const teamIds = teamsResult.value.map(t => t.id);
        const historyResult = await findTeamNameHistoryByTeamIds(supabase, teamIds);
        if (!historyResult.ok) return historyResult;
        const nameMap = resolveTeamNames(teamsResult.value, historyResult.value);

        const methodResult = await findStandingMethodBySeasonId(supabase, config.season_id);
        if (!methodResult.ok) return methodResult;
        const standingMethod = methodResult.value;

        const changes: SyncChange[] = [];
        let rowsProcessed = 0;
        let rowsErrored = parseErrors.length;
        const errors = [...parseErrors];

        let byeTeamId: string | null = null;

        for (const result of parsed) {
            rowsProcessed++;

            const mc = result.matchCode;

            const homeTeamId = nameMap.get(teamNameKey(result.homeTeamName));
            if (!homeTeamId) {
                errors.push({row: result.rowNumber, message: `[${mc}] Home team "${result.homeTeamName}" not found in season`});
                rowsErrored++;
                continue;
            }

            let awayTeamId: string;
            if (result.isByeAway) {
                if (!byeTeamId) {
                    const byeResult = await getOrCreateByeTeam(supabase, config.season_id);
                    if (!byeResult.ok) {
                        errors.push({row: result.rowNumber, message: `[${mc}] Failed to resolve BYE team: ${byeResult.error.message}`});
                        rowsErrored++;
                        continue;
                    }
                    byeTeamId = byeResult.value.id;
                }
                awayTeamId = byeTeamId;
            } else {
                const resolvedAwayId = nameMap.get(teamNameKey(result.awayTeamName));
                if (!resolvedAwayId) {
                    errors.push({row: result.rowNumber, message: `[${mc}] Away team "${result.awayTeamName}" not found in season`});
                    rowsErrored++;
                    continue;
                }
                awayTeamId = resolvedAwayId;
            }

            const homeTeam = teamsResult.value.find(t => t.id === homeTeamId);
            if (homeTeam && teamNameKey(homeTeam.name) !== teamNameKey(result.homeTeamName)) {
                errors.push({row: result.rowNumber, message: `[${mc}] Home team "${result.homeTeamName}" is an outdated name — current name is "${homeTeam.name}". Update the sheet.`});
            }
            if (!result.isByeAway) {
                const awayTeam = teamsResult.value.find(t => t.id === awayTeamId);
                if (awayTeam && teamNameKey(awayTeam.name) !== teamNameKey(result.awayTeamName)) {
                    errors.push({row: result.rowNumber, message: `[${mc}] Away team "${result.awayTeamName}" is an outdated name — current name is "${awayTeam.name}". Update the sheet.`});
                }
            }

            const week = parseInt(mc.split('-')[0], 10);
            logger.debug({mc:mc, week:week})
            if (isNaN(week)) {
                errors.push({row: result.rowNumber, message: `[${mc}] Cannot parse week number from match code`});
                rowsErrored++;
                continue;
            }

            const parsed = result.scheduleRaw ? parseScheduleCell(result.scheduleRaw, year) : null;
            if (result.scheduleRaw && !parsed) {
                errors.push({row: result.rowNumber, message: `[${mc}] Schedule "${result.scheduleRaw}": unrecognized format. Expected "Month Dth, H:MM AM/PM [GMT±N]", "Month Dth, HH:MM UTC", "Month Dth", or "Month Dth - Month Dth" (e.g. "May 2nd, 5:00 PM [GMT+8]", "May 2nd, 20:00 UTC", "May 2nd", or "May 2nd - May 5th").`});
                rowsErrored++;
            }
            const scheduledAt = parsed?.iso ?? null;

            const existingResult = await findMatchByCode(supabase, mc, config.season_id);
            if (!existingResult.ok) {
                errors.push({row: result.rowNumber, message: `[${mc}] DB error looking up match: ${existingResult.error.message}`});
                rowsErrored++;
                continue;
            }
            let match = existingResult.value;

            const hasScores = result.isForfeit || result.sets.length > 0;
            const hasSchedule = scheduledAt !== null;

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
                    const voidResult = await rpcVoidMatch(supabase, match.id);
                    if (!voidResult.ok) {
                        errors.push({row: result.rowNumber, message: `[${mc}] Failed to revert completed match: ${voidResult.error.message}`});
                        rowsErrored++;
                        continue;
                    }
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
                    if (scheduledAt) {
                        const scheduleResult = await updateMatchSchedule(supabase, match.id, scheduledAt, 'scheduled');
                        if (!scheduleResult.ok) {
                            errors.push({row: result.rowNumber, message: `[${mc}] Failed to update schedule after revert: ${scheduleResult.error.message}`});
                            rowsErrored++;
                        }
                    }
                    continue;
                }

                if (hasSchedule) {
                    const scheduleUnchanged = !wasCreated && scheduledAt === match.scheduled_at && match.status === 'scheduled';
                    if (!scheduleUnchanged) {
                        if (!wasCreated) {
                            const scheduleResult = await updateMatchSchedule(supabase, match.id, scheduledAt, 'scheduled');
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
                    }
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

            let isForfeit = result.isForfeit;
            let forfeitingTeam: 'home' | 'away' | 'both' | undefined;
            if (result.isDoubleForfeit) {
                isForfeit = true;
                forfeitingTeam = 'both';
            } else if (isForfeit) {
                const winnerNorm = result.winner ? teamNameKey(result.winner) : '';
                if (winnerNorm === teamNameKey(result.homeTeamName)) {
                    forfeitingTeam = 'away';
                } else {
                    forfeitingTeam = 'home';
                }
            } else if (result.sets.length > 0) {

                const allHomeShutouts = result.sets.every(s => s.homeScore === 25 && s.awayScore === 0);
                const allAwayShutouts = result.sets.every(s => s.awayScore === 25 && s.homeScore === 0);
                if (allHomeShutouts) {
                    isForfeit = true;
                    forfeitingTeam = 'away';
                } else if (allAwayShutouts) {
                    isForfeit = true;
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
                isForfeit,
                forfeitingTeam,
                matchMvpPlayerId: null,
                loserMvpPlayerId: null,
            };

            const calcResult = validateAndCalculateMatchResult(matchInput, matchContext, standingMethod);
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
                homePoints: calc.homeTeamPoints,
                awayPoints: calc.awayTeamPoints,
                homeBonus: calc.homeTeamBonus,
                awayBonus: calc.awayTeamBonus,
                pointDiff: calc.pointDiff,
                mvpPlayerId: null,
                loserMvpPlayerId: null,
                isForfeit,
                scheduledAt,
            };

            if (match.status === 'completed') {
                const existingSetsResult = await findMatchSets(supabase, match.id);
                if (!existingSetsResult.ok) {
                    errors.push({row: result.rowNumber, message: `[${mc}] Failed to load existing sets: ${existingSetsResult.error.message}`});
                    rowsErrored++;
                    continue;
                }
                const unchanged = !hasMatchResultChanged(
                    existingSetsResult.value,
                    match.is_forfeit ?? false,
                    calc.setsToInsert,
                    isForfeit,
                );
                if (unchanged) continue;
            }

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
                    isForfeit,
                },
            });
        }

        return Ok({rowsProcessed, rowsErrored, errors, changes});
    } catch (error) {
        logger.error({error, configId: config.id}, "Unexpected error in syncMatchResults");
        return Err(serializeError(error));
    }
}
