import type {PickemMarketSource, PickemMatchSource, PickemOutcomeSource, PickemTeamView} from "../types";
import type {GamePayout} from "../types/gameSchemas";
import {MARKET_LABELS} from "./toOpenPickems";

export interface PayoutPickSource {
    id: string;
    marketId: string;
    outcomeKey: string;
    stake: number;
    payout: number;
}

export interface PayoutOutcomeSource extends PickemOutcomeSource {
    finalOdds: number | null;
}

function toGameTeam(team: PickemTeamView | null) {
    return team ? {id: team.id, name: team.name, logo_url: team.logoUrl} : null;
}

export function toGamePayouts(p: {
    picks: PayoutPickSource[];
    markets: PickemMarketSource[];
    outcomes: PayoutOutcomeSource[];
    matches: PickemMatchSource[];
}): GamePayout[] {
    const markets = new Map(p.markets.map(m => [m.id, m]));
    const matches = new Map(p.matches.map(m => [m.id, m]));
    const outcomes = new Map(p.outcomes.map(o => [`${o.marketId}:${o.key}`, o]));

    return p.picks.flatMap(pick => {
        const market = markets.get(pick.marketId);
        const match = market ? matches.get(market.matchId) : undefined;
        if (!market || !match || market.status === "open") return [];
        const outcome = outcomes.get(`${market.id}:${pick.outcomeKey}`);
        const teamName = market.kind === "winner"
            ? pick.outcomeKey === "home" ? match.home?.name : pick.outcomeKey === "away" ? match.away?.name : undefined
            : undefined;
        const refunded = market.status === "refunded";
        return [{
            pick_id: pick.id,
            match_id: match.id,
            match_code: match.matchCode,
            home: toGameTeam(match.home),
            away: toGameTeam(match.away),
            market_id: market.id,
            kind: market.kind,
            label: MARKET_LABELS[market.kind],
            outcome: pick.outcomeKey,
            outcome_label: teamName ?? outcome?.label ?? pick.outcomeKey,
            result_outcome: refunded ? null : market.resultOutcome,
            stake: pick.stake,
            final_odds: refunded ? null : outcome?.finalOdds ?? null,
            result: refunded ? "refund" as const : pick.outcomeKey === market.resultOutcome ? "win" as const : "loss" as const,
            payout: pick.payout,
        }];
    });
}
