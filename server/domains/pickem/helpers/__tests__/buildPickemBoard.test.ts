import {describe, expect, it} from "vitest";
import {buildPickemBoard, isPickemLocked, matchState, publishBlockReason} from "../buildPickemBoard";
import type {PickemMatchSource, PickemSettings} from "../../types";

const NOW = new Date("2026-11-25T12:00:00Z");
const LATER = "2026-11-26T18:00:00Z";
const EARLIER = "2026-11-24T18:00:00Z";

const SETTINGS: PickemSettings = {seed: 2000, rake: 0.05, oddsFloor: 1, sigma: 5.5, shrinkSets: 6, probClamp: 0.03, stakeMin: 1, stakeMax: 1000, updatedAt: "2026-11-25T00:00:00Z"};
const HOME = {id: "t1", name: "Saints", logoUrl: null};
const AWAY = {id: "t2", name: "Mapua", logoUrl: null};

function match(overrides: Partial<PickemMatchSource> = {}): PickemMatchSource {
    return {
        id: "m1",
        matchCode: "W1-M1",
        matchType: "season",
        status: "scheduled",
        week: 1,
        bestOf: 3,
        scheduledAt: LATER,
        home: HOME,
        away: AWAY,
        ...overrides,
    };
}

describe("publishBlockReason", () => {
    it("allows a scheduled match with both teams and a future start", () => {
        expect(publishBlockReason(match(), NOW)).toBeNull();
    });

    it("names the first thing that blocks publishing", () => {
        expect(publishBlockReason(match({status: "completed"}), NOW)).toBe("Already played");
        expect(publishBlockReason(match({away: null}), NOW)).toBe("Teams not set");
        expect(publishBlockReason(match({scheduledAt: null}), NOW)).toBe("No scheduled time");
        expect(publishBlockReason(match({scheduledAt: EARLIER}), NOW)).toBe("Start time has passed");
    });
});

describe("isPickemLocked", () => {
    it("locks at the scheduled time", () => {
        expect(isPickemLocked(match(), NOW)).toBe(false);
        expect(isPickemLocked(match({scheduledAt: NOW.toISOString()}), NOW)).toBe(true);
    });

    it("locks when the time is cleared or the match is completed", () => {
        expect(isPickemLocked(match({scheduledAt: null}), NOW)).toBe(true);
        expect(isPickemLocked(match({status: "completed"}), NOW)).toBe(true);
    });
});

describe("matchState", () => {
    it("separates published from unpublished matches", () => {
        expect(matchState(match(), false, NOW)).toBe("unpublished");
        expect(matchState(match({away: null}), false, NOW)).toBe("unpublishable");
        expect(matchState(match(), true, NOW)).toBe("open");
        expect(matchState(match({scheduledAt: EARLIER}), true, NOW)).toBe("locked");
    });
});

describe("buildPickemBoard", () => {
    const published = match({id: "m2", matchCode: "W1-M2", scheduledAt: "2026-11-26T12:00:00Z"});

    const board = buildPickemBoard({
        settings: SETTINGS,
        now: NOW,
        matches: [
            match(),
            published,
            match({id: "m3", status: "completed", scheduledAt: EARLIER}),
            match({id: "m4", matchCode: null, scheduledAt: null, home: null, away: null}),
        ],
        markets: [
            {id: "len", matchId: "m2", kind: "match_length", status: "open"},
            {id: "win", matchId: "m2", kind: "winner", status: "open"},
        ],
        outcomes: [
            {marketId: "win", key: "away", label: "Away", sortOrder: 1, startProb: 0.23606},
            {marketId: "win", key: "home", label: "Home", sortOrder: 0, startProb: 0.76394},
            {marketId: "len", key: "2-0", label: "2-0", sortOrder: 0, startProb: 0.5},
            {marketId: "len", key: "2-1", label: "2-1", sortOrder: 1, startProb: 0.5},
        ],
        odds: [
            {marketId: "win", outcomeKey: "home", staked: 0, pool: 0, odds: 1.24},
            {marketId: "win", outcomeKey: "away", staked: 0, pool: 0, odds: 4.02},
            {marketId: "len", outcomeKey: "2-0", staked: 0, pool: 0, odds: 1.9},
            {marketId: "len", outcomeKey: "2-1", staked: 0, pool: 0, odds: 1.9},
        ],
    });

    it("drops completed matches that were never published and sorts by start time, unscheduled last", () => {
        expect(board.matches.map(m => m.matchId)).toEqual(["m2", "m1", "m4"]);
    });

    it("lists the winner market first, outcomes in order, with team names as labels", () => {
        const row = board.matches[0];
        expect(row.state).toBe("open");
        expect(row.lockAt).toBe(row.scheduledAt);
        expect(row.markets.map(m => m.kind)).toEqual(["winner", "match_length"]);
        expect(row.markets[0].outcomes.map(o => [o.label, o.odds])).toEqual([["Saints", 1.24], ["Mapua", 4.02]]);
        expect(row.markets[1].outcomes.map(o => o.label)).toEqual(["2-0", "2-1"]);
    });

    it("explains why an unpublishable match cannot be published", () => {
        const row = board.matches[2];
        expect(row.state).toBe("unpublishable");
        expect(row.blockedReason).toBe("Teams not set");
    });
});
