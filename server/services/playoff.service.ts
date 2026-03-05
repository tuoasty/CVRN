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
import {findAllMatches} from "@/server/db/matches.repo";

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

        const playinMatchIds = generatePlayinMatches(
            p.seasonId,
            playinTeams,
            allMatches,
            allBrackets
        );

        const r16MatchIds = generateRound16Matches(
            p.seasonId,
            qualifiedTeams,
            playinMatchIds,
            allMatches,
            allBrackets
        );

        const quarterMatchIds = generateQuarterfinalsMatches(
            p.seasonId,
            r16MatchIds,
            allMatches,
            allBrackets
        );

        const semiMatchIds = generateSemifinalsMatches(
            p.seasonId,
            quarterMatchIds,
            allMatches,
            allBrackets
        );

        generateFinalsMatches(
            p.seasonId,
            semiMatchIds,
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

function generatePlayinMatches(
    seasonId: string,
    playinTeams: Array<{ team_id: string | null; rank: number | null }>,
    allMatches: InsertPlayoffMatchDto[],
    allBrackets: InsertPlayoffBracketDto[]
): string[] {
    const matchIds: string[] = [];
    const pairings = [
        { home: 16, away: 17 },
        { home: 15, away: 18 },
        { home: 14, away: 19 },
        { home: 13, away: 20 }
    ];

    for (const pairing of pairings) {
        const matchId = randomUUID();
        matchIds.push(matchId);

        const homeTeam = playinTeams.find(t => t.rank === pairing.home);
        const awayTeam = playinTeams.find(t => t.rank === pairing.away);

        allMatches.push({
            seasonId,
            week: 1,
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
            seedHome: pairing.home,
            seedAway: pairing.away,
            nextBracketId: null,
            winnerPosition: null
        });
    }

    return matchIds;
}

function generateRound16Matches(
    seasonId: string,
    qualifiedTeams: Array<{ team_id: string | null; rank: number | null }>,
    playinMatchIds: string[],
    allMatches: InsertPlayoffMatchDto[],
    allBrackets: InsertPlayoffBracketDto[]
): string[] {
    const matchIds: string[] = [];

    const pairings = [
        { homeSeed: 1, awayPlayinIndex: 0 },
        { homeSeed: 8, awaySeed: 9 },
        { homeSeed: 5, awaySeed: 12 },
        { homeSeed: 4, awayPlayinIndex: 1 },
        { homeSeed: 3, awayPlayinIndex: 2 },
        { homeSeed: 6, awaySeed: 11 },
        { homeSeed: 7, awaySeed: 10 },
        { homeSeed: 2, awayPlayinIndex: 3 }
    ];

    for (const pairing of pairings) {
        const matchId = randomUUID();
        matchIds.push(matchId);

        const homeTeam = qualifiedTeams.find(t => t.rank === pairing.homeSeed);
        let awayTeamId: string | null = null;
        let awaySeed: number | null = null;

        if ('awaySeed' in pairing && pairing.awaySeed !== undefined) {
            const awayTeam = qualifiedTeams.find(t => t.rank === pairing.awaySeed);
            awayTeamId = awayTeam?.team_id ?? null;
            awaySeed = pairing.awaySeed;
        }

        allMatches.push({
            seasonId,
            week: 2,
            matchType: "playoffs",
            status: "pending",
            bestOf: 3,
            homeTeamId: homeTeam?.team_id ?? null,
            awayTeamId: awayTeamId
        });

        const bracketEntry: InsertPlayoffBracketDto = {
            seasonId,
            round: "round_of_16",
            matchId,
            seedHome: pairing.homeSeed,
            seedAway: awaySeed,
            nextBracketId: null,
            winnerPosition: null
        };

        allBrackets.push(bracketEntry);

        if ('awayPlayinIndex' in pairing && pairing.awayPlayinIndex !== undefined) {
            const playinMatchId = playinMatchIds[pairing.awayPlayinIndex];
            const playinBracketIndex = allBrackets.findIndex(b => b.matchId === playinMatchId);

            if (playinBracketIndex !== -1) {
                allBrackets[playinBracketIndex].nextBracketId = matchId;
                allBrackets[playinBracketIndex].winnerPosition = "away";
            }
        }
    }

    return matchIds;
}

function generateQuarterfinalsMatches(
    seasonId: string,
    r16MatchIds: string[],
    allMatches: InsertPlayoffMatchDto[],
    allBrackets: InsertPlayoffBracketDto[]
): string[] {
    const matchIds: string[] = [];

    const quarterPairings = [
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7]
    ];

    for (const [r16Index1, r16Index2] of quarterPairings) {
        const matchId = randomUUID();
        matchIds.push(matchId);

        allMatches.push({
            seasonId,
            week: 3,
            matchType: "playoffs",
            status: "pending",
            bestOf: 3,
            homeTeamId: null,
            awayTeamId: null
        });

        allBrackets.push({
            seasonId,
            round: "quarterfinal",
            matchId,
            seedHome: null,
            seedAway: null,
            nextBracketId: null,
            winnerPosition: null
        });

        const r16Match1Id = r16MatchIds[r16Index1];
        const r16Match2Id = r16MatchIds[r16Index2];

        const r16Bracket1Index = allBrackets.findIndex(b => b.matchId === r16Match1Id);
        const r16Bracket2Index = allBrackets.findIndex(b => b.matchId === r16Match2Id);

        if (r16Bracket1Index !== -1) {
            allBrackets[r16Bracket1Index].nextBracketId = matchId;
            allBrackets[r16Bracket1Index].winnerPosition = "home";
        }

        if (r16Bracket2Index !== -1) {
            allBrackets[r16Bracket2Index].nextBracketId = matchId;
            allBrackets[r16Bracket2Index].winnerPosition = "away";
        }
    }

    return matchIds;
}

