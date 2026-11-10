import {describe, expect, it} from "vitest";
import type {TeamCard} from "@/server/domains/playerCard/types";
import {pickCardSeason} from "../cardSeason";

function card(playerId: string, seasonNumber: number, ovr: number, groupId = "g1"): TeamCard {
    return {
        playerId,
        seasonNumber,
        groupId,
        groupName: "Base",
        ovr,
        teamName: null,
        imageUrl: `https://cdn/${playerId}-${seasonNumber}-${groupId}.png`,
        width: 600,
        height: 840,
    };
}

describe("pickCardSeason", () => {
    it("uses previous-season cards until a roster player has a current card", () => {
        const out = pickCardSeason([card("a", 2, 80), card("b", 2, 70), card("z", 3, 99)], ["a", "b"], 3);
        expect(out?.seasonNumber).toBe(2);
        expect(out?.cards.map((c) => c.playerId)).toEqual(["a", "b"]);
    });

    it("switches the whole section to the current season once one roster card exists", () => {
        const out = pickCardSeason([card("a", 2, 80), card("b", 3, 60)], ["a", "b"], 3);
        expect(out?.seasonNumber).toBe(3);
        expect(out?.cards.map((c) => c.playerId)).toEqual(["b"]);
    });

    it("drops non-roster cards and sorts by OVR descending, keeping every group", () => {
        const out = pickCardSeason(
            [card("a", 3, 70, "g1"), card("a", 3, 90, "g2"), card("b", 3, 80), card("x", 3, 99)],
            ["a", "b"],
            3,
        );
        expect(out?.cards.map((c) => `${c.playerId}:${c.ovr}`)).toEqual(["a:90", "b:80", "a:70"]);
    });

    it("is null without any roster card", () => {
        expect(pickCardSeason([card("x", 3, 99)], ["a"], 3)).toBeNull();
        expect(pickCardSeason([], ["a"], 3)).toBeNull();
    });
});
