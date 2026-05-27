import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match, MatchSet, PlayerMatchStatSet, PlayerMatchStatTotal, Team} from "@/shared/types/db";
import {serializeError, SerializableError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findRegionByCode} from "@/server/db/regions.repo";
import {findSeasonBySlugAndRegion} from "@/server/db/seasons.repo";
import {findMatchByCode, findMatchById, findMatchSets} from "@/server/db/matches.repo";
import {findTeamsByIds} from "@/server/db/teams.repo";
import {findMatchStatSets, findMatchStatTotals} from "@/server/db/playerMatchStats.repo";
import {findMatchOfficials} from "@/server/db/matchOfficial.repo";
import {MatchOfficialEntry} from "../types";

export type MatchDetail = {
    match: Match;
    sets: MatchSet[];
    homeTeam: Team | null;
    awayTeam: Team | null;
    officials: MatchOfficialEntry[];
    statSets: PlayerMatchStatSet[];
    statTotals: PlayerMatchStatTotal[];
    playoffRound: string | null;
};

async function loadDetailForMatch(
    supabase: DBClient,
    match: Match
): Promise<Result<MatchDetail, SerializableError>> {
    const teamIds = [match.home_team_id, match.away_team_id].filter((id): id is string => !!id);

    const [setsRes, teamsRes, officialsRes, statSetsRes, statTotalsRes] = await Promise.all([
        findMatchSets(supabase, match.id),
        findTeamsByIds(supabase, teamIds),
        findMatchOfficials(supabase, match.id),
        findMatchStatSets(supabase, match.id),
        findMatchStatTotals(supabase, match.id),
    ]);

    if (!setsRes.ok) return setsRes;
    if (!teamsRes.ok) return teamsRes;
    if (!officialsRes.ok) return officialsRes;
    if (!statSetsRes.ok) return statSetsRes;
    if (!statTotalsRes.ok) return statTotalsRes;

    const teamById = new Map(teamsRes.value.map(t => [t.id, t]));

    const officials: MatchOfficialEntry[] = officialsRes.value
        .filter(mo => mo.player !== null)
        .map(mo => ({
            id: mo.player!.id,
            username: mo.player!.username,
            display_name: mo.player!.display_name,
            avatar_url: mo.player!.avatar_url,
            official_type: mo.official_type as "referee" | "media",
        }));

    let playoffRound: string | null = null;
    if (match.match_type === "playoffs") {
        const bracketRes = await supabase
            .from("playoff_brackets")
            .select("round")
            .eq("match_id", match.id)
            .maybeSingle();
        if (!bracketRes.error && bracketRes.data) {
            playoffRound = bracketRes.data.round as string;
        }
    }

    return Ok({
        match,
        sets: setsRes.value,
        homeTeam: match.home_team_id ? teamById.get(match.home_team_id) ?? null : null,
        awayTeam: match.away_team_id ? teamById.get(match.away_team_id) ?? null : null,
        officials,
        statSets: statSetsRes.value,
        statTotals: statTotalsRes.value,
        playoffRound,
    });
}

export async function getMatchDetail(
    supabase: DBClient,
    p: { regionCode: string; seasonSlug: string; matchCode: string }
): Promise<Result<MatchDetail, SerializableError>> {
    try {
        const regionRes = await findRegionByCode(supabase, p.regionCode);
        if (!regionRes.ok) return regionRes;
        if (!regionRes.value) return Err({message: "Region not found", code: "NOT_FOUND"});

        const seasonRes = await findSeasonBySlugAndRegion(supabase, p.seasonSlug, regionRes.value.id);
        if (!seasonRes.ok) return seasonRes;
        if (!seasonRes.value) return Err({message: "Season not found", code: "NOT_FOUND"});
        const matchRes = await findMatchByCode(supabase, p.matchCode, seasonRes.value.id);
        if (!matchRes.ok) return matchRes;
        if (!matchRes.value) return Err({message: "Match not found", code: "NOT_FOUND"});
        
        
        return loadDetailForMatch(supabase, matchRes.value);
    } catch (error) {
        logger.error({...p, error}, "Unexpected error fetching match detail");
        return Err(serializeError(error));
    }
}

export async function getMatchDetailById(
    supabase: DBClient,
    matchId: string
): Promise<Result<MatchDetail, SerializableError>> {
    try {
        const matchRes = await findMatchById(supabase, matchId);
        if (!matchRes.ok) return matchRes;
        if (!matchRes.value) return Err({message: "Match not found", code: "NOT_FOUND"});

        return loadDetailForMatch(supabase, matchRes.value);
    } catch (error) {
        logger.error({matchId, error}, "Unexpected error fetching match detail by id");
        return Err(serializeError(error));
    }
}
