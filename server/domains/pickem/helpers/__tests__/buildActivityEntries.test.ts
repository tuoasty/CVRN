import {describe, expect, it} from "vitest";
import {buildActivityEntries} from "../buildActivityEntries";
import type {PickemActivityRowSource, PickemMatchSource} from "../../types";

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

function row(overrides: Partial<PickemActivityRowSource>): PickemActivityRowSource {
    return {
        source: "game",
        id: 1,
        createdAt: "2026-11-25T12:00:00.123456+00:00",
        action: null,
        actionOutcome: null,
        actorName: null,
        target: null,
        eventKind: "placed",
        matchId: "m1",
        marketKind: "winner",
        robloxUserId: "42",
        outcomeKey: "home",
        previousOutcomeKey: null,
        stake: 300,
        previousStake: null,
        charged: 300,
        payout: null,
        ...overrides,
    };
}

const build = (rows: PickemActivityRowSource[]) => buildActivityEntries({
    rows,
    matches: new Map([["m1", MATCH]]),
    marketMatch: new Map([["mk1", "m1"], ["mk2", "m1"]]),
    names: new Map([["42", {username: "alpha", displayName: "Alpha"}]]),
});

describe("buildActivityEntries", () => {
    it("labels game events with the player, team names and market", () => {
        const [placed, changed] = build([
            row({}),
            row({id: 2, eventKind: "changed", outcomeKey: "away", previousOutcomeKey: "home", stake: 500, previousStake: 300, charged: 200}),
        ]);
        expect(placed).toMatchObject({source: "game", key: "game:1", username: "alpha", matchTitle: "Saints vs Mapua", marketLabel: "Winner", outcomeLabel: "Saints"});
        expect(changed).toMatchObject({outcomeLabel: "Mapua", previousOutcomeLabel: "Saints", stake: 500, previousStake: 300, charged: 200});
    });

    it("keeps length keys as they are", () => {
        const [entry] = build([row({marketKind: "match_length", outcomeKey: "2-1"})]);
        expect(entry).toMatchObject({marketLabel: "Match length", outcomeLabel: "2-1"});
    });

    it("summarizes admin actions and resolves their matches", () => {
        const [publish, refund, settings, denied] = build([
            row({source: "admin", id: 10, action: "publishPickemMatches", actionOutcome: "allowed", actorName: "Kevin", target: {seasonId: "s", matchIds: ["m1"]}}),
            row({source: "admin", id: 11, action: "refundPickemMarkets", actionOutcome: "allowed", actorName: "Kevin", target: {seasonId: "s", marketIds: ["mk1", "mk2"]}}),
            row({source: "admin", id: 12, action: "updatePickemSettings", actionOutcome: "allowed", actorName: "Kevin", target: {seed: 2000, rake: 0.05, stakeMin: 1, stakeMax: 1000}}),
            row({source: "admin", id: 13, action: "settlePickemMatches", actionOutcome: "denied", actorName: null, target: {seasonId: "s", matchIdsCount: 30}}),
        ]);
        expect(publish).toMatchObject({summary: "Published", matches: ["Saints vs Mapua"], denied: false});
        expect(refund).toMatchObject({summary: "Refunded 2 markets", matches: ["Saints vs Mapua"]});
        expect(settings).toMatchObject({summary: "Saved settings (seed 2000, rake 0.05, stakes 1 to 1000)", matches: []});
        expect(denied).toMatchObject({summary: "Settled 30 matches", denied: true, actor: null});
    });
});
