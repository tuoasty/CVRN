import {describe, expect, it} from "vitest";
import {bulkPublishCandidates, formatChance, formatLockIn, formatOdds, matchTitle} from "../pickemFormat";
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
