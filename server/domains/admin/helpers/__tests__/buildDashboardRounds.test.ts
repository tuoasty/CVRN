import {describe, expect, it} from "vitest";
import {
    buildDashboardRounds,
    dashboardRoundKey,
    dashboardSortAt,
    isDashboardMatch,
} from "../buildDashboardRounds";
import type {DashboardMatchRow} from "../../types/dashboard";

const now = new Date("2026-11-20T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();
const noByes = () => false;
let nextId = 0;

function row(overrides: Partial<DashboardMatchRow> = {}): DashboardMatchRow {
    nextId += 1;
    return {
        id: `m${nextId}`,
        season_id: "s1",
        match_type: "season",
        status: "completed",
        week: 1,
        match_code: `W1-M${nextId}`,
        scheduled_at: at(-DAY),
        home_team_id: "home",
        away_team_id: "away",
        playoff_round: null,
        ...overrides,
    };
}

function pendingPlayoff(overrides: Partial<DashboardMatchRow> = {}): DashboardMatchRow {
    return row({
        match_type: "playoffs",
        status: "pending",
        week: null,
        scheduled_at: null,
        playoff_round: "semifinal",
        ...overrides,
    });
}

describe("isDashboardMatch", () => {
    it("includes a match exactly 14 days back and exactly 7 days forward", () => {
        expect(isDashboardMatch(row({scheduled_at: at(-14 * DAY)}), noByes, now)).toBe(true);
        expect(isDashboardMatch(row({scheduled_at: at(7 * DAY)}), noByes, now)).toBe(true);
    });

    it("excludes a match a millisecond outside either edge", () => {
        expect(isDashboardMatch(row({scheduled_at: at(-14 * DAY - 1)}), noByes, now)).toBe(false);
        expect(isDashboardMatch(row({scheduled_at: at(7 * DAY + 1)}), noByes, now)).toBe(false);
    });

    it("excludes a season match with no scheduled_at", () => {
        expect(isDashboardMatch(row({status: "pending", scheduled_at: null}), noByes, now)).toBe(false);
    });

    it("excludes a match with a bye team", () => {
        const isBye = (teamId: string) => teamId === "away";
        expect(isDashboardMatch(row(), isBye, now)).toBe(false);
    });

    it("excludes a bye team even on a pending playoff match", () => {
        const isBye = (teamId: string) => teamId === "home";
        expect(isDashboardMatch(pendingPlayoff(), isBye, now)).toBe(false);
    });

    it("excludes a playoff match with an empty slot even inside the window", () => {
        const inWindow = pendingPlayoff({away_team_id: null, scheduled_at: at(DAY)});
        expect(isDashboardMatch(inWindow, noByes, now)).toBe(false);
    });

    it("includes a pending playoff match with both teams and no time", () => {
        expect(isDashboardMatch(pendingPlayoff(), noByes, now)).toBe(true);
    });

    it("includes a playoff match with status scheduled when both teams are set", () => {
        expect(isDashboardMatch(pendingPlayoff({status: "scheduled"}), noByes, now)).toBe(true);
    });

    it("includes a pending playoff match dated 60 days out", () => {
        expect(isDashboardMatch(pendingPlayoff({scheduled_at: at(60 * DAY)}), noByes, now)).toBe(true);
    });

    it("excludes a completed playoff match outside the window", () => {
        const old = pendingPlayoff({status: "completed", scheduled_at: at(-30 * DAY)});
        expect(isDashboardMatch(old, noByes, now)).toBe(false);
    });

    it("includes a completed playoff match inside the window", () => {
        const recent = pendingPlayoff({status: "completed", scheduled_at: at(-3 * DAY)});
        expect(isDashboardMatch(recent, noByes, now)).toBe(true);
    });
});

describe("dashboardSortAt", () => {
    const sevenDays = now.getTime() + 7 * DAY;

    it("clamps a pending playoff match to the 7 day mark", () => {
        expect(dashboardSortAt(pendingPlayoff({scheduled_at: at(-5 * DAY)}), now)).toBe(sevenDays);
        expect(dashboardSortAt(pendingPlayoff({scheduled_at: at(60 * DAY)}), now)).toBe(sevenDays);
        expect(dashboardSortAt(pendingPlayoff({scheduled_at: null}), now)).toBe(sevenDays);
    });

    it("keeps the time of a pending playoff match inside the forward window", () => {
        expect(dashboardSortAt(pendingPlayoff({scheduled_at: at(2 * DAY)}), now)).toBe(now.getTime() + 2 * DAY);
    });

    it("keeps the time of a completed match", () => {
        expect(dashboardSortAt(row({scheduled_at: at(-3 * DAY)}), now)).toBe(now.getTime() - 3 * DAY);
    });
});

describe("dashboardRoundKey", () => {
    it("keys a season match by week", () => {
        expect(dashboardRoundKey(row({week: 3}))).toBe("week:3");
    });

    it("never uses week for a playoff match", () => {
        expect(dashboardRoundKey(pendingPlayoff({week: 1, playoff_round: "losers_round_2"}))).toBe("losers_round_2");
    });

    it("gives a playoff match with no bracket row its own key", () => {
        expect(dashboardRoundKey(pendingPlayoff({playoff_round: null}))).toBe("playoffs");
    });

    it("gives a season match with no week its own key", () => {
        expect(dashboardRoundKey(row({week: null}))).toBe("season");
    });
});

describe("buildDashboardRounds", () => {
    it("sorts rounds newest first by latest match, keeping each round in one block", () => {
        const a = row({week: 1, scheduled_at: at(-10 * DAY)});
        const b = row({week: 2, scheduled_at: at(-5 * DAY)});
        const c = row({week: 1, scheduled_at: at(-1 * DAY)});
        const rounds = buildDashboardRounds([a, b, c], now);
        expect(rounds.map(r => r.key)).toEqual(["week:1", "week:2"]);
        expect(rounds[0].rows.map(r => r.id)).toEqual([c.id, a.id]);
    });

    it("puts forward matches ahead of older ones", () => {
        const older = row({week: 2, scheduled_at: at(-2 * DAY)});
        const forward = row({week: 3, status: "scheduled", scheduled_at: at(3 * DAY)});
        expect(buildDashboardRounds([older, forward], now).map(r => r.key)).toEqual(["week:3", "week:2"]);
    });

    it("breaks a tie on the 7 day mark with the latest bracket stage first", () => {
        const semifinal = pendingPlayoff({playoff_round: "semifinal"});
        const final = pendingPlayoff({playoff_round: "final"});
        const rounds = buildDashboardRounds([semifinal, final], now);
        expect(rounds.map(r => r.key)).toEqual(["final", "semifinal"]);
    });

    it("sorts matches newest first, then by natural match_code", () => {
        const scheduled_at = at(-DAY);
        const m10 = row({match_code: "W2-M10", scheduled_at});
        const m2 = row({match_code: "W2-M2", scheduled_at});
        const none = row({match_code: null, scheduled_at});
        const newest = row({match_code: "W2-M99", scheduled_at: at(-DAY + 1000)});
        const [round] = buildDashboardRounds([m10, none, m2, newest], now);
        expect(round.rows.map(r => r.match_code)).toEqual(["W2-M99", "W2-M2", "W2-M10", null]);
    });

    it("exposes week and round for labelling", () => {
        const [playoff, season] = buildDashboardRounds([
            row({week: 4}),
            pendingPlayoff({playoff_round: "quarterfinal"}),
        ], now);
        expect(playoff).toMatchObject({key: "quarterfinal", week: null, playoffRound: "quarterfinal", matchType: "playoffs"});
        expect(season).toMatchObject({key: "week:4", week: 4, playoffRound: null, matchType: "season"});
    });

    it("returns nothing for no rows", () => {
        expect(buildDashboardRounds([], now)).toEqual([]);
    });
});
