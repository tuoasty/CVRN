import {DBClient, PlayoffBracket} from "@/shared/types/db";
import { Err, Ok, Result } from "@/shared/types/result";
import { serializeError } from "@/server/utils/serializeableError";
import { logger } from "@/server/utils/logger";
import { GeneratePlayoffBracketInput, InsertPlayoffBracketDto, InsertPlayoffMatchDto } from "@/server/dto/playoff.dto";
import {
    findPlayoffBracketsBySeasonId,
    findPlayoffConfigBySeasonId,
    findSeasonById,
    findStandingsBySeasonId,
    insertPlayoffBrackets,
    insertPlayoffMatches,
    updateSeasonPlayoffStatus
} from "@/server/db/playoff.repo";
import { randomUUID } from "node:crypto";

type RoundType = "play_in" | "round_of_16" | "quarterfinal" | "semifinal" | "final" | "third_place";

export async function generatePlayoffBracket(
    supabase: DBClient,
    p: GeneratePlayoffBracketInput
): Promise<Result<{ matchesCreated: number; bracketsCreated: number }>> {
    try {
        const { data: season, error: seasonError } = await findSeasonById(supabase, p.seasonId);

        if (seasonError || !season) {
            logger.error({ seasonId: p.seasonId, error: seasonError }, "Season not found");
            return Err({
                name: "NotFoundError",
                message: "Season not found"
            });
        }

        if (season.playoff_started) {
            return Err({
                name: "ValidationError",
                message: "Playoffs have already been generated for this season"
            });
        }

        const { data: config, error: configError } = await findPlayoffConfigBySeasonId(supabase, p.seasonId);

        if (configError || !config) {
            logger.error({ seasonId: p.seasonId, error: configError }, "Playoff config not found");
            return Err({
                name: "NotFoundError",
                message: "No playoff configuration found for this season"
            });
        }

        const { data: standings, error: standingsError } = await findStandingsBySeasonId(supabase, p.seasonId);

        if (standingsError || !standings) {
            logger.error({ seasonId: p.seasonId, error: standingsError }, "Failed to fetch standings");
            return Err(serializeError(standingsError));
        }

        const totalTeams = config.qualified_teams + config.playin_teams;

        if (standings.length < totalTeams) {
            return Err({
                name: "ValidationError",
                message: `Not enough teams in standings. Need ${totalTeams}, found ${standings.length}`
            });
        }

        const allMatches: InsertPlayoffMatchDto[] = [];
        const allBrackets: InsertPlayoffBracketDto[] = [];

        let currentWeek = 1;

        // Generate play-in matches if needed
        const playinMatchIdMap = new Map<number, string>(); // seed -> matchId
        if (config.playin_teams > 0) {
            const playinTeams = standings.slice(config.qualified_teams, totalTeams);

            for (let i = 0; i < playinTeams.length; i += 2) {
                const matchId = randomUUID();
                const homeTeam = playinTeams[i];
                const awayTeam = playinTeams[i + 1];

                playinMatchIdMap.set(homeTeam.rank!, matchId);
                playinMatchIdMap.set(awayTeam.rank!, matchId);

                allMatches.push({
                    id: matchId,
                    seasonId: p.seasonId,
                    week: currentWeek,
                    matchType: "playoffs",
                    status: "pending",
                    bestOf: 3,
                    homeTeamId: homeTeam?.team_id ?? null,
                    awayTeamId: awayTeam?.team_id ?? null
                });

                allBrackets.push({
                    seasonId: p.seasonId,
                    round: "play_in",
                    matchId,
                    seedHome: homeTeam?.rank ?? null,
                    seedAway: awayTeam?.rank ?? null,
                    nextBracketId: null,
                    winnerPosition: null
                });
            }
            currentWeek++;
        }

        // Generate main bracket
        const teamsAfterPlayins = config.qualified_teams + (config.playin_teams / 2);
        const rounds = calculateRounds(teamsAfterPlayins);

        let previousRoundMatchIds: string[] = [];

        for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
            const round = rounds[roundIndex];
            const isFirstRound = roundIndex === 0;
            const isSemifinal = round.type === "semifinal";
            const isFinal = round.type === "final";

            const newMatchIds: string[] = [];

            for (let matchIndex = 0; matchIndex < round.matchCount; matchIndex++) {
                const matchId = randomUUID();
                newMatchIds.push(matchId);

                let homeTeamId: string | null = null;
                let awayTeamId: string | null = null;
                let homeSeed: number | null = null;
                let awaySeed: number | null = null;

                if (isFirstRound) {
                    // First round of main bracket
                    const seeding = getFirstRoundSeeding(
                        config.qualified_teams,
                        config.playin_teams,
                        matchIndex
                    );

                    // Set home team (always qualified)
                    if (seeding.homeSeed) {
                        const homeTeam = standings.find(s => s.rank === seeding.homeSeed);
                        homeTeamId = homeTeam?.team_id ?? null;
                        homeSeed = seeding.homeSeed;
                    }

                    // Set away team (qualified or TBD from play-in)
                    if (seeding.awayType === 'qualified' && seeding.awaySeed) {
                        const awayTeam = standings.find(s => s.rank === seeding.awaySeed);
                        awayTeamId = awayTeam?.team_id ?? null;
                        awaySeed = seeding.awaySeed;
                    }
                    // If awayType is 'playin', leave awayTeamId as null (TBD)
                }

                allMatches.push({
                    id: matchId,
                    seasonId: p.seasonId,
                    week: currentWeek,
                    matchType: "playoffs",
                    status: "pending",
                    bestOf: isSemifinal || isFinal ? 5 : 3,
                    homeTeamId,
                    awayTeamId
                });

                allBrackets.push({
                    seasonId: p.seasonId,
                    round: round.type,
                    matchId,
                    seedHome: homeSeed,
                    seedAway: awaySeed,
                    nextBracketId: null,
                    winnerPosition: null
                });

                // Link play-in matches to first round
                if (isFirstRound) {
                    const seeding = getFirstRoundSeeding(
                        config.qualified_teams,
                        config.playin_teams,
                        matchIndex
                    );

                    if (seeding.awayType === 'playin' && seeding.playinSeeds) {
                        // Find the play-in match that these seeds participate in
                        const playinMatchId = playinMatchIdMap.get(seeding.playinSeeds[0]);

                        if (playinMatchId) {
                            const playinBracketIndex = allBrackets.findIndex(b => b.matchId === playinMatchId);
                            if (playinBracketIndex !== -1) {
                                allBrackets[playinBracketIndex].nextBracketId = matchId;
                                allBrackets[playinBracketIndex].winnerPosition = "away";
                            }
                        }
                    }
                }

                // Link previous round to current round
                if (!isFirstRound && previousRoundMatchIds.length > 0) {
                    const prevMatch1Index = matchIndex * 2;
                    const prevMatch2Index = matchIndex * 2 + 1;

                    if (prevMatch1Index < previousRoundMatchIds.length) {
                        const prevMatch1Id = previousRoundMatchIds[prevMatch1Index];
                        const prevBracket1Index = allBrackets.findIndex(b => b.matchId === prevMatch1Id);

                        if (prevBracket1Index !== -1) {
                            allBrackets[prevBracket1Index].nextBracketId = matchId;
                            allBrackets[prevBracket1Index].winnerPosition = "home";
                        }
                    }

                    if (prevMatch2Index < previousRoundMatchIds.length) {
                        const prevMatch2Id = previousRoundMatchIds[prevMatch2Index];
                        const prevBracket2Index = allBrackets.findIndex(b => b.matchId === prevMatch2Id);

                        if (prevBracket2Index !== -1) {
                            allBrackets[prevBracket2Index].nextBracketId = matchId;
                            allBrackets[prevBracket2Index].winnerPosition = "away";
                        }
                    }
                }
            }

            previousRoundMatchIds = newMatchIds;
            currentWeek++;
        }

        // Generate third place match
        if (previousRoundMatchIds.length === 2) {
            generateThirdPlaceMatch(p.seasonId, previousRoundMatchIds, currentWeek, allMatches, allBrackets);
        }

        const { data: matches, error: matchesError } = await insertPlayoffMatches(supabase, allMatches);

        if (matchesError || !matches) {
            logger.error({ seasonId: p.seasonId, error: matchesError }, "Failed to insert playoff matches");
            return Err(serializeError(matchesError));
        }

        const matchIdMap = new Map<string, string>();
        allMatches.forEach((match, index) => {
            if (match.id) {
                matchIdMap.set(match.id, matches[index].id);
            }
        });

        const bracketsWithoutNext = allBrackets.map(b => ({
            seasonId: b.seasonId,
            round: b.round,
            matchId: b.matchId,
            seedHome: b.seedHome,
            seedAway: b.seedAway,
            nextBracketId: null,
            winnerPosition: b.winnerPosition
        }));

        const { data: brackets, error: bracketsError } = await insertPlayoffBrackets(supabase, bracketsWithoutNext);

        if (bracketsError || !brackets) {
            logger.error({ seasonId: p.seasonId, error: bracketsError }, "Failed to insert playoff brackets");
            return Err(serializeError(bracketsError));
        }

        const matchToBracketIdMap = new Map<string, string>();
        brackets.forEach(b => {
            matchToBracketIdMap.set(b.match_id, b.id);
        });

        const updatePromises = allBrackets
            .filter(b => b.nextBracketId !== null)
            .map(async (b) => {
                const currentBracketId = matchToBracketIdMap.get(b.matchId);
                const nextBracketId = matchToBracketIdMap.get(b.nextBracketId!);

                if (!currentBracketId || !nextBracketId) {
                    logger.warn({
                        currentMatchId: b.matchId,
                        nextMatchId: b.nextBracketId
                    }, "Could not find bracket IDs for update");
                    return { error: null };
                }

                return supabase
                    .from("playoff_brackets")
                    .update({ next_bracket_id: nextBracketId })
                    .eq("id", currentBracketId);
            });

        if (updatePromises.length > 0) {
            const updateResults = await Promise.all(updatePromises);
            const updateError = updateResults.find(r => r.error);

            if (updateError?.error) {
                logger.error({ seasonId: p.seasonId, error: updateError.error }, "Failed to update bracket references");
                return Err(serializeError(updateError.error));
            }
        }

        const { error: updateError } = await updateSeasonPlayoffStatus(supabase, p.seasonId, {
            playoffStarted: true
        });

        if (updateError) {
            logger.error({ seasonId: p.seasonId, error: updateError }, "Failed to update season playoff status");
            return Err(serializeError(updateError));
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

function calculateRounds(teamCount: number): Array<{ type: RoundType; matchCount: number }> {
    const rounds: Array<{ type: RoundType; matchCount: number }> = [];
    let remainingTeams = teamCount;

    const roundNames: RoundType[] = ["round_of_16", "quarterfinal", "semifinal", "final"];
    let roundNameIndex = 0;

    if (teamCount === 16) {
        roundNameIndex = 0;
    } else if (teamCount === 8) {
        roundNameIndex = 1;
    } else if (teamCount === 4) {
        roundNameIndex = 2;
    } else if (teamCount === 2) {
        roundNameIndex = 3;
    }

    while (remainingTeams > 1) {
        const matchCount = remainingTeams / 2;
        const roundType = roundNameIndex < roundNames.length ? roundNames[roundNameIndex] : "quarterfinal";

        rounds.push({
            type: roundType,
            matchCount
        });

        remainingTeams = matchCount;
        roundNameIndex++;
    }

    return rounds;
}

function getFirstRoundSeeding(
    qualifiedCount: number,
    playinCount: number,
    matchIndex: number
): {
    homeSeed: number;
    awayType: 'qualified' | 'playin';
    awaySeed?: number;
    playinSeeds?: [number, number];
} {
    const totalTeams = qualifiedCount + playinCount;
    const playinWinners = playinCount / 2;
    const firstRoundMatchCount = (qualifiedCount + playinWinners) / 2;

    // Standard tournament seeding: 1 vs lowest, 2 vs second-lowest, etc.
    // With play-ins: top seeds face play-in winners

    if (playinCount > 0) {
        // Determine which matches have play-in opponents
        // Top seeds (1, 2, ...) face play-in winners
        const topSeedsWithPlayins = Math.floor(playinWinners);

        if (matchIndex < topSeedsWithPlayins) {
            // This is a top seed vs play-in winner match
            const homeSeed = matchIndex + 1; // 1, 2, 3, ...

            // Determine which play-in seeds feed into this match
            // For 4 play-in teams (seeds 7,8,9,10):
            // Match 0: Seed 1 vs winner of (8v9)
            // Match 1: Seed 2 vs winner of (7v10)
            const playinPairIndex = topSeedsWithPlayins - matchIndex - 1;
            const firstPlayinSeed = qualifiedCount + 1 + (playinPairIndex * 2);

            return {
                homeSeed,
                awayType: 'playin',
                playinSeeds: [firstPlayinSeed + 1, firstPlayinSeed] // Higher seed first (e.g., 8, 9)
            };
        } else {
            // This is a qualified vs qualified match
            const adjustedIndex = matchIndex - topSeedsWithPlayins;
            const homeSeed = topSeedsWithPlayins + adjustedIndex + 1;
            const awaySeed = qualifiedCount - adjustedIndex;

            return {
                homeSeed,
                awayType: 'qualified',
                awaySeed
            };
        }
    } else {
        // No play-ins, standard seeding
        const homeSeed = matchIndex + 1;
        const awaySeed = qualifiedCount - matchIndex;

        return {
            homeSeed,
            awayType: 'qualified',
            awaySeed
        };
    }
}

function generateThirdPlaceMatch(
    seasonId: string,
    semiMatchIds: string[],
    week: number,
    allMatches: InsertPlayoffMatchDto[],
    allBrackets: InsertPlayoffBracketDto[]
): void {
    if (semiMatchIds.length !== 2) return;

    const thirdPlaceMatchId = randomUUID();

    allMatches.push({
        id: thirdPlaceMatchId,
        seasonId,
        week,
        matchType: "playoffs",
        status: "pending",
        bestOf: 5,
        homeTeamId: null,
        awayTeamId: null
    });

    allBrackets.push({
        seasonId,
        round: "third_place",
        matchId: thirdPlaceMatchId,
        seedHome: null,
        seedAway: null,
        nextBracketId: null,
        winnerPosition: null
    });
}

export async function getPlayoffBracketBySeasonId(supabase: DBClient, seasonId: string): Promise<Result<PlayoffBracket[]>> {
    try {
        const { data, error } = await findPlayoffBracketsBySeasonId(supabase, seasonId);

        if (error) {
            logger.error({ error }, "Failed to fetch playoff bracket matches");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "FetchError",
                message: "Failed to fetch playoff brackets"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching playoff brackets");
        return Err(serializeError(error));
    }
}