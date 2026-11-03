import {describe, expect, it} from "vitest";
import type {PlayerMatchCandidate, PlayerMatchSide, PlayerRosterWindow} from "../../types";
import {selectPlayerMatches} from "../selectPlayerMatches";

function side(id: string, patch: Partial<PlayerMatchSide> = {}): PlayerMatchSide {
    return {id, name: id.toUpperCase(), logoUrl: null, logoBgRemoved: false, isBye: false, ...patch};
}

function match(id: string, patch: Partial<PlayerMatchCandidate> = {}): PlayerMatchCandidate {
    return {
        id,
        seasonId: "s2",
        seasonNumber: 2,
        seasonSlug: "season-2",
        regionCode: "EU",
        matchCode: "W1-M1",
        matchType: "season",
        week: 1,
        scheduledAt: "2026-05-10T12:00:00.000Z",
        isForfeit: false,
        home: side("a"),
        away: side("b"),
        homeSetsWon: 3,
        awaySetsWon: 1,
        sets: [{setNumber: 1, homeScore: 25, awayScore: 20}],
        ...patch,
    };
}

function roster(teamId: string, patch: Partial<PlayerRosterWindow> = {}): PlayerRosterWindow {
    return {teamId, seasonId: "s2", joinedAt: "2026-05-01T00:00:00.000Z", leftAt: null, ...patch};
}

function select(p: {
    candidates: PlayerMatchCandidate[];
    rosters?: PlayerRosterWindow[];
    ownMatches?: {matchId: string; teamId: string}[];
    withStats?: string[];
    limit?: number;
}) {
    return selectPlayerMatches({
        candidates: p.candidates,
        rosters: p.rosters ?? [],
        ownMatches: p.ownMatches ?? [],
        matchIdsWithStats: new Set(p.withStats ?? []),
        limit: p.limit ?? 5,
    });
}

const ids = (rows: {id: string}[]) => rows.map(r => r.id);

describe("selectPlayerMatches", () => {
    it("returns a stats match the player has a row in, oriented to the stats team", () => {
        const result = select({
            candidates: [match("m1")],
            rosters: [roster("a")],
            ownMatches: [{matchId: "m1", teamId: "b"}],
            withStats: ["m1"],
        });
        expect(ids(result)).toEqual(["m1"]);
        expect(result[0].team.id).toBe("b");
    });

    it("hides a stats match the player sat out", () => {
        const result = select({candidates: [match("m1")], rosters: [roster("a")], withStats: ["m1"]});
        expect(result).toEqual([]);
    });

    it("returns a stats match with an own row and no roster row", () => {
        const result = select({
            candidates: [match("m1")],
            ownMatches: [{matchId: "m1", teamId: "a"}],
            withStats: ["m1"],
        });
        expect(ids(result)).toEqual(["m1"]);
    });

    it("hides a team's no-stats match from before the player joined in season 2 and up", () => {
        const result = select({
            candidates: [
                match("before", {scheduledAt: "2026-04-20T12:00:00.000Z", home: side("b"), away: side("c")}),
                match("after", {scheduledAt: "2026-05-20T12:00:00.000Z", home: side("b"), away: side("c")}),
            ],
            rosters: [
                roster("a", {joinedAt: "2026-04-01T00:00:00.000Z", leftAt: "2026-04-25T00:00:00.000Z"}),
                roster("b", {joinedAt: "2026-05-01T00:00:00.000Z"}),
            ],
        });
        expect(ids(result)).toEqual(["after"]);
    });

    it("ignores join dates in season 1 and still respects the leave date", () => {
        const season1 = {seasonId: "s1", seasonNumber: 1};
        const result = select({
            candidates: [
                match("before-join", {...season1, scheduledAt: "2026-01-05T12:00:00.000Z"}),
                match("after-leave", {...season1, scheduledAt: "2026-03-05T12:00:00.000Z"}),
            ],
            rosters: [roster("a", {seasonId: "s1", joinedAt: "2026-02-01T00:00:00.000Z", leftAt: "2026-03-01T00:00:00.000Z"})],
        });
        expect(ids(result)).toEqual(["before-join"]);
    });

    it("hides a no-stats match after the player left in season 2 and up", () => {
        const result = select({
            candidates: [match("m1", {scheduledAt: "2026-06-01T12:00:00.000Z"})],
            rosters: [roster("a", {leftAt: "2026-05-15T00:00:00.000Z"})],
        });
        expect(result).toEqual([]);
    });

    it("lets a match with no date pass the date tests and sorts it last", () => {
        const result = select({
            candidates: [
                match("undated", {scheduledAt: null}),
                match("dated", {scheduledAt: "2026-05-20T12:00:00.000Z"}),
            ],
            rosters: [roster("a", {joinedAt: "2026-05-01T00:00:00.000Z", leftAt: "2026-06-01T00:00:00.000Z"})],
        });
        expect(ids(result)).toEqual(["dated", "undated"]);
    });

    it("hides bye and TBD matches", () => {
        const result = select({
            candidates: [
                match("null-away", {away: null}),
                match("null-home", {home: null}),
                match("bye", {away: side("bye", {isBye: true})}),
            ],
            rosters: [roster("a")],
        });
        expect(result).toEqual([]);
    });

    it("keeps a forfeit with no sets and no fake score", () => {
        const result = select({
            candidates: [match("m1", {isForfeit: true, sets: [], homeSetsWon: null, awaySetsWon: null})],
            rosters: [roster("a")],
        });
        expect(result[0]).toMatchObject({isForfeit: true, setScores: [], teamSets: null, opponentSets: null});
    });

    it("flips scores when the player's team is away and keeps the real href order", () => {
        const result = select({
            candidates: [match("m1", {
                homeSetsWon: 3,
                awaySetsWon: 1,
                sets: [
                    {setNumber: 2, homeScore: 25, awayScore: 22},
                    {setNumber: 1, homeScore: 25, awayScore: 20},
                ],
            })],
            rosters: [roster("b")],
        });
        expect(result[0]).toMatchObject({
            teamSets: 1,
            opponentSets: 3,
            setScores: [{team: 20, opponent: 25}, {team: 22, opponent: 25}],
            team: {id: "b"},
            opponent: {id: "a"},
            href: {homeTeamName: "A", awayTeamName: "B", matchCode: "W1-M1", regionCode: "EU", seasonSlug: "season-2"},
        });
    });

    it("labels rounds", () => {
        const labels = select({
            candidates: [
                match("gf", {matchType: "playoffs", matchCode: "GF", scheduledAt: "2026-05-14T00:00:00.000Z"}),
                match("po", {matchType: "playoffs", matchCode: null, scheduledAt: "2026-05-13T00:00:00.000Z"}),
                match("w3", {week: 3, scheduledAt: "2026-05-12T00:00:00.000Z"}),
                match("no-week", {week: null, scheduledAt: "2026-05-11T00:00:00.000Z"}),
            ],
            rosters: [roster("a")],
        }).map(r => r.roundLabel);
        expect(labels).toEqual(["GF", "Playoffs", "Week 3", "Season"]);
    });

    it("returns the newest matches up to the limit", () => {
        const candidates = ["10", "12", "11"].map(day => match(`m${day}`, {scheduledAt: `2026-05-${day}T00:00:00.000Z`}));
        expect(ids(select({candidates, rosters: [roster("a")], limit: 2}))).toEqual(["m12", "m11"]);
    });

    it("hides a no-stats match in the right season for a team the player was not on", () => {
        const result = select({
            candidates: [match("m1", {home: side("c"), away: side("d")})],
            rosters: [roster("a")],
        });
        expect(result).toEqual([]);
    });
});
