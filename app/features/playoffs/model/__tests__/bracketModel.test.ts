import {describe, expect, it} from "vitest";
import type {Match, PlayoffBracket} from "@/shared/types/db";
import {findChampion, isResetUnneeded, pruneBracketReset, type BracketEntry} from "../bracketModel";

function entry(
    id: string,
    round: string,
    m: {status?: string; home?: string | null; away?: string | null; hs?: number | null; as?: number | null} = {},
): BracketEntry {
    const bracket = {
        id,
        round,
        match_id: `m-${id}`,
        season_id: "s1",
        created_at: "2026-01-01T00:00:00Z",
        display_order: 1,
        loser_next_bracket_id: null,
        loser_position: null,
        next_bracket_id: null,
        playoff_group: "main",
        seed_away: null,
        seed_home: null,
        winner_position: null,
    } as PlayoffBracket;
    const match = {
        id: `m-${id}`,
        status: m.status ?? "pending",
        home_team_id: m.home === undefined ? "home" : m.home,
        away_team_id: m.away === undefined ? "away" : m.away,
        home_sets_won: m.hs ?? null,
        away_sets_won: m.as ?? null,
    } as unknown as Match;
    return {...bracket, match};
}

const sf = entry("sf", "semifinal", {status: "completed", hs: 3, as: 0});

describe("isResetUnneeded", () => {
    it("is true when the grand final home team won", () => {
        expect(isResetUnneeded([entry("gf", "grand_final", {status: "completed", hs: 3, as: 1})])).toBe(true);
    });

    it("is false when the grand final away team won", () => {
        expect(isResetUnneeded([entry("gf", "grand_final", {status: "completed", hs: 1, as: 3})])).toBe(false);
    });

    it("is false when the grand final is not completed", () => {
        expect(isResetUnneeded([entry("gf", "grand_final", {status: "scheduled"})])).toBe(false);
    });
});

describe("pruneBracketReset", () => {
    it("removes the bracket reset when the grand final home team won 3-1", () => {
        const out = pruneBracketReset([sf, entry("gf", "grand_final", {status: "completed", hs: 3, as: 1}), entry("br", "bracket_reset")]);
        expect(out.map((e) => e.id)).toEqual(["sf", "gf"]);
    });

    it("keeps the bracket reset when the grand final away team won 1-3", () => {
        const out = pruneBracketReset([sf, entry("gf", "grand_final", {status: "completed", hs: 1, as: 3}), entry("br", "bracket_reset")]);
        expect(out.map((e) => e.id)).toEqual(["sf", "gf", "br"]);
    });

    it("keeps the bracket reset when the grand final is scheduled", () => {
        const out = pruneBracketReset([entry("gf", "grand_final", {status: "scheduled"}), entry("br", "bracket_reset")]);
        expect(out.map((e) => e.id)).toEqual(["gf", "br"]);
    });
});

describe("findChampion", () => {
    it("returns the grand final home team when the home team won", () => {
        const out = findChampion([
            entry("gf", "grand_final", {status: "completed", home: "upper", away: "lower", hs: 3, as: 2}),
            entry("br", "bracket_reset", {home: null, away: null}),
        ]);
        expect(out).toEqual({bracketId: "gf", teamId: "upper"});
    });

    it("returns null when the grand final away team won and the reset is scheduled", () => {
        const out = findChampion([
            entry("gf", "grand_final", {status: "completed", home: "upper", away: "lower", hs: 1, as: 3}),
            entry("br", "bracket_reset", {status: "scheduled", home: "lower", away: "upper"}),
        ]);
        expect(out).toBeNull();
    });

    it("returns the bracket reset winner once the reset is completed", () => {
        const out = findChampion([
            entry("gf", "grand_final", {status: "completed", home: "upper", away: "lower", hs: 1, as: 3}),
            entry("br", "bracket_reset", {status: "completed", home: "upper", away: "lower", hs: 2, as: 3}),
        ]);
        expect(out).toEqual({bracketId: "br", teamId: "lower"});
    });

    it("returns the final winner for a single elimination bracket", () => {
        const out = findChampion([
            sf,
            entry("f", "final", {status: "completed", home: "a", away: "b", hs: 0, as: 3}),
            entry("tp", "third_place", {status: "completed", home: "c", away: "d", hs: 3, as: 0}),
        ]);
        expect(out).toEqual({bracketId: "f", teamId: "b"});
    });

    it("returns null when nothing is decided", () => {
        expect(findChampion([sf, entry("f", "final", {status: "scheduled"})])).toBeNull();
        expect(findChampion([])).toBeNull();
    });
});
