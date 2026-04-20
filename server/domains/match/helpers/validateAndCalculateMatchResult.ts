import {Err, Ok, Result} from "@/shared/types/result";
import {MatchResultInput, MatchContext, MatchResultOutput} from "../types";

export function validateAndCalculateMatchResult(
    input: MatchResultInput,
    match: MatchContext
): Result<MatchResultOutput> {
    let homeSetsWon = 0;
    let awaySetsWon = 0;
    let totalHomePoints = 0;
    let totalAwayPoints = 0;
    let homeTeamLvr: number | null = null;
    let awayTeamLvr: number | null = null;
    let setsToInsert = input.sets;
    let matchMvpPlayerId: string | null = input.matchMvpPlayerId || null;
    let loserMvpPlayerId: string | null = input.loserMvpPlayerId || null;

    if (input.isForfeit) {
        if (!input.forfeitingTeam) {
            return Err({
                name: "ValidationError",
                message: "Forfeiting team must be specified",
                code: "VALIDATION_ERROR"
            });
        }

        const minSets = match.best_of === 5 ? 3 : 2;

        if (input.forfeitingTeam === "home") {
            awaySetsWon = minSets;
            homeSetsWon = 0;
        } else {
            homeSetsWon = minSets;
            awaySetsWon = 0;
        }

        setsToInsert = Array.from({ length: minSets }, (_, i) => ({
            setNumber: i + 1,
            homeScore: input.forfeitingTeam === "home" ? 0 : 25,
            awayScore: input.forfeitingTeam === "away" ? 0 : 25,
        }));

        if (match.match_type === "season") {
            if (input.forfeitingTeam === "home") {
                homeTeamLvr = -10;
                awayTeamLvr = 5;
            } else {
                homeTeamLvr = 5;
                awayTeamLvr = -10;
            }
        }

        matchMvpPlayerId = null;
        loserMvpPlayerId = null;
    } else {
        const expectedMinSets = match.best_of === 5 ? 3 : 2;
        const expectedMaxSets = match.best_of;

        if (input.sets.length < expectedMinSets || input.sets.length > expectedMaxSets) {
            return Err({
                name: "ValidationError",
                message: `BO${match.best_of} must have ${expectedMinSets}-${expectedMaxSets} sets`,
                code: "VALIDATION_ERROR"
            });
        }

        for (const set of input.sets) {
            const minWinningScore = set.setNumber === 5 && match.best_of === 5 ? 15 : 25;
            const maxScore = Math.max(set.homeScore, set.awayScore);
            const minScore = Math.min(set.homeScore, set.awayScore);

            if (maxScore < minWinningScore) {
                return Err({
                    name: "ValidationError",
                    message: `Set ${set.setNumber}: Winning score must be at least ${minWinningScore}`,
                    code: "VALIDATION_ERROR"
                });
            }

            if (maxScore - minScore < 2) {
                return Err({
                    name: "ValidationError",
                    message: `Set ${set.setNumber}: Winner must win by at least 2 points`,
                    code: "VALIDATION_ERROR"
                });
            }

            if (maxScore < minWinningScore + 2 && minScore >= minWinningScore) {
                return Err({
                    name: "ValidationError",
                    message: `Set ${set.setNumber}: Invalid deuce score`,
                    code: "VALIDATION_ERROR"
                });
            }
        }

        input.sets.forEach(set => {
            if (set.homeScore > set.awayScore) {
                homeSetsWon++;
            } else {
                awaySetsWon++;
            }
            totalHomePoints += set.homeScore;
            totalAwayPoints += set.awayScore;
        });

        matchMvpPlayerId = input.matchMvpPlayerId || null;
        loserMvpPlayerId = input.loserMvpPlayerId || null;

        if (match.match_type === "season") {
            const setDiff = homeSetsWon - awaySetsWon;
            const pointDiff = totalHomePoints - totalAwayPoints;

            const normalizedSetDiff = setDiff / 2;
            const normalizedPointDiff = pointDiff / 50;

            const lvrValue = 10 * (0.7 * normalizedSetDiff + 0.3 * normalizedPointDiff);

            homeTeamLvr = lvrValue;
            awayTeamLvr = -lvrValue;
        }
    }

    return Ok({
        homeSetsWon,
        awaySetsWon,
        homeTeamLvr,
        awayTeamLvr,
        setsToInsert,
        matchMvpPlayerId,
        loserMvpPlayerId,
    });
}
