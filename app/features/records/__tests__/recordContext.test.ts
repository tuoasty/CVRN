import {describe, expect, it} from "vitest";
import type {RecordEntry} from "@/server/domains/record";
import {recordContext, recordEntryHref, recordEntryName} from "../recordContext";

function makeEntry(overrides: Partial<RecordEntry> = {}): RecordEntry {
    return {
        grain: "set",
        subject: "player",
        category: "kills",
        rowNum: 1,
        rank: 1,
        value: 9,
        tiedBeyond: 0,
        player: {id: "p1", username: "Spiker", displayName: "Spike King", avatarUrl: null},
        team: {id: "t1", name: "Team One", slug: "team-one", logoUrl: null, logoBgRemoved: false},
        opponent: {id: "t2", name: "Team Two", slug: "team-two"},
        match: {id: "m1", code: "W3-M2", round: "semifinal"},
        setNumber: 4,
        season: {id: "s1", name: "Season 2", slug: "season-2", number: 2, active: false},
        regionCode: "NA",
        playedAt: "2026-05-01T00:00:00Z",
        setsPlayed: 5,
        matchesPlayed: 7,
        positionCounts: null,
        ...overrides,
    };
}

describe("recordContext", () => {
    it("folds opponent, round and set into one match piece, then scope", () => {
        const pieces = recordContext(makeEntry());
        expect(pieces.map(p => p.kind)).toEqual(["match", "scope"]);
        expect(pieces[0]).toEqual({
            kind: "match",
            opponent: "Team Two",
            round: "SF",
            detail: "set",
            count: 4,
            title: "Semifinals",
            href: "/na/season-2/matches/w3-m2/team-one-vs-team-two",
        });
        expect(pieces[1]).toEqual({kind: "scope", regionCode: "NA", seasonNumber: 2});
    });

    it("uses sets played for a match record", () => {
        const [match] = recordContext(makeEntry({grain: "match", setNumber: null}));
        expect(match).toMatchObject({kind: "match", detail: "sets", count: 5});
    });

    it("falls back to the match code when the round is missing", () => {
        const [match] = recordContext(makeEntry({match: {id: "m1", code: "W3-M2", round: null}}));
        expect(match).toMatchObject({kind: "match", round: "W3-M2", title: null});
    });

    it("leaves the round empty when both round and code are missing", () => {
        const [match] = recordContext(makeEntry({match: {id: "m1", code: null, round: null}}));
        expect(match).toMatchObject({kind: "match", round: "", href: null});
    });

    it("keeps the match piece without an opponent", () => {
        const [match] = recordContext(makeEntry({opponent: null}));
        expect(match).toMatchObject({kind: "match", opponent: null, round: "SF"});
    });

    it("builds scope and tallies for a season record", () => {
        const pieces = recordContext(makeEntry({grain: "season", match: null, opponent: null, setNumber: null}));
        expect(pieces).toEqual([
            {kind: "scope", regionCode: "NA", seasonNumber: 2},
            {kind: "tally", count: 7, unit: "M"},
            {kind: "tally", count: 5, unit: "S"},
        ]);
    });

    it("marks an active season as in progress", () => {
        const pieces = recordContext(
            makeEntry({
                grain: "season",
                match: null,
                opponent: null,
                season: {id: "s1", name: "Season 4", slug: "season-4", number: 4, active: true},
            }),
        );
        expect(pieces[pieces.length - 1]).toEqual({kind: "inProgress"});
    });
});

describe("recordEntryName / recordEntryHref", () => {
    it("prefers the display name and links to the player page", () => {
        const e = makeEntry();
        expect(recordEntryName(e)).toBe("Spike King");
        expect(recordEntryHref(e)).toBe("/players/spiker");
    });

    it("uses the team name and team page for team records", () => {
        const e = makeEntry({subject: "team", player: null});
        expect(recordEntryName(e)).toBe("Team One");
        expect(recordEntryHref(e)).toBe("/na/season-2/teams/team-one");
    });
});
