import type {PickemMarketKind, PickemMarketSource, PickemMatchSource, PickemOddsSource, PickemOutcomeSource, PickemTeamView} from "../types";
import type {OpenPickemsResponse} from "../types/gameSchemas";
import {buildMarketViews, compareMatches, isPickemLocked} from "./buildPickemBoard";

export const MARKET_LABELS: Record<PickemMarketKind, string> = {
    winner: "Winner",
    match_length: "Match length",
};

export interface OpenPickemMatch extends PickemMatchSource {
    region: string | null;
    seasonNumber: number | null;
}

export interface PlayerPickSource {
    id: string;
    marketId: string;
    outcomeKey: string;
    stake: number;
}

function toGameTeam(team: PickemTeamView | null) {
    return team ? {id: team.id, name: team.name, logo_url: team.logoUrl} : null;
}

export function toOpenPickems(p: {
    matches: OpenPickemMatch[];
    markets: PickemMarketSource[];
    outcomes: PickemOutcomeSource[];
    odds: PickemOddsSource[];
    picks: PlayerPickSource[];
    stakeMin: number;
    stakeMax: number;
    now: Date;
}): OpenPickemsResponse {
    const picksByMarket = new Map(p.picks.map(pick => [pick.marketId, pick]));

    const pickems = [...p.matches].sort(compareMatches).flatMap(match => {
        const markets = p.markets.filter(m => m.matchId === match.id);
        if (markets.length === 0) return [];
        const teamLabel = (key: string) => key === "home" ? match.home?.name ?? null : key === "away" ? match.away?.name ?? null : null;
        return [{
            match_id: match.id,
            match_code: match.matchCode,
            match_type: match.matchType,
            region: match.region,
            season_number: match.seasonNumber,
            best_of: match.bestOf,
            scheduled_at: match.scheduledAt,
            lock_at: match.scheduledAt,
            locked: isPickemLocked(match, p.now),
            home: toGameTeam(match.home),
            away: toGameTeam(match.away),
            markets: buildMarketViews(markets, p.outcomes, p.odds, teamLabel).map(market => {
                const pick = picksByMarket.get(market.id);
                return {
                    market_id: market.id,
                    kind: market.kind,
                    label: MARKET_LABELS[market.kind],
                    line: null,
                    pool: market.pool,
                    outcomes: market.outcomes.map(o => ({key: o.key, label: o.label, odds: o.odds})),
                    my_pick: pick ? {pick_id: pick.id, outcome: pick.outcomeKey, stake: pick.stake} : null,
                };
            }),
        }];
    });

    return {server_time: p.now.toISOString(), stake_min: p.stakeMin, stake_max: p.stakeMax, pickems};
}
