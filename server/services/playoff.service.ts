import {DBClient, PlayoffBracket} from "@/shared/types/db";
import { Err, Ok, Result } from "@/shared/types/result";
import { serializeError } from "@/server/utils/serializeableError";
import { logger } from "@/server/utils/logger";
import { GeneratePlayoffBracketInput, InsertPlayoffBracketDto, InsertPlayoffMatchDto } from "@/server/dto/playoff.dto";
import {
    deletePlayoffMatchesBySeasonId,
    findPlayoffBracketsBySeasonId,
    findPlayoffConfigBySeasonId,
    findStandingsBySeasonId,
    insertPlayoffBrackets,
    insertPlayoffMatches,
    updateSeasonPlayoffStatus
} from "@/server/db/playoff.repo";
import { findSeasonById } from "@/server/db/seasons.repo";
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

        const playinMatchIdMap = new Map<number, string>();
        if (config.playin_teams > 0) {
            const playinTeams = standings.slice(config.qualified_teams, totalTeams);
            const numPlayinMatches = config.playin_teams / 2;

            for (let i = 0; i < numPlayinMatches; i++) {
                const matchId = randomUUID();
                const higherSeedTeam = playinTeams[i];
                const lowerSeedTeam = playinTeams[config.playin_teams - 1 - i];

                playinMatchIdMap.set(lowerSeedTeam.rank!, matchId);

                allMatches.push({
                    id: matchId,
                    seasonId: p.seasonId,
                    week: currentWeek,
                    matchType: "playoffs",
                    status: "pending",
                    bestOf: 3,
                    homeTeamId: higherSeedTeam?.team_id ?? null,
                    awayTeamId: lowerSeedTeam?.team_id ?? null
                });

                allBrackets.push({
                    seasonId: p.seasonId,
                    round: "play_in",
                    matchId,
                    seedHome: higherSeedTeam?.rank ?? null,
                    seedAway: lowerSeedTeam?.rank ?? null,
                    nextBracketId: null,
                    winnerPosition: null,
                    loserNextBracketId: null,
                    loserPosition: null
                });
            }
            currentWeek++;
        }

        const teamsAfterPlayins = config.qualified_teams + (config.playin_teams / 2);
        const rounds = calculateRounds(teamsAfterPlayins);

        let previousRoundMatchIds: string[] = [];
        let semifinalMatchIds: string[] = [];

        type SeedTracker = {
            matchId: string;
            strongerSeed: number;
            weakerSeed: number;
        };

        let previousRoundSeeds: SeedTracker[] = [];

        for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
            const round = rounds[roundIndex];
            const isFirstRound = roundIndex === 0;
            const isSemifinal = round.type === "semifinal";
            const isFinal = round.type === "final";

            type TempMatchData = {
                matchId: string;
                homeTeamId: string | null;
                awayTeamId: string | null;
                homeSeed: number | null;
                awaySeed: number | null;
                playinLowerSeed?: number;
                strongerSeed: number;
                weakerSeed: number;
            };

            const tempMatches: TempMatchData[] = [];

            for (let matchIndex = 0; matchIndex < round.matchCount; matchIndex++) {
                const matchId = randomUUID();

                let homeTeamId: string | null = null;
                let awayTeamId: string | null = null;
                let homeSeed: number | null = null;
                let awaySeed: number | null = null;
                let playinLowerSeed: number | undefined = undefined;
                let strongerSeed: number = 0;
                let weakerSeed: number = 0;

                if (isFirstRound) {
                    const seeding = getFirstRoundSeeding(
                        config.qualified_teams,
                        config.playin_teams,
                        matchIndex
                    );

                    if (seeding.homeSeed) {
                        const homeTeam = standings.find(s => s.rank === seeding.homeSeed);
                        homeTeamId = homeTeam?.team_id ?? null;
                        homeSeed = seeding.homeSeed;
                        strongerSeed = seeding.homeSeed;
                    }

                    if (seeding.awayType === 'qualified' && seeding.awaySeed) {
                        const awayTeam = standings.find(s => s.rank === seeding.awaySeed);
                        awayTeamId = awayTeam?.team_id ?? null;
                        awaySeed = seeding.awaySeed;
                        weakerSeed = seeding.awaySeed;
                    } else if (seeding.awayType === 'playin' && seeding.playinLowerSeed) {
                        playinLowerSeed = seeding.playinLowerSeed;
                        weakerSeed = seeding.playinLowerSeed - 1;
                    }
                }

                tempMatches.push({
                    matchId,
                    homeTeamId,
                    awayTeamId,
                    homeSeed,
                    awaySeed,
                    playinLowerSeed,
                    strongerSeed,
                    weakerSeed
                });
            }

            tempMatches.sort((a, b) => {
                const gapA = a.weakerSeed - a.strongerSeed;
                const gapB = b.weakerSeed - b.strongerSeed;
                return gapB - gapA;
            });

            const sortedMatchIds: string[] = tempMatches.map(m => m.matchId);
            const currentRoundSeeds: SeedTracker[] = [];

            for (const tempMatch of tempMatches) {
                allMatches.push({
                    id: tempMatch.matchId,
                    seasonId: p.seasonId,
                    week: currentWeek,
                    matchType: "playoffs",
                    status: "pending",
                    bestOf: isSemifinal || isFinal ? 5 : 3,
                    homeTeamId: tempMatch.homeTeamId,
                    awayTeamId: tempMatch.awayTeamId
                });

                allBrackets.push({
                    seasonId: p.seasonId,
                    round: round.type,
                    matchId: tempMatch.matchId,
                    seedHome: tempMatch.homeSeed,
                    seedAway: tempMatch.awaySeed,
                    nextBracketId: null,
                    winnerPosition: null,
                    loserNextBracketId: null,
                    loserPosition: null
                });

                currentRoundSeeds.push({
                    matchId: tempMatch.matchId,
                    strongerSeed: tempMatch.strongerSeed,
                    weakerSeed: tempMatch.weakerSeed
                });

                if (isFirstRound && tempMatch.playinLowerSeed) {
                    const playinMatchId = playinMatchIdMap.get(tempMatch.playinLowerSeed);

                    if (playinMatchId) {
                        const playinBracketIndex = allBrackets.findIndex(b => b.matchId === playinMatchId);
                        if (playinBracketIndex !== -1) {
                            allBrackets[playinBracketIndex].nextBracketId = tempMatch.matchId;
                            allBrackets[playinBracketIndex].winnerPosition = "away";
                        }
                    }
                }
            }

            if (!isFirstRound && previousRoundMatchIds.length > 0) {
                for (let i = 0; i < sortedMatchIds.length; i++) {
                    const currentMatchId = sortedMatchIds[i];

                    const prevMatch1Index = i;
                    const prevMatch2Index = previousRoundMatchIds.length - 1 - i;

                    if (prevMatch1Index < previousRoundMatchIds.length) {
                        const prevMatch1Id = previousRoundMatchIds[prevMatch1Index];
                        const prevBracket1Index = allBrackets.findIndex(b => b.matchId === prevMatch1Id);

                        if (prevBracket1Index !== -1) {
                            allBrackets[prevBracket1Index].nextBracketId = currentMatchId;
                            allBrackets[prevBracket1Index].winnerPosition = "home";
                        }

                        const prevMatch1Seeds = previousRoundSeeds.find(s => s.matchId === prevMatch1Id);
                        if (prevMatch1Seeds) {
                            currentRoundSeeds[i].strongerSeed = prevMatch1Seeds.strongerSeed;
                        }
                    }

                    if (prevMatch2Index >= 0 && prevMatch2Index < previousRoundMatchIds.length && prevMatch2Index !== prevMatch1Index) {
                        const prevMatch2Id = previousRoundMatchIds[prevMatch2Index];
                        const prevBracket2Index = allBrackets.findIndex(b => b.matchId === prevMatch2Id);

                        if (prevBracket2Index !== -1) {
                            allBrackets[prevBracket2Index].nextBracketId = currentMatchId;
                            allBrackets[prevBracket2Index].winnerPosition = "away";
                        }

                        const prevMatch2Seeds = previousRoundSeeds.find(s => s.matchId === prevMatch2Id);
                        if (prevMatch2Seeds) {
                            currentRoundSeeds[i].weakerSeed = prevMatch2Seeds.strongerSeed;
                        }
                    }
                }
            }

            if (isSemifinal) {
                semifinalMatchIds = [...sortedMatchIds];
            }

            previousRoundMatchIds = sortedMatchIds;
            previousRoundSeeds = currentRoundSeeds;
            currentWeek++;
        }

        if (semifinalMatchIds.length === 2) {
            const thirdPlaceMatchId = randomUUID();
            const finalsWeek = currentWeek - 1;

            allMatches.push({
                id: thirdPlaceMatchId,
                seasonId: p.seasonId,
                week: finalsWeek,
                matchType: "playoffs",
                status: "pending",
                bestOf: 5,
                homeTeamId: null,
                awayTeamId: null
            });

            allBrackets.push({
                seasonId: p.seasonId,
                round: "third_place",
                matchId: thirdPlaceMatchId,
                seedHome: null,
                seedAway: null,
                nextBracketId: null,
                winnerPosition: null,
                loserNextBracketId: null,
                loserPosition: null
            });

            const semi1BracketIndex = allBrackets.findIndex(b => b.matchId === semifinalMatchIds[0]);
            const semi2BracketIndex = allBrackets.findIndex(b => b.matchId === semifinalMatchIds[1]);

            if (semi1BracketIndex !== -1) {
                allBrackets[semi1BracketIndex].loserNextBracketId = thirdPlaceMatchId;
                allBrackets[semi1BracketIndex].loserPosition = "home";
            }

            if (semi2BracketIndex !== -1) {
                allBrackets[semi2BracketIndex].loserNextBracketId = thirdPlaceMatchId;
                allBrackets[semi2BracketIndex].loserPosition = "away";
            }
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
            winnerPosition: b.winnerPosition,
            loserNextBracketId: null,
            loserPosition: b.loserPosition
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
            .filter(b => b.nextBracketId !== null || b.loserNextBracketId !== null)
            .map(async (b) => {
                const currentBracketId = matchToBracketIdMap.get(b.matchId);

                if (!currentBracketId) {
                    logger.warn({ matchId: b.matchId }, "Could not find bracket ID for update");
                    return { error: null };
                }

                const updateData: {
                    next_bracket_id?: string;
                    loser_next_bracket_id?: string;
                } = {};

                if (b.nextBracketId) {
                    const nextBracketId = matchToBracketIdMap.get(b.nextBracketId);
                    if (nextBracketId) {
                        updateData.next_bracket_id = nextBracketId;
                    }
                }

                if (b.loserNextBracketId) {
                    const loserNextBracketId = matchToBracketIdMap.get(b.loserNextBracketId);
                    if (loserNextBracketId) {
                        updateData.loser_next_bracket_id = loserNextBracketId;
                    }
                }

                if (Object.keys(updateData).length === 0) {
                    return { error: null };
                }

                return supabase
                    .from("playoff_brackets")
                    .update(updateData)
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
    playinLowerSeed?: number;
} {
    const playinWinners = playinCount / 2;
    const totalFirstRoundTeams = qualifiedCount + playinWinners;
    const firstRoundMatchCount = totalFirstRoundTeams / 2;

    if (playinCount > 0) {
        const topSeedsWithPlayins = playinWinners;

        if (matchIndex < topSeedsWithPlayins) {
            const homeSeed = matchIndex + 1;
            const playinMatchIndex = playinWinners - matchIndex - 1;
            const playinLowerSeed = qualifiedCount + playinCount - playinMatchIndex;

            return {
                homeSeed,
                awayType: 'playin',
                playinLowerSeed
            };
        } else {
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
        const homeSeed = matchIndex + 1;
        const awaySeed = qualifiedCount - matchIndex;

        return {
            homeSeed,
            awayType: 'qualified',
            awaySeed
        };
    }
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

export async function resetPlayoffBracketsService(
    supabase: DBClient,
    seasonId: string
): Promise<Result<{ message: string }>> {
    try {
        const { data: season, error: seasonError } = await findSeasonById(supabase, seasonId);

        if (seasonError || !season) {
            logger.error({ seasonId, error: seasonError }, "Season not found");
            return Err({
                name: "NotFoundError",
                message: "Season not found"
            });
        }

        if (!season.playoff_started) {
            return Err({
                name: "ValidationError",
                message: "Playoffs have not been started for this season"
            });
        }

        const { data: playoffMatches, error: matchesError } = await supabase
            .from("matches")
            .select("id, status")
            .eq("season_id", seasonId)
            .eq("match_type", "playoffs");

        if (matchesError) {
            logger.error({ seasonId, error: matchesError }, "Failed to fetch playoff matches");
            return Err(serializeError(matchesError));
        }

        const hasCompletedMatches = playoffMatches?.some(m => m.status === "completed");

        if (hasCompletedMatches) {
            return Err({
                name: "ValidationError",
                message: "Cannot reset brackets - some playoff matches have been completed"
            });
        }

        const { error: deleteError } = await deletePlayoffMatchesBySeasonId(supabase, seasonId);

        if (deleteError) {
            logger.error({ seasonId, error: deleteError }, "Failed to delete playoff matches");
            return Err(serializeError(deleteError));
        }

        const { error: updateError } = await updateSeasonPlayoffStatus(supabase, seasonId, {
            playoffStarted: false
        });

        if (updateError) {
            logger.error({ seasonId, error: updateError }, "Failed to update season playoff status");
            return Err(serializeError(updateError));
        }

        logger.info({ seasonId }, "Playoff brackets reset successfully");

        return Ok({
            message: "Playoff brackets reset successfully"
        });
    } catch (error) {
        logger.error({ error }, "Unexpected error resetting playoff brackets");
        return Err(serializeError(error));
    }
}