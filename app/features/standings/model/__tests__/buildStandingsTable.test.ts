import {describe, expect, it} from "vitest";
import type {StandingWithInfo} from "@/server/domains/standing";
import type {MatchWithDetails} from "@/server/domains/match";
import type {Match} from "@/shared/types/db";
import {buildStandingsTable, metricFor, sortColumnFor, zoneRules} from "../buildStandingsTable";
import type {BuildStandingsTableInput} from "../types";

function standing(o: Partial<StandingWithInfo> = {}): StandingWithInfo {
    return {
        season_id: "s1",
        region_id: "r1",
        team_id: "a",
        team_name: "Aurora",
        team_slug: "aurora",
        team_logo_url: null,
        team_logo_bg_removed: false,
        starting_lvr: 100,
        starting_points: 0,
        wins: 0,
        losses: 0,
        sets_won: 0,
        sets_lost: 0,
        total_lvr: 100,
        total_points: 0,
        total_bonus: 0,
        last_round_point_diff: 0,
        rank: 1,
        ...o,
    };
}

let seq = 0;
function match(o: Partial<Match> = {}): MatchWithDetails {
    seq += 1;
    return {
        match: {
            id: `m${seq}`,
            match_code: `W1-M${seq}`,
            match_type: "season",
            status: "completed",
            home_team_id: "a",
            away_team_id: "b",
            home_sets_won: 2,
            away_sets_won: 0,
            week: 1,
            scheduled_at: "2026-11-01T12:00:00Z",
            is_forfeit: false,
            ...o,
        } as unknown as Match,
        sets: [],
        officials: [],
    };
}

const teams = [
    standing({team_id: "a", team_name: "Aurora", rank: 1}),
    standing({team_id: "b", team_name: "Bluefin", team_slug: "bluefin", rank: 2}),
    standing({team_id: "c", team_name: "Cobalt", team_slug: "cobalt", rank: 3}),
];

function input(o: Partial<BuildStandingsTableInput> = {}): BuildStandingsTableInput {
    return {
        standings: teams,
        completed: [],
        upcoming: [],
        method: "lvr",
        qualifiedTeams: null,
        playinTeams: null,
        timeZone: "Asia/Singapore",
        now: new Date("2026-11-13T02:00:00Z"),
        ...o,
    };
}

const rowFor = (model: ReturnType<typeof buildStandingsTable>, id: string) => model.rows.find(r => r.team.id === id)!;

describe("sortColumnFor", () => {
    it("maps each method to the column that ranks first", () => {
        expect(sortColumnFor("lvr")).toBe("lvr");
        expect(sortColumnFor("points")).toBe("w");
        expect(sortColumnFor("points_without_bonus")).toBe("pts");
    });
});

describe("metricFor", () => {
    it("adds the bonus for points regions only", () => {
        const row = standing({total_points: 9, total_bonus: 2.5, total_lvr: 104.2});
        expect(metricFor(row, "points")).toBe(11.5);
        expect(metricFor(row, "points_without_bonus")).toBe(9);
        expect(metricFor(row, "lvr")).toBe(104.2);
    });
});

describe("zoneRules", () => {
    it("draws a play-in cut and an out cut", () => {
        expect(zoneRules(8, 4, 16)).toEqual([
            {afterRank: 8, label: "Play-in", variant: "solid"},
            {afterRank: 12, label: "Out", variant: "dashed"},
        ]);
    });

    it("draws a single out cut when play-ins are 0", () => {
        expect(zoneRules(12, 0, 20)).toEqual([{afterRank: 12, label: "Out", variant: "solid"}]);
    });

    it("treats null play-ins as 0", () => {
        expect(zoneRules(12, null, 20)).toEqual([{afterRank: 12, label: "Out", variant: "solid"}]);
    });

    it("draws nothing without a qualified count", () => {
        expect(zoneRules(null, 4, 16)).toEqual([]);
        expect(zoneRules(0, 4, 16)).toEqual([]);
        expect(zoneRules(undefined, undefined, 16)).toEqual([]);
    });

    it("draws no cut below the last row", () => {
        expect(zoneRules(16, 0, 16)).toEqual([]);
        expect(zoneRules(8, 8, 16)).toEqual([{afterRank: 8, label: "Play-in", variant: "solid"}]);
    });
});

