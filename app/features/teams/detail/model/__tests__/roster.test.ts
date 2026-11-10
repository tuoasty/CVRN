import {describe, expect, it} from "vitest";
import type {PlayerWithRole} from "@/server/domains/player";
import {orderRoster, positionChain, type RosterTile} from "../roster";

describe("positionChain", () => {
    it("uses the top two positions of this season when the player has season sets", () => {
        expect(
            positionChain({seasonCounts: {OUT: 5, OPP: 3, MID: 1}, seasonSets: 9, listed: "LIB", careerCounts: {SET: 40}}),
        ).toEqual(["OUT", "OPP"]);
    });

    it("falls back to the listed position without season sets", () => {
        expect(positionChain({seasonCounts: null, seasonSets: 0, listed: "MID", careerCounts: {SET: 40}})).toEqual(["MID"]);
    });

    it("falls back to the main career position without a listed position", () => {
        expect(positionChain({seasonCounts: null, seasonSets: 0, listed: null, careerCounts: {SET: 40, OUT: 2}})).toEqual(["SET"]);
    });

    it("is empty when nothing is known", () => {
        expect(positionChain({seasonCounts: null, seasonSets: 0, listed: null, careerCounts: null})).toEqual([]);
    });
});

function tile(id: string, role: PlayerWithRole["role"], positions: RosterTile["positions"], displayName: string | null, username = id): RosterTile {
    return {
        player: {
            id,
            roblox_user_id: "1",
            username,
            display_name: displayName,
            avatar_url: null,
            last_synced_at: null,
            created_at: "2026-01-01T00:00:00Z",
            role,
            current_position: null,
            spec: null,
        },
        positions,
        href: null,
    };
}

describe("orderRoster", () => {
    it("puts leadership first, then position groups, then no position, ties by name", () => {
        const out = orderRoster([
            tile("lib", "player", ["LIB"], "Zed"),
            tile("none", "player", [], "Amy"),
            tile("vc", "vice_captain", ["MID"], "Vic"),
            tile("out2", "player", ["OUT"], "Bob"),
            tile("set", "player", ["SET", "OUT"], "Sam"),
            tile("cc", "court_captain", ["OUT"], "Cam"),
            tile("out1", "player", ["OUT"], null, "aaron"),
            tile("c", "captain", ["LIB"], "Cap"),
            tile("opp", "player", ["OPP"], "Oli"),
            tile("mid", "player", ["MID", "OUT"], "Max"),
        ]);
        expect(out.map((t) => t.player.id)).toEqual(["c", "vc", "cc", "set", "opp", "out1", "out2", "mid", "lib", "none"]);
    });
});
