import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findPlayoffBracketByMatchId, updateMatchTeam} from "@/server/db/playoff.repo";
import {findMatchById} from "@/server/db/matches.repo";

export async function advancePlayoffWinner(
    supabase: DBClient,
    matchId: string,
    winnerTeamId: string,
    loserTeamId: string
): Promise<Result<void>> {
    try {
        const { data: bracket, error: bracketError } = await findPlayoffBracketByMatchId(supabase, matchId);

        if (bracketError) {
            logger.error({ matchId, error: bracketError }, "Failed to find playoff bracket");
            return Err(serializeError(bracketError, "DB_ERROR"));
        }

        if (!bracket) {
            logger.warn({ matchId }, "No bracket entry found for playoff match");
            return Ok(undefined);
        }

        const { data: match } = await findMatchById(supabase, matchId);

        if (!match) {
            logger.error({ matchId }, "Match not found for bracket");
            return Err({
                name: "NotFoundError",
                message: "Match not found",
                code: "NOT_FOUND"
            });
        }

        let winnerSeed: number | null = null;
        let loserSeed: number | null = null;

        if (match.home_team_id === winnerTeamId && bracket.seed_home !== null) {
            winnerSeed = bracket.seed_home;
            loserSeed = bracket.seed_away;
        } else if (match.away_team_id === winnerTeamId && bracket.seed_away !== null) {
            winnerSeed = bracket.seed_away;
            loserSeed = bracket.seed_home;
        }

        if (bracket.next_bracket_id && bracket.winner_position) {
            const { data: nextBracket, error: nextBracketError } = await supabase
                .from("playoff_brackets")
                .select("match_id")
                .eq("id", bracket.next_bracket_id)
                .single();

            if (nextBracketError || !nextBracket) {
                logger.error({ nextBracketId: bracket.next_bracket_id, error: nextBracketError }, "Failed to find next bracket");
                return Err(serializeError(nextBracketError, "DB_ERROR"));
            }

            const { error: updateError } = await updateMatchTeam(
                supabase,
                nextBracket.match_id,
                bracket.winner_position as "home" | "away",
                winnerTeamId
            );

            if (updateError) {
                logger.error({ matchId: nextBracket.match_id, position: bracket.winner_position, error: updateError }, "Failed to advance winner");
                return Err(serializeError(updateError, "DB_ERROR"));
            }

            const seedField = bracket.winner_position === "home" ? "seed_home" : "seed_away";
            const { error: seedError } = await supabase
                .from("playoff_brackets")
                .update({ [seedField]: winnerSeed })
                .eq("id", bracket.next_bracket_id);

            if (seedError) {
                logger.error({ bracketId: bracket.next_bracket_id, seedField, error: seedError }, "Failed to update winner seed");
                return Err(serializeError(seedError, "DB_ERROR"));
            }

            logger.info({ matchId, winnerTeamId, winnerSeed, nextMatchId: nextBracket.match_id, position: bracket.winner_position }, "Winner advanced to next bracket");
        }

        if (bracket.loser_next_bracket_id && bracket.loser_position) {
            const { data: loserBracket, error: loserBracketError } = await supabase
                .from("playoff_brackets")
                .select("match_id")
                .eq("id", bracket.loser_next_bracket_id)
                .single();

            if (loserBracketError || !loserBracket) {
                logger.error({ loserNextBracketId: bracket.loser_next_bracket_id, error: loserBracketError }, "Failed to find loser bracket");
                return Err(serializeError(loserBracketError, "DB_ERROR"));
            }

            const { error: updateError } = await updateMatchTeam(
                supabase,
                loserBracket.match_id,
                bracket.loser_position as "home" | "away",
                loserTeamId
            );

            if (updateError) {
                logger.error({ matchId: loserBracket.match_id, position: bracket.loser_position, error: updateError }, "Failed to advance loser");
                return Err(serializeError(updateError, "DB_ERROR"));
            }

            const seedField = bracket.loser_position === "home" ? "seed_home" : "seed_away";
            const { error: seedError } = await supabase
                .from("playoff_brackets")
                .update({ [seedField]: loserSeed })
                .eq("id", bracket.loser_next_bracket_id);

            if (seedError) {
                logger.error({ bracketId: bracket.loser_next_bracket_id, seedField, error: seedError }, "Failed to update loser seed");
                return Err(serializeError(seedError, "DB_ERROR"));
            }

            logger.info({ matchId, loserTeamId, loserSeed, thirdPlaceMatchId: loserBracket.match_id, position: bracket.loser_position }, "Loser advanced to third place match");
        }

        return Ok(undefined);
    } catch (error) {
        logger.error({ matchId, error }, "Unexpected error advancing playoff teams");
        return Err(serializeError(error));
    }
}
