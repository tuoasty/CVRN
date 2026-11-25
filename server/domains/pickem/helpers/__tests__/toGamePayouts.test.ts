import {describe, expect, it} from "vitest";
import {toGamePayouts} from "../toGamePayouts";
import type {PickemMatchSource} from "../../types";

const MATCH: PickemMatchSource = {
    id: "m1",
    matchCode: "W1-M1",
    matchType: "season",
    status: "completed",
    week: 1,
    bestOf: 3,
    scheduledAt: "2026-11-24T18:00:00Z",
    home: {id: "t1", name: "Saints", logoUrl: null},
    away: {id: "t2", name: "Mapua", logoUrl: null},
    result: {homeSets: 2, awaySets: 1, forfeit: false},
};

const payouts = toGamePayouts({
    matches: [MATCH],
    markets: [
        {id: "win", matchId: "m1", kind: "winner", status: "settled", resultOutcome: "home"},
        {id: "len", matchId: "m1", kind: "match_length", status: "refunded", resultOutcome: null},
        {id: "open", matchId: "m1", kind: "winner", status: "open", resultOutcome: null},
    ],
    outcomes: [
        {marketId: "win", key: "home", label: "Home", sortOrder: 0, startProb: 0.6, finalOdds: 1.4},
        {marketId: "win", key: "away", label: "Away", sortOrder: 1, startProb: 0.4, finalOdds: 2.5},
        {marketId: "len", key: "2-0", label: "2-0", sortOrder: 0, startProb: 0.5, finalOdds: null},
    ],
    picks: [
        {id: "p1", marketId: "win", outcomeKey: "home", stake: 300, payout: 420},
        {id: "p2", marketId: "win", outcomeKey: "away", stake: 100, payout: 0},
        {id: "p3", marketId: "len", outcomeKey: "2-0", stake: 50, payout: 50},
        {id: "p4", marketId: "open", outcomeKey: "home", stake: 10, payout: 0},
    ],
});

describe("toGamePayouts", () => {
    it("marks wins, losses and refunds from the market status and result", () => {
        expect(payouts.map(p => [p.pick_id, p.result, p.payout])).toEqual([
            ["p1", "win", 420],
            ["p2", "loss", 0],
            ["p3", "refund", 50],
        ]);
    });

    it("shows team names on winner picks and hides odds on refunds", () => {
        expect(payouts.map(p => p.outcome_label)).toEqual(["Saints", "Mapua", "2-0"]);
        expect(payouts.map(p => p.final_odds)).toEqual([1.4, 2.5, null]);
        expect(payouts.map(p => p.result_outcome)).toEqual(["home", "home", null]);
    });
});
