import {describe, expect, it} from "vitest";
import {buildSettlePreview} from "../buildSettlePreview";
import type {PickemMatchSource, PickemSettleRowSource} from "../../types";

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

function row(overrides: Partial<PickemSettleRowSource>): PickemSettleRowSource {
    return {
        matchId: "m1",
        marketId: "win",
        kind: "winner",
        outcomeKey: "home",
        result: "win",
        forfeit: false,
        picks: 0,
        staked: 0,
        finalOdds: 1.5,
        payout: 0,
        ...overrides,
    };
}

describe("buildSettlePreview", () => {
    const preview = buildSettlePreview(
        [
            row({marketId: "len", kind: "match_length", outcomeKey: "2-0", result: "loss", picks: 1, staked: 100, finalOdds: 1.7}),
            row({marketId: "len", kind: "match_length", outcomeKey: "2-1", result: "win", picks: 2, staked: 300, finalOdds: 2.1, payout: 630}),
            row({outcomeKey: "home", result: "win", picks: 3, staked: 500, finalOdds: 1.38, payout: 690}),
            row({outcomeKey: "away", result: "loss", picks: 1, staked: 200, finalOdds: 3.02}),
        ],
        [MATCH],
        [
            {marketId: "win", key: "home", label: "Home", sortOrder: 0, startProb: 0.65},
            {marketId: "len", key: "2-1", label: "2-1", sortOrder: 1, startProb: 0.5},
        ],
    );

    it("puts the winner market first and labels its outcomes with team names", () => {
        const [match] = preview.matches;
        expect(match.markets.map(m => m.kind)).toEqual(["winner", "match_length"]);
        expect(match.markets[0].outcomes.map(o => o.label)).toEqual(["Saints", "Mapua"]);
        expect(match.markets[1].outcomes.map(o => o.label)).toEqual(["2-0", "2-1"]);
    });

    it("totals stakes and payouts per market and overall", () => {
        const [winner, length] = preview.matches[0].markets;
        expect([winner.staked, winner.paid]).toEqual([700, 690]);
        expect([length.staked, length.paid]).toEqual([400, 630]);
        expect([preview.staked, preview.paid]).toEqual([1100, 1320]);
    });

    it("flags a forfeit and skips matches with no rows", () => {
        const forfeit = buildSettlePreview(
            [row({result: "refund", forfeit: true, finalOdds: null, staked: 50, payout: 50})],
            [MATCH, {...MATCH, id: "m2"}],
            [],
        );
        expect(forfeit.matches.map(m => [m.matchId, m.forfeit])).toEqual([["m1", true]]);
    });
});
