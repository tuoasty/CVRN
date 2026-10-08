import {describe, expect, it} from "vitest";
import type {RecordViewRow} from "@/shared/types/db";
import {mapRecordRow} from "../mapRecordRow";
import {groupRecords} from "../groupRecords";
import {scopeKeyFor} from "../scopeKey";
import {RecordsParamsSchema} from "../../types/schemas";
import type {RecordEntry} from "../../types";

function row(overrides: Partial<RecordViewRow> = {}): RecordViewRow {
    return {
        scope_key: "all",
        scope_kind: "all",
        scope_region_id: null,
        scope_season_id: null,
        scope_season_number: null,
        grain: "set",
        subject: "player",
        category: "kills",
        row_num: 1,
        rank: 1,
        value: 9,
        tied_beyond: 0,
        player_id: "p1",
        player_username: "spiker",
        player_display_name: "Spiker",
        player_avatar_url: null,
        team_id: "t1",
        team_name: "Team One",
        team_slug: "team-one",
        team_logo_url: null,
        team_logo_bg_removed: null,
        opponent_team_id: "t2",
        opponent_team_name: "Team Two",
        opponent_team_slug: "team-two",
        match_id: "m1",
        match_code: "W3-M2",
        set_number: 4,
        record_season_id: "s1",
        season_name: "Season 2",
        season_slug: "season-2",
        season_number: 2,
        season_active: false,
        record_region_id: "r1",
        region_code: "NA",
        played_at: "2026-05-01T00:00:00Z",
        sets_played: 1,
        matches_played: 1,
        position_counts: {OUT: 1},
        ...overrides,
    };
}

function entry(overrides: Partial<RecordViewRow> = {}): RecordEntry {
    const mapped = mapRecordRow(row(overrides));
    if (!mapped) throw new Error("row did not map");
    return mapped;
}

describe("mapRecordRow", () => {
    it("maps identity, match and season context", () => {
        const e = entry();
        expect(e.player).toEqual({id: "p1", username: "spiker", displayName: "Spiker", avatarUrl: null});
        expect(e.opponent).toEqual({id: "t2", name: "Team Two", slug: "team-two"});
        expect(e.match).toEqual({id: "m1", code: "W3-M2"});
        expect(e.setNumber).toBe(4);
        expect(e.season).toEqual({id: "s1", name: "Season 2", slug: "season-2", number: 2, active: false});
        expect(e.regionCode).toBe("NA");
        expect(e.team?.logoBgRemoved).toBe(false);
    });

    it("keeps null positions as null", () => {
        expect(entry({position_counts: null}).positionCounts).toBeNull();
    });

    it("has no match or opponent for season rows", () => {
        const e = entry({grain: "season", match_id: null, match_code: null, set_number: null, opponent_team_id: null, opponent_team_name: null, opponent_team_slug: null});
        expect(e.match).toBeNull();
        expect(e.opponent).toBeNull();
    });

    it("drops rows with an unknown category or grain", () => {
        expect(mapRecordRow(row({category: "hit_eff"}))).toBeNull();
        expect(mapRecordRow(row({grain: "game"}))).toBeNull();
    });
});

describe("groupRecords", () => {
    it("orders categories by the fixed list with errors last", () => {
        const book = groupRecords([
            entry({category: "errors"}),
            entry({category: "aces"}),
            entry({category: "points"}),
            entry({category: "kills"}),
        ]);
        expect(book.player.set.map(g => g.category)).toEqual(["points", "kills", "aces", "errors"]);
    });

    it("never yields points for teams", () => {
        const book = groupRecords([
            entry({subject: "team", category: "points", player_id: null, player_username: null}),
            entry({subject: "team", category: "kills", player_id: null, player_username: null}),
        ]);
        expect(book.team.set.map(g => g.category)).toEqual(["kills"]);
    });

    it("sorts entries by row number and carries tied_beyond from the last row", () => {
        const book = groupRecords([
            entry({row_num: 2, rank: 2, value: 7, tied_beyond: 3}),
            entry({row_num: 1, rank: 1, value: 9}),
        ]);
        const [group] = book.player.set;
        expect(group.entries.map(e => e.rowNum)).toEqual([1, 2]);
        expect(group.tiedBeyond).toBe(3);
    });

    it("returns empty grains for every subject when there are no rows", () => {
        const book = groupRecords([]);
        expect(book.player.match).toEqual([]);
        expect(book.team.season).toEqual([]);
    });
});

describe("scopeKeyFor", () => {
    it("builds the matview scope keys", () => {
        expect(scopeKeyFor({kind: "all"})).toBe("all");
        expect(scopeKeyFor({kind: "region", regionId: "r1", regionCode: "NA"})).toBe("r:r1");
        expect(scopeKeyFor({kind: "seasonNumber", seasonNumber: 2})).toBe("n:2");
        expect(
            scopeKeyFor({
                kind: "season",
                regionId: "r1",
                regionCode: "NA",
                seasonId: "s1",
                seasonSlug: "season-2",
                seasonName: "Season 2",
                seasonNumber: 2,
            }),
        ).toBe("s:s1");
    });
});

describe("RecordsParamsSchema", () => {
    it("accepts region only, season only, both, or neither", () => {
        expect(RecordsParamsSchema.parse({})).toEqual({});
        expect(RecordsParamsSchema.parse({region: "NA"})).toEqual({region: "na"});
        expect(RecordsParamsSchema.parse({season: "2"})).toEqual({season: 2});
        expect(RecordsParamsSchema.parse({region: "NA", season: "2"})).toEqual({region: "na", season: 2});
    });

    it("rejects malformed or repeated params", () => {
        expect(RecordsParamsSchema.safeParse({region: "n%a"}).success).toBe(false);
        expect(RecordsParamsSchema.safeParse({region: ["NA", "AS"]}).success).toBe(false);
        expect(RecordsParamsSchema.safeParse({season: "season-2"}).success).toBe(false);
        expect(RecordsParamsSchema.safeParse({season: "0"}).success).toBe(false);
        expect(RecordsParamsSchema.safeParse({season: "-1"}).success).toBe(false);
    });
});
