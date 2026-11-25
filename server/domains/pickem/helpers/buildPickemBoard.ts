import {PICKEM_MARKET_KINDS} from "../types/schemas";
import type {
    PickemBoard,
    PickemMarketSource,
    PickemMarketView,
    PickemMatchRow,
    PickemMatchSource,
    PickemMatchState,
    PickemOddsSource,
    PickemOutcomeSource,
    PickemSettings,
} from "../types";

export function publishBlockReason(match: PickemMatchSource, now: Date): string | null {
    if (match.status === "completed") return "Already played";
    if (!match.home || !match.away) return "Teams not set";
    if (!match.scheduledAt) return "No scheduled time";
    if (new Date(match.scheduledAt).getTime() <= now.getTime()) return "Start time has passed";
    return null;
}

export function isPickemLocked(match: PickemMatchSource, now: Date): boolean {
    if (match.status === "completed" || !match.scheduledAt || !match.home || !match.away) return true;
    return new Date(match.scheduledAt).getTime() <= now.getTime();
}

export function matchState(match: PickemMatchSource, hasMarkets: boolean, now: Date): PickemMatchState {
    if (hasMarkets) return isPickemLocked(match, now) ? "locked" : "open";
    return publishBlockReason(match, now) ? "unpublishable" : "unpublished";
}

export function compareMatches(a: PickemMatchSource, b: PickemMatchSource): number {
    const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
    const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
    if (at !== bt) return at - bt;
    return (a.week ?? Infinity) - (b.week ?? Infinity) || (a.matchCode ?? "").localeCompare(b.matchCode ?? "");
}

export function buildMarketViews(
    markets: PickemMarketSource[],
    outcomes: PickemOutcomeSource[],
    odds: PickemOddsSource[],
    teamLabel: (key: string) => string | null,
): PickemMarketView[] {
    const oddsByKey = new Map(odds.map(o => [`${o.marketId}:${o.outcomeKey}`, o]));
    return markets.map(market => {
        const own = outcomes
            .filter(o => o.marketId === market.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(o => {
                const live = oddsByKey.get(`${market.id}:${o.key}`);
                return {
                    key: o.key,
                    label: market.kind === "winner" ? teamLabel(o.key) ?? o.label : o.label,
                    startProb: o.startProb,
                    staked: live?.staked ?? 0,
                    odds: live?.odds ?? 0,
                };
            });
        const pool = own.reduce((sum, o) => sum + o.staked, 0);
        return {id: market.id, kind: market.kind, status: market.status, pool, outcomes: own};
    }).sort((a, b) => PICKEM_MARKET_KINDS.indexOf(a.kind) - PICKEM_MARKET_KINDS.indexOf(b.kind));
}

export function buildPickemBoard(p: {
    settings: PickemSettings;
    matches: PickemMatchSource[];
    markets: PickemMarketSource[];
    outcomes: PickemOutcomeSource[];
    odds: PickemOddsSource[];
    now: Date;
}): PickemBoard {
    const marketsByMatch = new Map<string, PickemMarketSource[]>();
    for (const market of p.markets) {
        marketsByMatch.set(market.matchId, [...(marketsByMatch.get(market.matchId) ?? []), market]);
    }

    const rows: PickemMatchRow[] = p.matches
        .filter(match => match.status !== "completed" || marketsByMatch.has(match.id))
        .sort(compareMatches)
        .map(match => {
            const markets = marketsByMatch.get(match.id) ?? [];
            const state = matchState(match, markets.length > 0, p.now);
            const teamLabel = (key: string) => key === "home" ? match.home?.name ?? null : key === "away" ? match.away?.name ?? null : null;
            return {
                matchId: match.id,
                matchCode: match.matchCode,
                matchType: match.matchType,
                week: match.week,
                bestOf: match.bestOf,
                scheduledAt: match.scheduledAt,
                lockAt: match.scheduledAt,
                home: match.home,
                away: match.away,
                state,
                blockedReason: state === "unpublishable" ? publishBlockReason(match, p.now) : null,
                markets: buildMarketViews(markets, p.outcomes, p.odds, teamLabel),
            };
        });

    return {settings: p.settings, matches: rows};
}
