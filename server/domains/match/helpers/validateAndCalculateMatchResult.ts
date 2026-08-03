import {Err, Ok, Result} from "@/shared/types/result";
import {MatchResultInput, MatchContext, MatchResultOutput} from "../types";
import {StandingMethod} from "@/shared/types/standing";

function differentialBonus(winnerPointDiff: number): number {
    if (winnerPointDiff >= 30) return 5;
    if (winnerPointDiff >= 25) return 4;
    if (winnerPointDiff >= 20) return 3;
    if (winnerPointDiff >= 15) return 2;
    if (winnerPointDiff >= 10) return 1;
    if (winnerPointDiff >= 5) return 0.5;
    return 0;
}

export function validateAndCalculateMatchResult(
    input: MatchResultInput,
    match: MatchContext,
    standingMethod: StandingMethod = "lvr"
): Result<MatchResultOutput> {
    let homeSetsWon = 0;
    let awaySetsWon = 0;
    let totalHomePoints = 0;
    let totalAwayPoints = 0;
    let homeTeamLvr: number | null = null;
    let awayTeamLvr: number | null = null;
    let homeTeamPoints: number | null = null;
    let awayTeamPoints: number | null = null;
    let homeTeamBonus: number | null = null;
    let awayTeamBonus: number | null = null;
    let pointDiff: number | null = null;
    let setsToInsert = input.sets;
    let matchMvpPlayerId: string | null = input.matchMvpPlayerId || null;
    let loserMvpPlayerId: string | null = input.loserMvpPlayerId || null;

    if (input.isForfeit) {
        if (!input.forfeitingTeam) {
            return Err({
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

            pointDiff = input.forfeitingTeam === "home" ? -25 * minSets : 25 * minSets;

            if (standingMethod === "points_without_bonus") {

                homeTeamPoints = input.forfeitingTeam === "home" ? 0 : 1;
                awayTeamPoints = input.forfeitingTeam === "home" ? 1 : 0;
                homeTeamBonus = 0;
                awayTeamBonus = 0;
            } else {

                if (input.forfeitingTeam === "home") {
                    homeTeamPoints = 0;
                    awayTeamPoints = 2 + 0.5 * awaySetsWon;
                    homeTeamBonus = 0;
                    awayTeamBonus = 1;
                } else {
                    homeTeamPoints = 2 + 0.5 * homeSetsWon;
                    awayTeamPoints = 0;
                    homeTeamBonus = 1;
                    awayTeamBonus = 0;
                }
            }
        }

        matchMvpPlayerId = null;
        loserMvpPlayerId = null;
    } else {
        const expectedMinSets = match.best_of === 5 ? 3 : 2;
        const expectedMaxSets = match.best_of;

        if (input.sets.length < expectedMinSets || input.sets.length > expectedMaxSets) {
            return Err({
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
                    message: `Set ${set.setNumber}: Winning score must be at least ${minWinningScore}`,
                    code: "VALIDATION_ERROR"
                });
            }

            if (maxScore - minScore < 2) {
                return Err({
                    message: `Set ${set.setNumber}: Winner must win by at least 2 points`,
                    code: "VALIDATION_ERROR"
                });
            }

            if (maxScore < minWinningScore + 2 && minScore >= minWinningScore) {
                return Err({
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

            pointDiff = totalHomePoints - totalAwayPoints;

            const normalizedSetDiff = setDiff / 2;
            const normalizedPointDiff = pointDiff / 50;

            const lvrValue = 10 * (0.7 * normalizedSetDiff + 0.3 * normalizedPointDiff);

            homeTeamLvr = lvrValue;
            awayTeamLvr = -lvrValue;

            const homeWon = homeSetsWon > awaySetsWon;

            if (standingMethod === "points_without_bonus") {

                homeTeamPoints = homeWon ? 2 - 0.5 * awaySetsWon : 0.5 * homeSetsWon;
                awayTeamPoints = homeWon ? 0.5 * awaySetsWon : 2 - 0.5 * homeSetsWon;
                homeTeamBonus = 0;
                awayTeamBonus = 0;
            } else {

                const winnerPointDiff = homeWon ? pointDiff : -pointDiff;
                const bonus = differentialBonus(winnerPointDiff);

                homeTeamPoints = 0.5 * homeSetsWon + (homeWon ? 2 : 0);
                awayTeamPoints = 0.5 * awaySetsWon + (homeWon ? 0 : 2);
                homeTeamBonus = homeWon ? bonus : 0;
                awayTeamBonus = homeWon ? 0 : bonus;
            }
        }
    }

    return Ok({
        homeSetsWon,
        awaySetsWon,
        homeTeamLvr,
        awayTeamLvr,
        homeTeamPoints,
        awayTeamPoints,
        homeTeamBonus,
        awayTeamBonus,
        pointDiff,
        setsToInsert,
        matchMvpPlayerId,
        loserMvpPlayerId,
    });
}
