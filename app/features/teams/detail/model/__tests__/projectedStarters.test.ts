import {describe, expect, it} from "vitest";
import type {CardAttributes} from "@/server/domains/playerCard/types";
import type {PositionCode} from "@/shared/volleyball/positions";
import {pickProjectedStarters, STARTER_SLOTS, type StarterCandidate} from "../projectedStarters";

function card(o: Partial<CardAttributes> = {}): CardAttributes {
    return {
        playerId: "x",
        seasonNumber: 2,
        ovr: 70,
        scoring: 50,
        spiking: 50,
        setting: 50,
        blocking: 50,
        receiving: 50,
        serving: 50,
        ...o,
    };
}

function cand(
    playerId: string,
    positions: PositionCode[],
    c: Partial<CardAttributes> | null,
    perSet: StarterCandidate["perSet"] = null,
): StarterCandidate {
    return {playerId, positions, card: c ? card({playerId, ...c}) : null, perSet};
}

function slotsOf(out: ReturnType<typeof pickProjectedStarters>) {
    return out.map((s) => `${s.slot}:${s.playerId ?? "-"}`);
}

describe("pickProjectedStarters", () => {
    it("fills in fill order SET, LIB, MID, MID, OPP, OUT, OUT", () => {
        expect(STARTER_SLOTS).toEqual(["SET", "LIB", "MID", "MID", "OPP", "OUT", "OUT"]);
    });

    it("gives SET to the eligible setter with the highest setting", () => {
        const out = pickProjectedStarters([
            cand("s1", ["SET"], {setting: 70}),
            cand("s2", ["SET"], {setting: 90}),
        ]);
        expect(out.find((s) => s.slot === "SET")?.playerId).toBe("s2");
    });

    it("breaks equal scores by higher OVR, then player id", () => {
        const a = pickProjectedStarters([
            cand("b", ["SET"], {setting: 80, ovr: 70}),
            cand("a", ["SET"], {setting: 80, ovr: 75}),
        ]);
        expect(a.find((s) => s.slot === "SET")?.playerId).toBe("a");

        const b = pickProjectedStarters([
            cand("b", ["SET"], {setting: 80, ovr: 70}),
            cand("a", ["SET"], {setting: 80, ovr: 70}),
        ]);
        expect(b.find((s) => s.slot === "SET")?.playerId).toBe("a");
    });

    it("uses a player in one slot only, taking SET first by fill order", () => {
        const out = pickProjectedStarters([cand("dual", ["SET", "OUT"], {setting: 90, spiking: 99, receiving: 99})]);
        expect(out.filter((s) => s.playerId === "dual").map((s) => s.slot)).toEqual(["SET"]);
    });

    it("never places an OUT-listed player at MID in pass 1", () => {
        const out = pickProjectedStarters([
            cand("hitter", ["OUT"], {spiking: 99, blocking: 99}),
            cand("mid", ["MID"], {spiking: 40, blocking: 40}),
        ]);
        const mids = out.filter((s) => s.slot === "MID").map((s) => s.playerId);
        expect(mids).toContain("mid");
        expect(mids).not.toContain("hitter");
        expect(out.filter((s) => s.slot === "OUT").map((s) => s.playerId)).toContain("hitter");
    });

    it("fills an empty LIB in pass 2 from the highest receives of any remaining player", () => {
        const out = pickProjectedStarters([
            cand("o1", ["OUT"], null, {assists: 0, receives: 3, blocks: 0, kills: 4}),
            cand("o2", ["OUT"], null, {assists: 0, receives: 6, blocks: 0, kills: 2}),
        ]);
        expect(out.find((s) => s.slot === "LIB")?.playerId).toBe("o2");
    });

    it("leaves every slot empty with no candidates", () => {
        const out = pickProjectedStarters([]);
        expect(out).toHaveLength(7);
        expect(out.every((s) => s.playerId === null)).toBe(true);
    });

    it("returns slots in display order SET, OPP, OUT, OUT, MID, MID, LIB", () => {
        expect(pickProjectedStarters([]).map((s) => s.slot)).toEqual(["SET", "OPP", "OUT", "OUT", "MID", "MID", "LIB"]);
    });

    it("keeps a full card-based lineup and its scoring", () => {
        const out = pickProjectedStarters([
            cand("set", ["SET"], {setting: 80}),
            cand("lib", ["LIB"], {receiving: 80}),
            cand("m1", ["MID"], {blocking: 80, spiking: 60}),
            cand("m2", ["MID"], {blocking: 70, spiking: 60}),
            cand("m3", ["MID"], {blocking: 50, spiking: 50}),
            cand("opp", ["OPP"], {scoring: 80, spiking: 80}),
            cand("o1", ["OUT"], {spiking: 80, receiving: 70}),
            cand("o2", ["OUT"], {spiking: 75, receiving: 70}),
        ]);
        expect(slotsOf(out)).toEqual(["SET:set", "OPP:opp", "OUT:o1", "OUT:o2", "MID:m1", "MID:m2", "LIB:lib"]);
    });
});
