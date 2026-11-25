import type {PickemMarketDraft, PickemMatchSource, PickemSettings} from "../types";
import {homeWinChance, matchLengthOutcomes, TeamRating, winnerOutcomes} from "./startingChance";

export function buildPublishDrafts(
    matches: PickemMatchSource[],
    ratings: Map<string, TeamRating>,
    settings: Pick<PickemSettings, "sigma" | "shrinkSets" | "probClamp">,
): PickemMarketDraft[] {
    return matches.flatMap(match => {
        const home = match.home ? ratings.get(match.home.id) ?? null : null;
        const away = match.away ? ratings.get(match.away.id) ?? null : null;
        return [
            {matchId: match.id, kind: "winner" as const, outcomes: winnerOutcomes(homeWinChance(home, away, match.bestOf, settings))},
            {matchId: match.id, kind: "match_length" as const, outcomes: matchLengthOutcomes(match.bestOf)},
        ];
    });
}
