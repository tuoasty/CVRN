import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {insertMatches} from "@/server/db/matches.repo";
import {CreateMatchesInput} from "../types";
import {randomUUID} from "node:crypto";
import {convertToUTC, isValidTimezone} from "@/server/utils/timezone";

export async function createMatches(
    supabase: DBClient,
    p: CreateMatchesInput
): Promise<Result<Match[]>> {
    try {
        const teamIds = new Set<string>();

        for (const match of p.matches) {
            if (match.homeId === match.awayId) {
                return Err({
                    name: "ValidationError",
                    message: "Team A and Team B cannot be the same"
                });
            }

            if (teamIds.has(match.homeId) || teamIds.has(match.awayId)) {
                return Err({
                    name: "ValidationError",
                    message: "Duplicate teams found across matches"
                });
            }

            teamIds.add(match.homeId);
            teamIds.add(match.awayId);
        }

        if (p.defaultTimezone && !isValidTimezone(p.defaultTimezone)) {
            return Err({
                name: "ValidationError",
                message: "Invalid default timezone"
            });
        }

        let defaultScheduledAt: string | null = null;
        if (p.defaultScheduledDate && p.defaultScheduledTime && p.defaultTimezone) {
            defaultScheduledAt = convertToUTC(
                p.defaultScheduledDate,
                p.defaultScheduledTime,
                p.defaultTimezone
            );

            if (!defaultScheduledAt) {
                return Err({
                    name: "ValidationError",
                    message: "Invalid default date/time/timezone combination"
                });
            }
        }

        const matchRows = p.matches.map(m => {
            let scheduledAt: string | null = null;

            if (m.scheduledDate && m.scheduledTime && m.timezone) {
                if (!isValidTimezone(m.timezone)) {
                    throw new Error(`Invalid timezone for match: ${m.timezone}`);
                }
                scheduledAt = convertToUTC(m.scheduledDate, m.scheduledTime, m.timezone);
                if (!scheduledAt) {
                    throw new Error(`Invalid date/time/timezone for match`);
                }
            } else if (defaultScheduledAt) {
                scheduledAt = defaultScheduledAt;
            }

            return {
                id: randomUUID(),
                seasonId: p.seasonId,
                homeTeamId: m.homeId,
                awayTeamId: m.awayId,
                week: p.week,
                scheduledAt: scheduledAt,
                status: "pending" as const,
                matchType: "season" as const,
            };
        });

        const {data, error} = await insertMatches(supabase, matchRows);

        if (error) {
            logger.error({input: p, error}, "Failed to insert matches");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "InsertError",
                message: "Failed to create matches"
            });
        }

        return Ok(data as Match[]);
    } catch (error) {
        logger.error({error}, "Unexpected error creating matches");
        return Err(serializeError(error));
    }
}
