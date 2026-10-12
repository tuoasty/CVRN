import {describe, it, expect} from "vitest";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {stagedAwardsReducer, stagedChipLabel, toBatchAwards} from "../stagedAwards";
import {BarTarget, StagedItem} from "../types";
import {Spec} from "@/shared/types/db";

function player(id: string, username: string): PlayerWithTeamInfo {
    return {
        id,
        roblox_user_id: "1",
        username,
        display_name: null,
        avatar_url: null,
        current_team_id: null,
        current_season_id: null,
        current_team_name: null,
    };
}

const individual: BarTarget = {category: "individual_winners", team: "B", slot: "sub"};
const allStarSub: BarTarget = {category: "all_star", team: "B", slot: "sub"};

describe("stagedAwardsReducer", () => {
    it("adds a trimmed award and drops team and slot outside All-Star", () => {
        const state = stagedAwardsReducer([], {type: "add", tempId: "t1", target: individual, awardName: "  MVP ", player: player("p1", "kairo")});
        expect(state).toEqual([{tempId: "t1", awardName: "MVP", category: "individual_winners", player: player("p1", "kairo")}]);
    });

    it("keeps team and slot for All-Star", () => {
        const state = stagedAwardsReducer([], {type: "add", tempId: "t1", target: allStarSub, awardName: "OH", player: player("p1", "arc")});
        expect(state[0]).toMatchObject({category: "all_star", allStarTeam: "B", allStarSlot: "sub"});
    });

    it("ignores a blank award name", () => {
        const before: StagedItem[] = [];
        const after = stagedAwardsReducer(before, {type: "add", tempId: "t1", target: individual, awardName: "   ", player: player("p1", "x")});
        expect(after).toBe(before);
    });

    it("appends in entry order", () => {
        let state = stagedAwardsReducer([], {type: "add", tempId: "t1", target: individual, awardName: "MVP", player: player("p1", "a")});
        state = stagedAwardsReducer(state, {type: "add", tempId: "t2", target: individual, awardName: "Finals MVP", player: player("p2", "b")});
        expect(state.map(a => a.tempId)).toEqual(["t1", "t2"]);
    });

    it("removes by temp id and clears", () => {
        let state = stagedAwardsReducer([], {type: "add", tempId: "t1", target: individual, awardName: "MVP", player: player("p1", "a")});
        state = stagedAwardsReducer(state, {type: "add", tempId: "t2", target: allStarSub, awardName: "OH", player: player("p2", "b")});
        expect(stagedAwardsReducer(state, {type: "remove", tempId: "t1"}).map(a => a.tempId)).toEqual(["t2"]);
        expect(stagedAwardsReducer(state, {type: "clear"})).toEqual([]);
    });

    it("returns the same array when clearing an empty list", () => {
        const empty: StagedItem[] = [];
        expect(stagedAwardsReducer(empty, {type: "clear"})).toBe(empty);
    });
});

function spec(id: string, name: string): Spec {
    return {id, name, stars: 4, position: "OH", is_vaulted: false} as Spec;
}

describe("spec staging", () => {
    it("ignores an award add while the target is Spec", () => {
        const before: StagedItem[] = [];
        const after = stagedAwardsReducer(before, {type: "add", tempId: "t1", target: {...individual, category: "spec"}, awardName: "MVP", player: player("p1", "a")});
        expect(after).toBe(before);
    });

    it("stages a spec winner with its stars", () => {
        const state = stagedAwardsReducer([], {type: "addSpec", tempId: "t1", spec: spec("s1", "Ace Hunter"), stars: 3, player: player("p1", "sp1ke")});
        expect(state).toEqual([{tempId: "t1", category: "spec", spec: spec("s1", "Ace Hunter"), stars: 3, player: player("p1", "sp1ke")}]);
    });

    it("replaces an earlier staged winner of the same spec, keeping other specs", () => {
        let state = stagedAwardsReducer([], {type: "addSpec", tempId: "t1", spec: spec("s1", "Ace Hunter"), stars: 3, player: player("p1", "a")});
        state = stagedAwardsReducer(state, {type: "addSpec", tempId: "t2", spec: spec("s2", "The Wall"), stars: 5, player: player("p2", "b")});
        state = stagedAwardsReducer(state, {type: "addSpec", tempId: "t3", spec: spec("s1", "Ace Hunter"), stars: 4, player: player("p3", "c")});
        expect(state.map(s => s.tempId)).toEqual(["t2", "t3"]);
    });

    it("removes several items at once", () => {
        let state = stagedAwardsReducer([], {type: "add", tempId: "t1", target: individual, awardName: "MVP", player: player("p1", "a")});
        state = stagedAwardsReducer(state, {type: "addSpec", tempId: "t2", spec: spec("s1", "Ace Hunter"), stars: 3, player: player("p2", "b")});
        state = stagedAwardsReducer(state, {type: "add", tempId: "t3", target: individual, awardName: "Finals MVP", player: player("p3", "c")});
        expect(stagedAwardsReducer(state, {type: "removeMany", tempIds: ["t1", "t3"]}).map(s => s.tempId)).toEqual(["t2"]);
    });

    it("leaves spec winners out of the award batch and labels them with stars", () => {
        let state = stagedAwardsReducer([], {type: "addSpec", tempId: "t1", spec: spec("s1", "Ace Hunter"), stars: 3, player: player("p1", "sp1ke")});
        state = stagedAwardsReducer(state, {type: "add", tempId: "t2", target: individual, awardName: "MVP", player: player("p2", "a")});
        expect(toBatchAwards(state).map(a => a.awardName)).toEqual(["MVP"]);
        expect(stagedChipLabel(state[0])).toBe("Spec · Ace Hunter ★3 · @sp1ke");
    });
});

describe("toBatchAwards", () => {
    it("maps staged awards to the batch payload", () => {
        let state = stagedAwardsReducer([], {type: "add", tempId: "t1", target: individual, awardName: "MVP", player: player("p1", "a")});
        state = stagedAwardsReducer(state, {type: "add", tempId: "t2", target: allStarSub, awardName: "OH", player: player("p2", "b")});
        expect(toBatchAwards(state)).toEqual([
            {playerId: "p1", awardName: "MVP", category: "individual_winners", allStarTeam: undefined, allStarSlot: undefined},
            {playerId: "p2", awardName: "OH", category: "all_star", allStarTeam: "B", allStarSlot: "sub"},
        ]);
    });
});

describe("stagedChipLabel", () => {
    it("labels All-Star subs with team and slot", () => {
        const [a] = stagedAwardsReducer([], {type: "add", tempId: "t1", target: allStarSub, awardName: "OH", player: player("p1", "arc")});
        expect(stagedChipLabel(a)).toBe("All-Star B Sub · OH · @arc");
    });

    it("labels other categories by name", () => {
        const [a] = stagedAwardsReducer([], {type: "add", tempId: "t1", target: {...individual, category: "staff_team"}, awardName: "Best Media", player: player("p1", "lens")});
        expect(stagedChipLabel(a)).toBe("Staff · Best Media · @lens");
    });
});
