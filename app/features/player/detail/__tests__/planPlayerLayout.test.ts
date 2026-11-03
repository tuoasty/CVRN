import {describe, expect, it} from "vitest";
import {planPlayerLayout, type SectionKey} from "../planPlayerLayout";

const KEYS: Record<string, SectionKey> = {m: "matches", h: "honours", a: "achievements", w: "awards", t: "teams"};

function expand(columns: string[]): SectionKey[][] {
    return columns.map(column => column.split("").map(letter => KEYS[letter]));
}

type Case = [cards: number, flags: string, beside: string[], below: string[]];

const CASES: Case[] = [
    [1, "awmt", ["m", "h"], ["aw", "t"]],
    [1, "mt", ["m", "t"], []],
    [1, "at", ["a", "ht"], []],
    [1, "", [], []],
    [2, "awmt", ["m"], ["aw", "ht"]],
    [2, "mt", ["m"], ["t"]],
    [3, "at", ["a"], ["ht"]],
    [2, "t", ["t"], []],
    [0, "awmt", [], ["maw", "ht"]],
    [0, "mt", [], ["m", "t"]],
    [0, "t", [], ["t"]],
    [0, "", [], []],
];

describe("planPlayerLayout", () => {
    it.each(CASES)("%i cards with %s", (cards, flags, beside, below) => {
        const layout = planPlayerLayout({
            cards,
            achievements: flags.includes("a"),
            awards: flags.includes("w"),
            honours: flags.includes("a") || flags.includes("w"),
            matches: flags.includes("m"),
            teams: flags.includes("t"),
        });
        expect(layout).toEqual({beside: expand(beside), below: expand(below)});
    });

    it("keeps achievements and awards together beside one card when there are no matches", () => {
        const layout = planPlayerLayout({cards: 1, achievements: true, awards: true, honours: true, matches: false, teams: false});
        expect(layout).toEqual({beside: expand(["aw", "h"]), below: []});
    });

    it("drops an empty below column beside one card", () => {
        const layout = planPlayerLayout({cards: 1, achievements: true, awards: false, honours: true, matches: true, teams: false});
        expect(layout).toEqual({beside: expand(["m", "h"]), below: expand(["a"])});
    });

    it("keeps awards beside two cards when there are no matches", () => {
        const layout = planPlayerLayout({cards: 2, achievements: true, awards: true, honours: true, matches: false, teams: true});
        expect(layout).toEqual({beside: expand(["aw"]), below: expand(["ht"])});
    });

    it("never drops honours beside two cards when nothing else is there", () => {
        const layout = planPlayerLayout({cards: 2, achievements: false, awards: false, honours: true, matches: false, teams: true});
        expect(layout).toEqual({beside: expand(["ht"]), below: []});
    });

    describe("with only placements below first, so no honours", () => {
        const base = {achievements: true, awards: false, honours: false, teams: true};

        it("keeps achievements below matches and team history beside one card", () => {
            expect(planPlayerLayout({...base, cards: 1, matches: true})).toEqual({beside: expand(["m", "t"]), below: expand(["a"])});
        });

        it("puts achievements and team history beside one card with no matches", () => {
            expect(planPlayerLayout({...base, cards: 1, matches: false})).toEqual({beside: expand(["a", "t"]), below: []});
        });

        it("keeps achievements beside two cards with no matches", () => {
            expect(planPlayerLayout({...base, cards: 2, matches: false})).toEqual({beside: expand(["a"]), below: expand(["t"])});
        });

        it("shows no honours section with no cards", () => {
            expect(planPlayerLayout({...base, cards: 0, matches: true})).toEqual({beside: [], below: expand(["ma", "t"])});
        });
    });
});
