import {describe, expect, it} from "vitest";
import {toOpenPickems, type OpenPickemMatch} from "../toOpenPickems";
import {OpenPickemsResponseSchema} from "../../types/gameSchemas";

const NOW = new Date("2026-11-25T12:00:00Z");

function match(overrides: Partial<OpenPickemMatch>): OpenPickemMatch {
    return {
        id: "m1",
        matchCode: "W4-M1",
        matchType: "season",
        status: "scheduled",
        week: 4,
        bestOf: 3,
        scheduledAt: "2026-11-26T18:00:00Z",
        home: {id: "t1", name: "Saints", logoUrl: "https://cdn.cvrn.net/saints.png"},
        away: {id: "t2", name: "Mapua", logoUrl: null},
        result: null,
        region: "NA",
        seasonNumber: 3,
        ...overrides,
    };
}

describe("toOpenPickems", () => {
    const response = toOpenPickems({
        now: NOW,
        stakeMin: 1,
        stakeMax: 1000,
        matches: [
            match({id: "late", scheduledAt: "2026-11-27T18:00:00Z"}),
            match({id: "m1"}),
            match({id: "past", scheduledAt: "2026-11-25T10:00:00Z"}),
            match({id: "no-markets"}),
        ],
        markets: [
            {id: "w1", matchId: "m1", kind: "winner", status: "open", resultOutcome: null},
            {id: "l1", matchId: "m1", kind: "match_length", status: "open", resultOutcome: null},
            {id: "w2", matchId: "late", kind: "winner", status: "open", resultOutcome: null},
            {id: "w3", matchId: "past", kind: "winner", status: "open", resultOutcome: null},
        ],
        outcomes: [
            {marketId: "w1", key: "home", label: "Home", sortOrder: 0, startProb: 0.6},
            {marketId: "w1", key: "away", label: "Away", sortOrder: 1, startProb: 0.4},
            {marketId: "l1", key: "2-0", label: "2-0", sortOrder: 0, startProb: 0.5},
            {marketId: "l1", key: "2-1", label: "2-1", sortOrder: 1, startProb: 0.5},
            {marketId: "w2", key: "home", label: "Home", sortOrder: 0, startProb: 0.5},
            {marketId: "w2", key: "away", label: "Away", sortOrder: 1, startProb: 0.5},
            {marketId: "w3", key: "home", label: "Home", sortOrder: 0, startProb: 0.5},
            {marketId: "w3", key: "away", label: "Away", sortOrder: 1, startProb: 0.5},
        ],
        odds: [
            {marketId: "w1", outcomeKey: "home", staked: 300, pool: 300, odds: 1.4},
            {marketId: "w1", outcomeKey: "away", staked: 0, pool: 300, odds: 2.68},
        ],
        picks: [{id: "p1", marketId: "w1", outcomeKey: "home", stake: 300}],
    });

    it("matches the documented response schema", () => {
        expect(OpenPickemsResponseSchema.safeParse(response).success).toBe(true);
    });

    it("lists published matches by start time and drops matches with no markets", () => {
        expect(response.pickems.map(p => p.match_id)).toEqual(["past", "m1", "late"]);
    });

    it("marks a match locked once its start time has passed", () => {
        expect(response.pickems.map(p => p.locked)).toEqual([true, false, false]);
        expect(response.pickems[1].lock_at).toBe("2026-11-26T18:00:00Z");
    });

    it("labels markets and winner outcomes for the game and carries the player's pick", () => {
        const [winner, length] = response.pickems[1].markets;
        expect(winner).toEqual({
            market_id: "w1",
            kind: "winner",
            label: "Winner",
            line: null,
            pool: 300,
            outcomes: [{key: "home", label: "Saints", odds: 1.4}, {key: "away", label: "Mapua", odds: 2.68}],
            my_pick: {pick_id: "p1", outcome: "home", stake: 300},
        });
        expect(length.label).toBe("Match length");
        expect(length.my_pick).toBeNull();
    });

    it("reports the stake limits and the server clock", () => {
        expect(response.stake_min).toBe(1);
        expect(response.stake_max).toBe(1000);
        expect(response.server_time).toBe(NOW.toISOString());
    });
});
