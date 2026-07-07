import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {GeneratePlayoffBracketInput, InsertPlayoffBracketDto, InsertPlayoffMatchDto, PlayoffMatchTemplate} from "../types";
import {
    findPlayoffConfigBySeasonId,
    findStandingsBySeasonId,
    insertPlayoffBrackets,
    insertPlayoffMatches,
    updateSeasonPlayoffStatus
} from "@/server/db/playoff.repo";
import {findSeasonById} from "@/server/db/seasons.repo";
import {randomUUID} from "node:crypto";
import { templates } from "../helpers/playoffTemplates";

interface BracketNode {
  match: InsertPlayoffMatchDto;
  bracket: InsertPlayoffBracketDto;
  slots: Pick<PlayoffMatchTemplate, "home" | "away">;
}

export async function buildPlayoffBracket(
    supabase: DBClient,
    p: GeneratePlayoffBracketInput
): Promise<Result<{ matchesCreated: number; bracketsCreated: number }>> {
    try {
        const [seasonResult, configResult, standingsResult] = await Promise.all([
            findSeasonById(supabase, p.seasonId),
            findPlayoffConfigBySeasonId(supabase, p.seasonId),
            findStandingsBySeasonId(supabase, p.seasonId)
        ]);

        if (!seasonResult.ok) {
            logger.error({ seasonId: p.seasonId, error: seasonResult.error }, "Failed to look up season");
            return seasonResult;
        }
        const season = seasonResult.value;
        if (!season) {
            logger.error({ seasonId: p.seasonId }, "Season not found");
            return Err({
                message: "Season not found",
                code: "NOT_FOUND"
            });
        }

        if (season.playoff_started) {
            return Err({
                message: "Playoffs have already been generated for this season",
                code: "CONFLICT"
            });
        }

        //TODO -> save config strings to database and derive. Remove hardcode

        // if (!configResult.ok) {
        //     logger.error({ seasonId: p.seasonId, error: configResult.error }, "Failed to look up playoff config");
        //     return configResult;
        // }
        // const config = configResult.value;
        // if (!config) {
        //     logger.error({ seasonId: p.seasonId }, "Playoff config not found");
        //     return Err({
        //         message: "No playoff configuration found for this season",
        //         code: "NOT_FOUND"
        //     });
        // }

        if (!standingsResult.ok) {
            logger.error({ seasonId: p.seasonId, error: standingsResult.error }, "Failed to fetch standings");
            return standingsResult;
        }
        const standings = standingsResult.value;

        const playoffString = "16q";
        const playoffConfig = templates[playoffString]
        const totalTeams = playoffConfig.teams

        if (standings.length < totalTeams) {
            return Err({
                message: `Not enough teams in standings. Need ${totalTeams}, found ${standings.length}`,
                code: "VALIDATION_ERROR"
            });
        }

        const byCode = new Map<string, BracketNode>();
        const tracks = [
            { group: "upper" as const, rounds: playoffConfig.upper},
            { group: "lower" as const, rounds: playoffConfig.lower}
        ]

        for (const {group, rounds} of tracks){
            for(const roundGroup of rounds){
                for(const match of roundGroup.matches){
                    const matchId = randomUUID();
                    // check if match.home and match.away is of SeedSlot. If yes, fill with the team_id obtained by the seed. Else leave null
                    const playoffMatch:InsertPlayoffMatchDto = {
                        id: matchId,
                        seasonId:season.id,
                        week:1, // left as 1 for default to avoid rewriting weeks
                        matchType: "playoffs",
                        status: "pending",
                        bestOf: match.best_of,
                        match_code: match.code,
                        homeTeamId: match.home.type === "seed" ? standings[match.home.value - 1].team_id : null,
                        awayTeamId: match.away.type === "seed" ? standings[match.away.value - 1].team_id : null
                    }

                    const playoffBracket:InsertPlayoffBracketDto = {
                        id: randomUUID(),
                        seasonId: season.id,
                        round: roundGroup.round,
                        playoff_group: group,
                        matchId: matchId,
                        seedHome: match.home.type === "seed" ? match.home.value : null,
                        seedAway: match.away.type === "seed" ? match.away.value : null,
                        nextBracketId: null,
                        winnerPosition: null,
                        loserNextBracketId: null,
                        loserPosition: null
                    }

                    const node:BracketNode = {
                        match:playoffMatch,
                        bracket:playoffBracket,
                        slots: match
                    }

                    byCode.set(match.code, node)
                }
            }
        }

        byCode.forEach((node) => {
            for (const side of ["home", "away"] as const){
                const slot = node.slots[side]
                if(slot.type !== "match") continue;
                const source = byCode.get(slot.code)
                if(!source) continue;

                if(slot.result === "winner"){
                    source.bracket.nextBracketId = node.bracket.id!
                    source.bracket.winnerPosition = side
                } else {
                    source.bracket.loserNextBracketId = node.bracket.id!
                    source.bracket.loserPosition = side
                }
            }
        })

        return Ok({
            matchesCreated: 0,
            bracketsCreated: 0
        });

    } catch (error) {
        logger.error({ error }, "Unexpected error generating playoff bracket");
        return Err(serializeError(error));
    }
}
