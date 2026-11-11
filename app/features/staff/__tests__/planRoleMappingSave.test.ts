import {describe, expect, it} from "vitest";
import type {StaffRole} from "@/server/domains/staff/types";
import {planRoleMappingSave} from "../planRoleMappingSave";

function role(id: string, groups: StaffRole["groups"], deleted = false): StaffRole {
    return {id, name: `Role ${id}`, groups, deleted};
}

const server = [role("1", ["admin"]), role("2", ["graphics", "media"])];

describe("planRoleMappingSave", () => {
    it("no edits means no changes", () => {
        expect(planRoleMappingSave(server, [], {})).toEqual({changes: [], removed: [], superAdminGrants: []});
    });

    it("an edit back to the saved groups is not a change, in any order", () => {
        const plan = planRoleMappingSave(server, [], {"2": ["media", "graphics"]});
        expect(plan.changes).toEqual([]);
    });

    it("an edited role is a change with its groups in canonical order", () => {
        const plan = planRoleMappingSave(server, [], {"1": ["awards", "admin"]});
        expect(plan.changes).toEqual([{roleId: "1", groups: ["admin", "awards"]}]);
    });

    it("a saved role left with no groups is a change and listed as removed", () => {
        const plan = planRoleMappingSave(server, [], {"2": []});
        expect(plan.changes).toEqual([{roleId: "2", groups: []}]);
        expect(plan.removed.map(r => r.id)).toEqual(["2"]);
    });

    it("an added role with groups is a change; one with none is ignored", () => {
        const plan = planRoleMappingSave(server, [role("9", []), role("8", [])], {"9": ["specs"]});
        expect(plan.changes).toEqual([{roleId: "9", groups: ["specs"]}]);
        expect(plan.removed).toEqual([]);
    });

    it("flags roles that newly get super admin, not ones that already had it", () => {
        const withOwner = [...server, role("3", ["super_admin"])];
        const plan = planRoleMappingSave(withOwner, [], {"1": ["super_admin", "admin"], "3": ["super_admin", "awards"]});
        expect(plan.superAdminGrants.map(r => r.id)).toEqual(["1"]);
    });
});
