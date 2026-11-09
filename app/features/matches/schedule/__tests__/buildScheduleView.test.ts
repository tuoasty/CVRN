import {describe, it, expect} from "vitest";
import type {TeamWithRegion} from "@/server/domains/team";
import type {MatchSet} from "@/shared/types/db";
import {makeMatch, HOME, AWAY} from "@/app/(public)/home/model/__tests__/fixtures";
import {buildScheduleView} from "../buildScheduleView";
import type {BuildScheduleInput} from "../types";

const TZ = "America/New_York";
const NOW = new Date("2026-11-09T20:00:00Z");

function team(id: string, name: string): TeamWithRegion {
    return {id, name, slug: name.toLowerCase(), logo_url: null, logo_bg_removed: false} as TeamWithRegion;
}

const TEAMS = new Map([
    [HOME, team(HOME, "Voltage")],
    [AWAY, team(AWAY, "Skyline")],
]);

function sets(...pairs: [number, number][]): MatchSet[] {
    return pairs.map(([home_score, away_score], i) => ({set_number: i + 1, home_score, away_score}) as MatchSet);
}

function input(o: Partial<BuildScheduleInput>): BuildScheduleInput {
    return {
        kind: "season",
        matches: [],
        teams: TEAMS,
        timeZone: TZ,
        now: NOW,
        standingMethod: "lvr",
        seeds: {},
        records: new Map(),
        ...o,
    };
}

const done = (o: Parameters<typeof makeMatch>[0] = {}) =>
    makeMatch({status: "completed", home_sets_won: 3, away_sets_won: 1, sets: sets([25, 20], [20, 25], [25, 18], [25, 19]), ...o});

describe("buildScheduleView", () => {
    it("hides matches with a TBD team", () => {
        const view = buildScheduleView(input({matches: [makeMatch({away_team_id: null}), makeMatch({home_team_id: null})]}));
        expect(view.upcoming).toEqual([]);
        expect(view.results).toEqual([]);
    });

    it("upcoming days ascending, results days descending", () => {
        const view = buildScheduleView(input({
            matches: [
                makeMatch({scheduled_at: "2026-11-14T23:00:00Z"}),
                makeMatch({scheduled_at: "2026-11-11T23:00:00Z"}),
                done({scheduled_at: "2026-11-01T23:00:00Z"}),
                done({scheduled_at: "2026-11-07T23:00:00Z"}),
            ],
        }));
        expect(view.upcoming.map(d => d.key)).toEqual(["2026-11-11", "2026-11-14"]);
        expect(view.results.map(d => d.key)).toEqual(["2026-11-07", "2026-11-01"]);
    });

    it("undated match with both teams goes last in upcoming as Not scheduled yet", () => {
        const view = buildScheduleView(input({
            matches: [makeMatch({scheduled_at: null}), makeMatch({scheduled_at: "2026-11-11T23:00:00Z"})],
        }));
        expect(view.upcoming.map(d => d.label)).toEqual(["Wed 11 Nov", "Not scheduled yet"]);
        expect(view.upcoming[1].rows[0].time).toBeNull();
        expect(view.results).toEqual([]);
    });

    it("a match completed today sits in results under a today day while unplayed today stays upcoming", () => {
        const view = buildScheduleView(input({
            matches: [done({scheduled_at: "2026-11-09T17:00:00Z"}), makeMatch({scheduled_at: "2026-11-09T23:30:00Z"})],
        }));
        expect(view.upcoming).toHaveLength(1);
        expect(view.upcoming[0].isToday).toBe(true);
        expect(view.results).toHaveLength(1);
        expect(view.results[0].isToday).toBe(true);
        expect(view.results[0].rows[0].time).toBe("12:00");
    });

    it("results rows within a day ascend by time", () => {
        const view = buildScheduleView(input({
            matches: [done({scheduled_at: "2026-11-07T23:00:00Z", match_code: "W1-M2"}), done({scheduled_at: "2026-11-07T21:00:00Z", match_code: "W1-M1"})],
        }));
        expect(view.results[0].rows.map(r => r.label)).toEqual(["Match 1", "Match 2"]);
    });

    it("season label is Match N and tag is the record", () => {
        const view = buildScheduleView(input({
            matches: [makeMatch({match_code: "W3-M4"})],
            records: new Map([[HOME, {wins: 6, losses: 2}]]),
        }));
        const row = view.upcoming[0].rows[0];
        expect(row.label).toBe("Match 4");
        expect(row.home.tag).toBe("6-2");
        expect(row.away.tag).toBeNull();
    });

    it("playoff label is the long round label and tag is the seed", () => {
        const view = buildScheduleView(input({
            kind: "playoffs",
            matches: [makeMatch({match_type: "playoffs", round: "losers_round_2"})],
            seeds: {[HOME]: 1},
        }));
        const row = view.upcoming[0].rows[0];
        expect(row.label).toBe("Losers Round 2");
        expect(row.home.tag).toBe("#1");
        expect(row.away.tag).toBeNull();
    });

    it("forfeit without sets marks isForfeit with empty sets and keeps impact", () => {
        const view = buildScheduleView(input({
            matches: [done({is_forfeit: true, sets: [], home_team_lvr: 12.34, away_team_lvr: -12.34})],
        }));
        const row = view.results[0].rows[0];
        expect(row.isForfeit).toBe(true);
        expect(row.sets).toEqual([]);
        expect(row.impact).toBe("+12.3 LVR");
    });

    it("marks the winner and orders sets", () => {
        const view = buildScheduleView(input({
            matches: [done({home_sets_won: 1, away_sets_won: 3, sets: [{set_number: 2, home_score: 20, away_score: 25}, {set_number: 1, home_score: 25, away_score: 21}] as MatchSet[]})],
        }));
        const row = view.results[0].rows[0];
        expect(row.away.won).toBe(true);
        expect(row.home.won).toBe(false);
        expect(row.sets).toEqual([{home: 25, away: 21}, {home: 20, away: 25}]);
    });

    it("impact uses LVR under lvr", () => {
        const view = buildScheduleView(input({matches: [done({home_team_lvr: 18.4, away_team_lvr: -18.4})]}));
        expect(view.results[0].rows[0].impact).toBe("+18.4 LVR");
    });

    it("impact under points includes bonus", () => {
        const view = buildScheduleView(input({
            standingMethod: "points",
            matches: [done({home_team_points: 3, home_team_bonus: 1, away_team_points: 0, away_team_bonus: 0})],
        }));
        expect(view.results[0].rows[0].impact).toBe("+4.0 PTS");
    });

    it("impact under points_without_bonus excludes bonus", () => {
        const view = buildScheduleView(input({
            standingMethod: "points_without_bonus",
            matches: [done({home_team_points: 3, home_team_bonus: 1, away_team_points: 0, away_team_bonus: 0})],
        }));
        expect(view.results[0].rows[0].impact).toBe("+3.0 PTS");
    });

    it("playoff results have no impact", () => {
        const view = buildScheduleView(input({
            kind: "playoffs",
            matches: [done({match_type: "playoffs", round: "final", home_team_lvr: 10, away_team_lvr: -10})],
        }));
        expect(view.results[0].rows[0].impact).toBeNull();
    });
});
