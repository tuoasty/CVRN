import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export type SeasonFinalsSlots = {

    upperFinalistTeamId: string | null;

    finalistTeamIds: string[];
    thirdTeamId: string | null;
};

const NO_SLOTS: SeasonFinalsSlots = {
    upperFinalistTeamId: null,
    finalistTeamIds: [],
    thirdTeamId: null,
};

type RoundMatch = {
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeSetsWon: number | null;
    awaySetsWon: number | null;
};

export async function getSeasonFinalsSlots(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SeasonFinalsSlots>> {
    try {
        const grandFinal = await readRoundMatch(supabase, seasonId, "grand_final");
        if (grandFinal) return Ok(await doubleElimSlots(supabase, seasonId, grandFinal));

        const final = await readRoundMatch(supabase, seasonId, "final");
        if (final) return Ok(await singleElimSlots(supabase, seasonId, final));

        return Ok(NO_SLOTS);
    } catch (error) {
        logger.error({error, seasonId}, "Unexpected error reading season finals slots");
        return Err(serializeError(error));
    }
}

async function doubleElimSlots(
    supabase: DBClient,
    seasonId: string,
    grandFinal: RoundMatch
): Promise<SeasonFinalsSlots> {
    const losersFinal = await readRoundMatch(supabase, seasonId, "losers_final");
    const decided = losersFinal ? decideMatch(losersFinal) : null;

    if (losersFinal && !decided) {
        logger.warn({seasonId}, "Losers final unresolved — no third-place slot");
    }

    return {
        upperFinalistTeamId: grandFinal.homeTeamId,
        finalistTeamIds: grandFinal.awayTeamId ? [grandFinal.awayTeamId] : [],

        thirdTeamId: decided?.loser ?? null,
    };
}

async function singleElimSlots(
    supabase: DBClient,
    seasonId: string,
    final: RoundMatch
): Promise<SeasonFinalsSlots> {
    const finalistTeamIds = [final.homeTeamId, final.awayTeamId].filter(
        (id): id is string => id !== null
    );

    const thirdPlace = await readRoundMatch(supabase, seasonId, "third_place");
    if (thirdPlace) {
        const decided = decideMatch(thirdPlace);
        if (!decided) logger.warn({seasonId}, "Third-place match unresolved");
        return {upperFinalistTeamId: null, finalistTeamIds, thirdTeamId: decided?.winner ?? null};
    }

    return {
        upperFinalistTeamId: null,
        finalistTeamIds,
        thirdTeamId: await firstSemifinalLoser(supabase, seasonId, finalistTeamIds),
    };
}

async function firstSemifinalLoser(
    supabase: DBClient,
    seasonId: string,
    exclude: string[]
): Promise<string | null> {
    const {data: semis} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "semifinal");

    for (const semi of semis ?? []) {
        if (!semi.match_id) continue;
        const match = await readMatch(supabase, semi.match_id);
        const decided = match ? decideMatch(match) : null;
        if (decided && !exclude.includes(decided.loser)) return decided.loser;
    }

    logger.warn({seasonId}, "Could not determine third place from semifinal losers");
    return null;
}

async function readRoundMatch(
    supabase: DBClient,
    seasonId: string,
    round: string
): Promise<RoundMatch | null> {
    const {data: bracket} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", round)
        .maybeSingle();

    return bracket?.match_id ? readMatch(supabase, bracket.match_id) : null;
}

async function readMatch(supabase: DBClient, matchId: string): Promise<RoundMatch | null> {
    const {data} = await supabase
        .from("matches")
        .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
        .eq("id", matchId)
        .maybeSingle();

    if (!data) return null;
    return {
        homeTeamId: data.home_team_id,
        awayTeamId: data.away_team_id,
        homeSetsWon: data.home_sets_won,
        awaySetsWon: data.away_sets_won,
    };
}

function decideMatch(match: RoundMatch): {winner: string; loser: string} | null {
    if (!match.homeTeamId || !match.awayTeamId) return null;
    if (match.homeSetsWon === null || match.awaySetsWon === null) return null;
    if (match.homeSetsWon === match.awaySetsWon) return null;

    const homeWins = match.homeSetsWon > match.awaySetsWon;
    return {
        winner: homeWins ? match.homeTeamId : match.awayTeamId,
        loser: homeWins ? match.awayTeamId : match.homeTeamId,
    };
}
