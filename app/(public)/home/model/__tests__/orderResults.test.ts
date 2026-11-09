import {describe, expect, it} from "vitest";
import {orderResults} from "../orderResults";
import {makeMatch} from "./fixtures";

function done(scheduledAt: string | null, o: Parameters<typeof makeMatch>[0] = {}) {
    return makeMatch({status: "completed", scheduled_at: scheduledAt, home_sets_won: 3, away_sets_won: 1, ...o});
}

describe("orderResults", () => {
    it("newest first by date", () => {
        const old = done("2026-10-20T19:00:00Z");
        const mid = done("2026-11-01T19:00:00Z");
        const recent = done("2026-11-10T19:00:00Z");
        const out = orderResults([old, recent, mid], "regular");
        expect(out.map(m => m.match.id)).toEqual([recent.match.id, mid.match.id, old.match.id]);
    });

    it("a thin latest week tops up with older matches to 10", () => {
        const older = Array.from({length: 12}, (_, i) => done(`2026-11-${String(i + 1).padStart(2, "0")}T19:00:00Z`, {week: 1}));
        const latest = done("2026-11-14T19:00:00Z", {week: 2});
        const out = orderResults([...older, latest], "regular");
        expect(out).toHaveLength(10);
        expect(out[0].match.id).toBe(latest.match.id);
    });

    it("shows the whole latest week even past 10", () => {
        const week2 = Array.from({length: 15}, (_, i) => done(`2026-11-${String(i + 10).padStart(2, "0")}T19:00:00Z`, {week: 2}));
        const week1 = Array.from({length: 5}, (_, i) => done(`2026-11-0${i + 1}T19:00:00Z`, {week: 1}));
        const out = orderResults([...week1, ...week2], "regular");
        expect(out).toHaveLength(15);
        expect(out.every(m => m.match.week === 2)).toBe(true);
    });

    it("keeps the latest week together when an older week's match was played later", () => {
        const late = done("2026-11-13T19:00:00Z", {week: 1});
        const week2 = Array.from({length: 11}, (_, i) => done(`2026-11-${String(i + 10).padStart(2, "0")}T12:00:00Z`, {week: 2}));
        const out = orderResults([late, ...week2], "regular");
        expect(out).toHaveLength(11);
        expect(out.some(m => m.match.id === late.match.id)).toBe(false);
    });

    it("playoff rounds are the unit in playoffs", () => {
        const grand = done("2026-11-14T19:00:00Z", {match_type: "playoffs", round: "grand_final"});
        const semis = Array.from({length: 12}, (_, i) => done(`2026-11-${String(i + 1).padStart(2, "0")}T19:00:00Z`, {match_type: "playoffs", round: "semifinal"}));
        const out = orderResults([...semis, grand], "playoffs");
        expect(out).toHaveLength(10);
        expect(out[0].match.id).toBe(grand.match.id);
    });

    it("undated matches sort last", () => {
        const undated = done(null);
        const dated = done("2026-11-01T19:00:00Z");
        expect(orderResults([undated, dated], "playoffs").map(m => m.match.id)).toEqual([dated.match.id, undated.match.id]);
    });

    it("completed phase keeps only playoff matches, newest first", () => {
        const season = done("2026-11-10T19:00:00Z");
        const semi = done("2026-11-05T19:00:00Z", {match_type: "playoffs", round: "upper_final"});
        const grand = done("2026-11-07T19:00:00Z", {match_type: "playoffs", round: "grand_final"});
        const out = orderResults([season, semi, grand], "completed");
        expect(out.map(m => m.match.id)).toEqual([grand.match.id, semi.match.id]);
    });
});
