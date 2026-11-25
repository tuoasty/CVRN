import {PICKEM_MARKET_KINDS} from "../types/schemas";
import {compareMatches} from "./buildPickemBoard";
import type {
    PickemMatchSource,
    PickemOutcomeSource,
    PickemSettleMarket,
    PickemSettleMatch,
    PickemSettlePreview,
    PickemSettleRowSource,
} from "../types";

export function buildSettlePreview(
    rows: PickemSettleRowSource[],
    matches: PickemMatchSource[],
    outcomes: PickemOutcomeSource[],
): PickemSettlePreview {
    const labels = new Map(outcomes.map(o => [`${o.marketId}:${o.key}`, o.label]));
    const byMatch = new Map<string, PickemSettleRowSource[]>();
    for (const row of rows) byMatch.set(row.matchId, [...(byMatch.get(row.matchId) ?? []), row]);

    const result: PickemSettleMatch[] = matches
        .filter(match => byMatch.has(match.id))
        .sort(compareMatches)
        .map(match => {
            const own = byMatch.get(match.id) ?? [];
            const teamLabel = (key: string) => key === "home" ? match.home?.name : key === "away" ? match.away?.name : undefined;
            const marketIds = [...new Set(own.map(r => r.marketId))];
            const markets: PickemSettleMarket[] = marketIds.map(marketId => {
                const marketRows = own.filter(r => r.marketId === marketId);
                const kind = marketRows[0].kind;
                return {
                    marketId,
                    kind,
                    staked: marketRows.reduce((sum, r) => sum + r.staked, 0),
                    paid: marketRows.reduce((sum, r) => sum + r.payout, 0),
                    outcomes: marketRows.map(r => ({
                        key: r.outcomeKey,
                        label: (kind === "winner" ? teamLabel(r.outcomeKey) : undefined) ?? labels.get(`${marketId}:${r.outcomeKey}`) ?? r.outcomeKey,
                        result: r.result,
                        picks: r.picks,
                        staked: r.staked,
                        finalOdds: r.finalOdds,
                        payout: r.payout,
                    })),
                };
            }).sort((a, b) => PICKEM_MARKET_KINDS.indexOf(a.kind) - PICKEM_MARKET_KINDS.indexOf(b.kind));
            return {
                matchId: match.id,
                matchCode: match.matchCode,
                home: match.home,
                away: match.away,
                forfeit: own.some(r => r.forfeit),
                markets,
            };
        });

    return {
        matches: result,
        staked: rows.reduce((sum, r) => sum + r.staked, 0),
        paid: rows.reduce((sum, r) => sum + r.payout, 0),
    };
}
