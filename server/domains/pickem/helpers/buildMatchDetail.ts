import {PICKEM_MARKET_KINDS} from "../types/schemas";
import type {
    PickemDetailMarket,
    PickemDetailPick,
    PickemDetailPickSource,
    PickemMarketSource,
    PickemMatchDetail,
    PickemMatchSource,
    PickemOddsSource,
    PickemOutcomeSource,
    PickemPickStatus,
    RobloxName,
} from "../types";
import {buildMarketViews} from "./buildPickemBoard";

function pickStatus(market: PickemMarketSource, outcomeKey: string): PickemPickStatus {
    if (market.status === "refunded") return "refunded";
    if (market.status === "open") return "open";
    return market.resultOutcome === outcomeKey ? "won" : "lost";
}

export function payoutFor(stake: number, odds: number): number {
    return Math.floor((stake * Math.round(odds * 100)) / 100);
}

function pickPayout(status: PickemPickStatus, stake: number, odds: number, stored: number | null): number {
    if (status === "open") return payoutFor(stake, odds);
    return stored ?? 0;
}

export function buildMatchDetail(p: {
    match: PickemMatchSource;
    markets: PickemMarketSource[];
    outcomes: PickemOutcomeSource[];
    odds: PickemOddsSource[];
    picks: PickemDetailPickSource[];
    names: Map<string, RobloxName>;
}): PickemMatchDetail {
    const teamLabel = (key: string) => key === "home" ? p.match.home?.name ?? null : key === "away" ? p.match.away?.name ?? null : null;
    const views = buildMarketViews(p.markets, p.outcomes, p.odds, teamLabel);
    const marketById = new Map(p.markets.map(m => [m.id, m]));
    const viewById = new Map(views.map(v => [v.id, v]));

    const picks: PickemDetailPick[] = p.picks.flatMap(pick => {
        const market = marketById.get(pick.marketId);
        const view = viewById.get(pick.marketId);
        if (!market || !view) return [];
        const outcome = view.outcomes.find(o => o.key === pick.outcomeKey);
        const odds = outcome?.odds ?? 0;
        const status = pickStatus(market, pick.outcomeKey);
        const name = p.names.get(pick.robloxUserId);
        return [{
            pickId: pick.id,
            robloxUserId: pick.robloxUserId,
            username: name?.username ?? null,
            displayName: name?.displayName ?? null,
            marketId: market.id,
            kind: market.kind,
            outcomeKey: pick.outcomeKey,
            outcomeLabel: outcome?.label ?? pick.outcomeKey,
            stake: pick.stake,
            odds,
            payout: pickPayout(status, pick.stake, odds, pick.payout),
            status,
            claimedAt: pick.claimedAt,
            updatedAt: pick.updatedAt,
        }];
    }).sort((a, b) =>
        PICKEM_MARKET_KINDS.indexOf(a.kind) - PICKEM_MARKET_KINDS.indexOf(b.kind)
        || b.stake - a.stake
        || a.updatedAt.localeCompare(b.updatedAt),
    );

    const markets: PickemDetailMarket[] = views.map(view => ({
        id: view.id,
        kind: view.kind,
        status: view.status,
        resultOutcome: view.resultOutcome,
        pool: view.pool,
        outcomes: view.outcomes.map(o => {
            const own = p.picks.filter(pick => pick.marketId === view.id && pick.outcomeKey === o.key);
            return {
                key: o.key,
                label: o.label,
                odds: o.odds,
                staked: o.staked,
                picks: own.length,
                paysIfWins: own.reduce((sum, pick) => sum + payoutFor(pick.stake, o.odds), 0),
            };
        }),
    }));

    return {
        matchId: p.match.id,
        markets,
        picks,
        namesMissing: picks.some(pick => !p.names.get(pick.robloxUserId)?.username),
    };
}