describe("rows", () => {
    it("skips a null team_id and puts a null rank last", () => {
        const model = buildStandingsTable(input({
            standings: [
                standing({team_id: "a", rank: null}),
                standing({team_id: null, rank: 1}),
                standing({team_id: "b", rank: 2}),
            ],
        }));
        expect(model.rows.map(r => r.team.id)).toEqual(["b", "a"]);
    });

    it("derives played and set difference", () => {
        const model = buildStandingsTable(input({standings: [standing({wins: 3, losses: 1, sets_won: 7, sets_lost: 3})]}));
        expect(model.rows[0]).toMatchObject({played: 4, wins: 3, losses: 1, setsWon: 7, setsLost: 3, setDiff: 4});
    });

    it("exposes the sort column and carry-in points", () => {
        const model = buildStandingsTable(input({method: "points", standings: [standing({starting_points: 2})]}));
        expect(model.sortColumn).toBe("w");
        expect(model.hasCarryInPoints).toBe(true);
        expect(buildStandingsTable(input()).hasCarryInPoints).toBe(false);
    });
});

describe("form", () => {
    it("excludes playoff matches", () => {
        const model = buildStandingsTable(input({completed: [match({match_type: "playoffs"} as Partial<Match>)]}));
        expect(rowFor(model, "a").form).toEqual([]);
    });

    it("keeps the newest 5, oldest first, from the team's side", () => {
        const completed = [1, 2, 3, 4, 5, 6].map(week =>
            match({week, home_team_id: "b", away_team_id: "a", home_sets_won: week === 6 ? 2 : 0, away_sets_won: week === 6 ? 1 : 2}),
        );
        const form = rowFor(buildStandingsTable(input({completed})), "a").form;
        expect(form).toHaveLength(5);
        expect(form.map(f => f.outcome)).toEqual(["W", "W", "W", "W", "L"]);
        expect(form[4]).toMatchObject({teamSets: 1, opponentSets: 2, homeTeamName: "Bluefin", awayTeamName: "Aurora"});
        expect(form[0].opponent?.id).toBe("b");
    });

    it("keeps a result against a team missing from standings", () => {
        const form = rowFor(buildStandingsTable(input({completed: [match({away_team_id: "gone"})]})), "a").form;
        expect(form).toHaveLength(1);
        expect(form[0].opponent).toBeNull();
    });

    it("orders null week and null scheduled_at last without throwing", () => {
        const completed = [
            match({id: "late", week: null, scheduled_at: null} as Partial<Match>),
            match({id: "w2", week: 2, scheduled_at: null} as Partial<Match>),
            match({id: "w1", week: 1} as Partial<Match>),
        ];
        const form = rowFor(buildStandingsTable(input({completed})), "a").form;
        expect(form.map(f => f.matchId)).toEqual(["w1", "w2", "late"]);
    });
});

describe("next", () => {
    it("skips a fixture against a team missing from standings", () => {
        const upcoming = [
            match({id: "bye", status: "scheduled", week: 2, away_team_id: "bye-team"} as Partial<Match>),
            match({id: "real", status: "scheduled", week: 3, away_team_id: "c"} as Partial<Match>),
        ];
        const next = rowFor(buildStandingsTable(input({upcoming})), "a").next;
        expect(next?.matchId).toBe("real");
        expect(next?.opponent.id).toBe("c");
    });

    it("marks a fixture today in the region's timezone", () => {
        const today = match({status: "scheduled", scheduled_at: "2026-11-12T17:00:00Z"} as Partial<Match>);
        const tomorrow = match({status: "scheduled", scheduled_at: "2026-11-13T17:00:00Z"} as Partial<Match>);
        expect(rowFor(buildStandingsTable(input({upcoming: [today]})), "a").next?.isToday).toBe(true);
        expect(rowFor(buildStandingsTable(input({upcoming: [tomorrow]})), "a").next?.isToday).toBe(false);
    });

    it("hides the column when nobody has a next match", () => {
        expect(buildStandingsTable(input()).showNext).toBe(false);
        const upcoming = [match({status: "scheduled", week: 2} as Partial<Match>)];
        expect(buildStandingsTable(input({upcoming})).showNext).toBe(true);
    });

    it("ignores playoff fixtures", () => {
        const upcoming = [match({status: "scheduled", match_type: "playoffs"} as Partial<Match>)];
        expect(rowFor(buildStandingsTable(input({upcoming})), "a").next).toBeNull();
    });
});
