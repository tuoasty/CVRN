import type {
    PickemActivityEntry,
    PickemActivityRowSource,
    PickemMatchSource,
    RobloxName,
} from "../types";
import {MARKET_LABELS} from "./toOpenPickems";

export function matchName(match: PickemMatchSource | undefined): string {
    if (!match) return "Unknown match";
    return `${match.home?.name ?? "TBD"} vs ${match.away?.name ?? "TBD"}`;
}

function stringList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function count(target: Record<string, unknown> | null, key: string): number {
    const list = stringList(target?.[key]);
    if (list.length > 0) return list.length;
    const counted = target?.[`${key}Count`];
    return typeof counted === "number" ? counted : 0;
}

function plural(n: number, word: string): string {
    return `${n} ${word}${n === 1 ? "" : "es"}`;
}

export function activityMatchIds(row: PickemActivityRowSource): string[] {
    if (row.source === "game") return row.matchId ? [row.matchId] : [];
    return stringList(row.target?.matchIds);
}

export function activityMarketIds(row: PickemActivityRowSource): string[] {
    return row.source === "admin" ? stringList(row.target?.marketIds) : [];
}

function adminSummary(row: PickemActivityRowSource, matchCount: number): string {
    const target = row.target;
    switch (row.action) {
        case "publishPickemMatches": {
            const n = count(target, "matchIds");
            return n === 1 ? "Published" : `Published ${plural(n, "match")}`;
        }
        case "settlePickemMatches": {
            const n = count(target, "matchIds");
            return n === 1 ? "Settled" : `Settled ${plural(n, "match")}`;
        }
        case "refundPickemMarkets": {
            const n = count(target, "marketIds");
            return matchCount <= 1 ? `Refunded ${n} market${n === 1 ? "" : "s"}` : `Refunded ${n} markets across ${plural(matchCount, "match")}`;
        }
        case "updatePickemSettings": {
            const parts = [
                typeof target?.seed === "number" ? `seed ${target.seed}` : null,
                typeof target?.rake === "number" ? `rake ${target.rake}` : null,
                typeof target?.stakeMin === "number" && typeof target?.stakeMax === "number" ? `stakes ${target.stakeMin} to ${target.stakeMax}` : null,
            ].filter(Boolean);
            return parts.length > 0 ? `Saved settings (${parts.join(", ")})` : "Saved settings";
        }
        default:
            return row.action ?? "Unknown action";
    }
}

export function buildActivityEntries(p: {
    rows: PickemActivityRowSource[];
    matches: Map<string, PickemMatchSource>;
    marketMatch: Map<string, string>;
    names: Map<string, RobloxName>;
}): PickemActivityEntry[] {
    return p.rows.map(row => {
        const key = `${row.source}:${row.id}`;
        if (row.source === "admin") {
            const matchIds = [...new Set([
                ...activityMatchIds(row),
                ...activityMarketIds(row).flatMap(id => p.marketMatch.get(id) ?? []),
            ])];
            return {
                source: "admin" as const,
                key,
                createdAt: row.createdAt,
                actor: row.actorName,
                summary: adminSummary(row, matchIds.length),
                denied: row.actionOutcome === "denied",
                matches: matchIds.map(id => matchName(p.matches.get(id))),
            };
        }

        const match = row.matchId ? p.matches.get(row.matchId) : undefined;
        const label = (outcomeKey: string | null) => {
            if (outcomeKey === null) return null;
            if (row.marketKind !== "winner") return outcomeKey;
            if (outcomeKey === "home") return match?.home?.name ?? "Home";
            if (outcomeKey === "away") return match?.away?.name ?? "Away";
            return outcomeKey;
        };
        return {
            source: "game" as const,
            key,
            createdAt: row.createdAt,
            kind: row.eventKind ?? "placed",
            robloxUserId: row.robloxUserId ?? "",
            username: row.robloxUserId ? p.names.get(row.robloxUserId)?.username ?? null : null,
            matchTitle: matchName(match),
            marketLabel: row.marketKind ? MARKET_LABELS[row.marketKind] : "Market",
            outcomeLabel: label(row.outcomeKey) ?? "",
            previousOutcomeLabel: label(row.previousOutcomeKey),
            stake: row.stake ?? 0,
            previousStake: row.previousStake,
            charged: row.charged,
            payout: row.payout,
        };
    });
}
