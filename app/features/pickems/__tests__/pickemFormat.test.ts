import {describe, expect, it} from "vitest";
import {bulkPublishCandidates, canSettle, formatChance, formatLockIn, formatOdds, formatResult, matchTitle, openMarketIds} from "../pickemFormat";
import type {PickemMatchRow} from "@/server/domains/pickem";

const NOW = new Date("2026-11-25T12:00:00Z");

function row(overrides: Partial<PickemMatchRow>): PickemMatchRow {
    return {
        matchId: "m",
        matchCode: null,
        matchType: "season",
        week: 1,
        bestOf: 3,
        scheduledAt: "2026-11-26T12:00:00Z",
        lockAt: "2026-11-26T12:00:00Z",
        home: {id: "h", name: "Saints", logoUrl: null},
        away: {id: "a", name: "Mapua", logoUrl: null},
        result: null,
        state: "unpublished",
        blockedReason: null,
        markets: [],
        ...overrides,
    };
}

describe("formatLockIn", () => {
    it("counts down in the largest two units", () => {
        expect(formatLockIn("2026-11-27T16:30:00Z", NOW)).toBe("locks in 2d 4h");
        expect(formatLockIn("2026-11-25T15:20:00Z", NOW)).toBe("locks in 3h 20m");
        expect(formatLockIn("2026-11-25T12:12:30Z", NOW)).toBe("locks in 12m");
    });

    it("never shows zero minutes before the lock and says locked after it", () => {
        expect(formatLockIn("2026-11-25T12:00:20Z", NOW)).toBe("locks in 1m");
        expect(formatLockIn("2026-11-25T12:00:00Z", NOW)).toBe("locked");
    });
});

describe("formatOdds and formatChance", () => {
    it("shows odds to 2 decimals and chances as whole percents", () => {
        expect(formatOdds(1.9)).toBe("1.90");
        expect(formatChance(0.76394)).toBe("76%");
    });
});

describe("bulkPublishCandidates", () => {
    it("takes unpublished matches starting within the next 7 days", () => {
        const rows = [
            row({matchId: "soon"}),
            row({matchId: "late", scheduledAt: "2026-12-03T12:00:01Z"}),
            row({matchId: "open", state: "open"}),
            row({matchId: "blocked", state: "unpublishable", scheduledAt: null}),
        ];
        expect(bulkPublishCandidates(rows, NOW).map(r => r.matchId)).toEqual(["soon"]);
    });
});

describe("matchTitle", () => {
    it("names both teams and falls back to TBD", () => {
        expect(matchTitle(row({}))).toBe("Saints vs Mapua");
        expect(matchTitle(row({away: null}))).toBe("Saints vs TBD");
    });
});

describe("canSettle", () => {
    const result = {homeSets: 2, awaySets: 0, forfeit: false};

    it("needs a result and at least one open market", () => {
        expect(canSettle(row({state: "awaiting_settlement", result}))).toBe(true);
        expect(canSettle(row({state: "partly_settled", result}))).toBe(true);
        expect(canSettle(row({state: "partly_settled", result: null}))).toBe(false);
        expect(canSettle(row({state: "settled", result}))).toBe(false);
        expect(canSettle(row({state: "locked", result: null}))).toBe(false);
    });
});

describe("openMarketIds and formatResult", () => {
    it("lists only open markets and prints the set score or forfeit", () => {
        const market = (id: string, status: "open" | "settled") => ({id, kind: "winner" as const, status, resultOutcome: null, pool: 0, outcomes: []});
        expect(openMarketIds(row({markets: [market("a", "open"), market("b", "settled")]}))).toEqual(["a"]);
        expect(formatResult(row({result: {homeSets: 1, awaySets: 2, forfeit: false}}))).toBe("1-2");
        expect(formatResult(row({result: {homeSets: 0, awaySets: 2, forfeit: true}}))).toBe("Forfeit");
        expect(formatResult(row({}))).toBeNull();
    });
});
