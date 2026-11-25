import {describe, expect, it} from "vitest";
import {buildMatchDetail} from "../buildMatchDetail";
import type {PickemDetailPickSource, PickemMatchSource} from "../../types";

const MATCH: PickemMatchSource = {
    id: "m1",
    matchCode: "W1-M1",
    matchType: "season",
    status: "scheduled",
    week: 1,
    bestOf: 3,
    scheduledAt: "2026-11-26T18:00:00Z",
    home: {id: "t1", name: "Saints", logoUrl: null},
    away: {id: "t2", name: "Mapua", logoUrl: null},
    result: null,
};

function pick(overrides: Partial<PickemDetailPickSource>): PickemDetailPickSource {
    return {
        id: "p",
        marketId: "win",
        robloxUserId: "1",
        outcomeKey: "home",
        stake: 100,
        payout: null,
        claimedAt: null,
        updatedAt: "2026-11-25T10:00:00Z",
        ...overrides,
    };
}

const OUTCOMES = [
    {marketId: "win", key: "home", label: "Home", sortOrder: 0, startProb: 0.6},
    {marketId: "win", key: "away", label: "Away", sortOrder: 1, startProb: 0.4},
    {marketId: "len", key: "2-0", label: "2-0", sortOrder: 0, startProb: 0.5},
    {marketId: "len", key: "2-1", label: "2-1", sortOrder: 1, startProb: 0.5},
];

const ODDS = [
    {marketId: "win", outcomeKey: "home", staked: 400, pool: 500, odds: 1.38},
    {marketId: "win", outcomeKey: "away", staked: 100, pool: 500, odds: 3.02},
    {marketId: "len", outcomeKey: "2-0", staked: 50, pool: 50, odds: 1.7},
    {marketId: "len", outcomeKey: "2-1", staked: 0, pool: 50, odds: 2.1},
];

describe("buildMatchDetail", () => {
    it("shows open picks with the payout they get if their outcome wins", () => {
        const detail = buildMatchDetail({
            match: MATCH,
            markets: [
                {id: "win", matchId: "m1", kind: "winner", status: "open", resultOutcome: null},
                {id: "len", matchId: "m1", kind: "match_length", status: "open", resultOutcome: null},
            ],
            outcomes: OUTCOMES,
            odds: ODDS,
            picks: [
                pick({id: "a", stake: 150}),
                pick({id: "b", stake: 250, robloxUserId: "2"}),
                pick({id: "c", outcomeKey: "away", robloxUserId: "3"}),
                pick({id: "d", marketId: "len", outcomeKey: "2-0", stake: 50}),
            ],
            names: new Map([["1", {username: "alpha", displayName: "Alpha"}], ["2", {username: "bravo", displayName: "bravo"}]]),
        });

        expect(detail.picks.map(p => [p.pickId, p.outcomeLabel, p.status, p.payout])).toEqual([
            ["b", "Saints", "open", 345],
            ["a", "Saints", "open", 207],
            ["c", "Mapua", "open", 302],
            ["d", "2-0", "open", 85],
        ]);
        const home = detail.markets[0].outcomes[0];
        expect([home.picks, home.staked, home.paysIfWins]).toEqual([2, 400, 552]);
        expect(detail.namesMissing).toBe(true);
    });

    it("uses stored payouts once a market is settled or refunded", () => {
        const detail = buildMatchDetail({
            match: MATCH,
            markets: [
                {id: "win", matchId: "m1", kind: "winner", status: "settled", resultOutcome: "home"},
                {id: "len", matchId: "m1", kind: "match_length", status: "refunded", resultOutcome: null},
            ],
            outcomes: OUTCOMES,
            odds: ODDS,
            picks: [
                pick({id: "a", stake: 400, payout: 552, claimedAt: "2026-11-27T10:00:00Z"}),
                pick({id: "c", outcomeKey: "away", payout: 0}),
                pick({id: "d", marketId: "len", outcomeKey: "2-0", stake: 50, payout: 50}),
            ],
            names: new Map([["1", {username: "alpha", displayName: "Alpha"}]]),
        });

        expect(detail.picks.map(p => [p.pickId, p.status, p.payout, p.claimedAt])).toEqual([
            ["a", "won", 552, "2026-11-27T10:00:00Z"],
            ["c", "lost", 0, null],
            ["d", "refunded", 50, null],
        ]);
        expect(detail.namesMissing).toBe(false);
    });
});
