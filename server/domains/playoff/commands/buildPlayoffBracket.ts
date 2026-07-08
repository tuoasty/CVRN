import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {GeneratePlayoffBracketInput, InsertPlayoffBracketDto, InsertPlayoffMatchDto, PlayoffMatchTemplate} from "../types";
import {
    deletePlayoffMatchesBySeasonId,
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

        if (!configResult.ok) {
            logger.error({ seasonId: p.seasonId, error: configResult.error }, "Failed to look up playoff config");
            return configResult;
        }
        const config = configResult.value;
        if (!config) {
            logger.error({ seasonId: p.seasonId }, "Playoff config not found");
            return Err({
                message: "No playoff configuration found for this season",
                code: "NOT_FOUND"
            });
        }

        // `template` cast is a shim until `supabase gen types` regenerates the row type
        // with the new playoff_configs.template column.
        const template = (config as { template?: string | null }).template;
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

        if (!standingsResult.ok) {
            logger.error({ seasonId: p.seasonId, error: standingsResult.error }, "Failed to fetch standings");
            return standingsResult;
        }
        const standings = standingsResult.value;

        const playoffConfig = templates[template as keyof typeof templates];
        const totalTeams = playoffConfig.teams;

        if (standings.length < totalTeams) {
            return Err({
                message: `Not enough teams in standings. Need ${totalTeams}, found ${standings.length}`,
                code: "VALIDATION_ERROR"
            });
        }

        const byCode = new Map<string, BracketNode>();
        // Global 1..N draw order: upper rounds first, then lower, in template order.
        // The display filters by round and sorts by this within each round.
        let displayOrder = 1;
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
                        matchCode: match.code,
                        homeTeamId: match.home.type === "seed" ? standings[match.home.value - 1].team_id : null,
                        awayTeamId: match.away.type === "seed" ? standings[match.away.value - 1].team_id : null
                    }

                    const playoffBracket:InsertPlayoffBracketDto = {
                        id: randomUUID(),
                        
                        seasonId: season.id,
                        round: roundGroup.round,
                        playoffGroup: group,
                        matchId: matchId,
                        seedHome: match.home.type === "seed" ? match.home.value : null,
                        seedAway: match.away.type === "seed" ? match.away.value : null,
                        displayOrder: displayOrder++,
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
                } else if(slot.result === "loser") {
                    source.bracket.loserNextBracketId = node.bracket.id!
                    source.bracket.loserPosition = side
                }
            }
        })

        const matchesToInsert = Array.from(byCode.values(), (node) => node.match);
        const bracketsToInsert = Array.from(byCode.values(), (node) => node.bracket);
        // These three writes are not a single DB transaction (separate PostgREST calls).
        // If a later step fails after matches land, delete the just-inserted playoff
        // matches so the season can be re-generated. playoff_brackets FK is ON DELETE
        // CASCADE, so removing the matches also clears their brackets.
        const rollback = async (stage: string) => {
            const cleanup = await deletePlayoffMatchesBySeasonId(supabase, p.seasonId);
            if (!cleanup.ok) {
                logger.error(
                    { seasonId: p.seasonId, stage, error: cleanup.error },
                    "Playoff generation rollback FAILED — orphan playoff matches remain, manual cleanup required"
                );
            }
        };

        const matchesResult = await insertPlayoffMatches(supabase, matchesToInsert);
        if (!matchesResult.ok) {
            logger.error({ seasonId: p.seasonId, error: matchesResult.error }, "Failed to insert playoff matches");
            return matchesResult;
        }
        const matches = matchesResult.value;

        const bracketsResult = await insertPlayoffBrackets(supabase, bracketsToInsert);
        if (!bracketsResult.ok) {
            logger.error({ seasonId: p.seasonId, error: bracketsResult.error }, "Failed to insert playoff brackets; rolling back matches");
            await rollback("brackets");
            return bracketsResult;
        }
        const brackets = bracketsResult.value;

        const statusResult = await updateSeasonPlayoffStatus(supabase, p.seasonId, {
            playoffStarted: true
        });
        if (!statusResult.ok) {
            logger.error({ seasonId: p.seasonId, error: statusResult.error }, "Failed to update season playoff status; rolling back matches");
            await rollback("status");
            return statusResult;
        }

        logger.info({
            seasonId: p.seasonId,
            matchesCreated: matches.length,
            bracketsCreated: brackets.length
        }, "Playoff bracket generated successfully");

        return Ok({
            matchesCreated: matches.length,
            bracketsCreated: brackets.length
        });

    } catch (error) {
        logger.error({ error }, "Unexpected error generating playoff bracket");
        return Err(serializeError(error));
    }
}
