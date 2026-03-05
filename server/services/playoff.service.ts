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

        const qualifiedTeams = standings.slice(0, config.qualified_teams);
        const playinTeams = standings.slice(config.qualified_teams, totalTeams);

        const allMatches: InsertPlayoffMatchDto[] = [];
        const allBrackets: InsertPlayoffBracketDto[] = [];

        const bracketStructure = determineBracketStructure(config.qualified_teams, config.playin_teams);

        let currentWeek = 1;
        let previousRoundMatchIds: string[] = [];

        if (bracketStructure.hasPlayins) {
            previousRoundMatchIds = generatePlayinRound(
                p.seasonId,
                playinTeams,
                currentWeek,
                allMatches,
                allBrackets
            );
            currentWeek++;
        }

        const teamsAfterPlayins = config.qualified_teams + previousRoundMatchIds.length;

        previousRoundMatchIds = generateMainBracketRounds(
            p.seasonId,
            qualifiedTeams,
            previousRoundMatchIds,
            teamsAfterPlayins,
            currentWeek,
            allMatches,
            allBrackets
        );

        const { data: matches, error: matchesError } = await insertPlayoffMatches(supabase, allMatches);

        if (matchesError || !matches) {
            logger.error({ seasonId: p.seasonId, error: matchesError }, "Failed to insert playoff matches");
            return Err(serializeError(matchesError));
        }

        const { data: brackets, error: bracketsError } = await insertPlayoffBrackets(supabase, allBrackets);

        if (bracketsError || !brackets) {
            logger.error({ seasonId: p.seasonId, error: bracketsError }, "Failed to insert playoff brackets");
            return Err(serializeError(bracketsError));
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

function determineBracketStructure(qualifiedTeams: number, playinTeams: number) {
    const teamsAfterPlayins = qualifiedTeams + playinTeams;

    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(teamsAfterPlayins)));

    return {
        hasPlayins: playinTeams > 0,
        playinMatches: playinTeams / 2,
        teamsAfterPlayins,
        targetBracketSize: nextPowerOf2,
        roundsNeeded: Math.log2(nextPowerOf2)
    };
}

function generatePlayinRound(
    seasonId: string,
    playinTeams: Array<{ team_id: string | null; rank: number | null }>,
    week: number,
    allMatches: InsertPlayoffMatchDto[],
    allBrackets: InsertPlayoffBracketDto[]
): string[] {
    const matchIds: string[] = [];
    const numMatches = playinTeams.length / 2;

    for (let i = 0; i < numMatches; i++) {
        const matchId = randomUUID();
        matchIds.push(matchId);

        const homeTeam = playinTeams[i * 2];
        const awayTeam = playinTeams[i * 2 + 1];

        allMatches.push({
            seasonId,
            week,
            matchType: "playoffs",
            status: "pending",
            bestOf: 3,
            homeTeamId: homeTeam?.team_id ?? null,
            awayTeamId: awayTeam?.team_id ?? null
        });

        allBrackets.push({
            seasonId,
            round: "play_in",
            matchId,
            seedHome: homeTeam?.rank ?? null,
            seedAway: awayTeam?.rank ?? null,
            nextBracketId: null,
            winnerPosition: null
        });
    }

    return matchIds;
}

function generateMainBracketRounds(
    seasonId: string,
    qualifiedTeams: Array<{ team_id: string | null; rank: number | null }>,
    playinMatchIds: string[],
    totalTeamsInBracket: number,
    startingWeek: number,
    allMatches: InsertPlayoffMatchDto[],
    allBrackets: InsertPlayoffBracketDto[]
): string[] {
    const rounds = calculateRounds(totalTeamsInBracket);

    let currentWeek = startingWeek;
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
                const seeding = getFirstRoundSeeding(totalTeamsInBracket, matchIndex, qualifiedTeams.length, playinMatchIds.length);

                if (seeding.homeType === 'qualified') {
                    const qualifiedTeam = qualifiedTeams[seeding.homeIndex!];
                    homeTeamId = qualifiedTeam?.team_id ?? null;
                    homeSeed = qualifiedTeam?.rank ?? null;
                }

                if (seeding.awayType === 'qualified') {
                    const qualifiedTeam = qualifiedTeams[seeding.awayIndex!];
                    awayTeamId = qualifiedTeam?.team_id ?? null;
                    awaySeed = qualifiedTeam?.rank ?? null;
                }
            }

            allMatches.push({
                seasonId,
                week: currentWeek,
                matchType: "playoffs",
                status: "pending",
                bestOf: isSemifinal || isFinal ? 5 : 3,
                homeTeamId,
                awayTeamId
            });

            allBrackets.push({
                seasonId,
                round: round.type,
                matchId,
                seedHome: homeSeed,
                seedAway: awaySeed,
                nextBracketId: null,
                winnerPosition: null
            });

            if (isFirstRound && playinMatchIds.length > 0) {
                const seeding = getFirstRoundSeeding(totalTeamsInBracket, matchIndex, qualifiedTeams.length, playinMatchIds.length);

                if (seeding.awayType === 'playin') {
                    const playinMatchId = playinMatchIds[seeding.awayIndex!];
                    const playinBracketIndex = allBrackets.findIndex(b => b.matchId === playinMatchId);

                    if (playinBracketIndex !== -1) {
                        allBrackets[playinBracketIndex].nextBracketId = matchId;
                        allBrackets[playinBracketIndex].winnerPosition = "away";
                    }
                }
            }

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

    const semiMatchIds = previousRoundMatchIds;
    generateThirdPlaceMatch(seasonId, semiMatchIds, currentWeek, allMatches, allBrackets);

    return previousRoundMatchIds;
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
    totalTeams: number,
    matchIndex: number,
    qualifiedCount: number,
    playinWinnerCount: number
): {
    homeType: 'qualified' | 'playin' | null;
    homeIndex: number | null;
    awayType: 'qualified' | 'playin' | null;
    awayIndex: number | null;
} {
    const matchesInFirstRound = totalTeams / 2;

    const playinAssignments: number[] = [];
    const step = matchesInFirstRound / playinWinnerCount;

    for (let i = 0; i < playinWinnerCount; i++) {
        playinAssignments.push(Math.floor(i * step));
    }

    const isPlayinMatch = playinAssignments.includes(matchIndex);

    if (isPlayinMatch) {
        const playinIndex = playinAssignments.indexOf(matchIndex);
        return {
            homeType: 'qualified',
            homeIndex: matchIndex,
            awayType: 'playin',
            awayIndex: playinIndex
        };
    } else {
        const awayOffset = matchesInFirstRound - matchIndex - 1;
        return {
            homeType: 'qualified',
            homeIndex: matchIndex,
            awayType: 'qualified',
            awayIndex: qualifiedCount - 1 - awayOffset
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