function generateSemifinalsMatches(
    seasonId: string,
    quarterMatchIds: string[],
    allMatches: InsertPlayoffMatchDto[],
    allBrackets: InsertPlayoffBracketDto[]
): string[] {
    const matchIds: string[] = [];

    const semiPairings = [
        [0, 1],
        [2, 3]
    ];

    for (const [quarterIndex1, quarterIndex2] of semiPairings) {
        const matchId = randomUUID();
        matchIds.push(matchId);

        allMatches.push({
            seasonId,
            week: 4,
            matchType: "playoffs",
            status: "pending",
            bestOf: 5,
            homeTeamId: null,
            awayTeamId: null
        });

        allBrackets.push({
            seasonId,
            round: "semifinal",
            matchId,
            seedHome: null,
            seedAway: null,
            nextBracketId: null,
            winnerPosition: null
        });

        const quarterMatch1Id = quarterMatchIds[quarterIndex1];
        const quarterMatch2Id = quarterMatchIds[quarterIndex2];

        const quarterBracket1Index = allBrackets.findIndex(b => b.matchId === quarterMatch1Id);
        const quarterBracket2Index = allBrackets.findIndex(b => b.matchId === quarterMatch2Id);

        if (quarterBracket1Index !== -1) {
            allBrackets[quarterBracket1Index].nextBracketId = matchId;
            allBrackets[quarterBracket1Index].winnerPosition = "home";
        }

        if (quarterBracket2Index !== -1) {
            allBrackets[quarterBracket2Index].nextBracketId = matchId;
            allBrackets[quarterBracket2Index].winnerPosition = "away";
        }
    }

    return matchIds;
}

function generateFinalsMatches(
    seasonId: string,
    semiMatchIds: string[],
    allMatches: InsertPlayoffMatchDto[],
    allBrackets: InsertPlayoffBracketDto[]
): void {
    const finalsMatchId = randomUUID();
    const thirdPlaceMatchId = randomUUID();

    allMatches.push({
        seasonId,
        week: 5,
        matchType: "playoffs",
        status: "pending",
        bestOf: 5,
        homeTeamId: null,
        awayTeamId: null
    });

    allBrackets.push({
        seasonId,
        round: "final",
        matchId: finalsMatchId,
        seedHome: null,
        seedAway: null,
        nextBracketId: null,
        winnerPosition: null
    });

    allMatches.push({
        seasonId,
        week: 5,
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

    const semi1Id = semiMatchIds[0];
    const semi2Id = semiMatchIds[1];

    const semi1BracketIndex = allBrackets.findIndex(b => b.matchId === semi1Id);
    const semi2BracketIndex = allBrackets.findIndex(b => b.matchId === semi2Id);

    if (semi1BracketIndex !== -1) {
        allBrackets[semi1BracketIndex].nextBracketId = finalsMatchId;
        allBrackets[semi1BracketIndex].winnerPosition = "home";
    }

    if (semi2BracketIndex !== -1) {
        allBrackets[semi2BracketIndex].nextBracketId = finalsMatchId;
        allBrackets[semi2BracketIndex].winnerPosition = "away";
    }
}

export async function getPlayoffBracketBySeasonId(supabase:DBClient, seasonId:string): Promise<Result<PlayoffBracket[]>>{
    try {
        const {data, error} = await findPlayoffBracketsBySeasonId(supabase, seasonId);

        if (error) {
            logger.error({error}, "Failed to fetch playoff bracket matches");
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
        logger.error({error}, "Unexpected error fetching playoff brackets");
        return Err(serializeError(error));
    }
}