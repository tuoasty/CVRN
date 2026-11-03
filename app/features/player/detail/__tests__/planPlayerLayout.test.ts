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
            matches: flags.includes("m"),
            teams: flags.includes("t"),
        });
        expect(layout).toEqual({beside: expand(beside), below: expand(below)});
    });

    it("keeps achievements and awards together beside one card when there are no matches", () => {
        const layout = planPlayerLayout({cards: 1, achievements: true, awards: true, matches: false, teams: false});
        expect(layout).toEqual({beside: expand(["aw", "h"]), below: []});
    });

    it("drops an empty below column beside one card", () => {
        const layout = planPlayerLayout({cards: 1, achievements: true, awards: false, matches: true, teams: false});
        expect(layout).toEqual({beside: expand(["m", "h"]), below: expand(["a"])});
    });

    it("keeps awards beside two cards when there are no matches", () => {
        const layout = planPlayerLayout({cards: 2, achievements: true, awards: true, matches: false, teams: true});
        expect(layout).toEqual({beside: expand(["aw"]), below: expand(["ht"])});
    });
});
