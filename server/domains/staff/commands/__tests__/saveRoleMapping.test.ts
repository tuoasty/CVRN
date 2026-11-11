import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({
    deleteRoleGroupsExcept: vi.fn(),
    upsertRoleGroups: vi.fn(),
}));

vi.mock("@/server/db/roleGroups.repo", () => ({
    deleteRoleGroupsExcept: mocks.deleteRoleGroupsExcept,
    upsertRoleGroups: mocks.upsertRoleGroups,
}));

import {saveRoleMapping} from "../saveRoleMapping";

const client = {} as DBClient;
const ACTOR = "22222222-2222-4222-8222-222222222222";

describe("saveRoleMapping", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.deleteRoleGroupsExcept.mockResolvedValue(Ok(true));
        mocks.upsertRoleGroups.mockResolvedValue(Ok(true));
    });

    it("applies every role change in one call", async () => {
        const result = await saveRoleMapping(client, {
            changes: [
                {roleId: "1", groups: ["admin", "graphics"]},
                {roleId: "2", groups: []},
            ],
        }, ACTOR);

        expect(result.ok).toBe(true);
        expect(mocks.deleteRoleGroupsExcept).toHaveBeenCalledWith(client, "1", ["admin", "graphics"]);
        expect(mocks.upsertRoleGroups).toHaveBeenCalledWith(client, "1", ["admin", "graphics"], ACTOR);
        expect(mocks.deleteRoleGroupsExcept).toHaveBeenCalledWith(client, "2", []);
        expect(mocks.upsertRoleGroups).toHaveBeenCalledWith(client, "2", [], ACTOR);
    });

    it("stops at the first failing role and reports it", async () => {
        mocks.deleteRoleGroupsExcept
            .mockResolvedValueOnce(Ok(true))
            .mockResolvedValueOnce(Err({message: "denied", code: "DB_ERROR"}));

        const result = await saveRoleMapping(client, {
            changes: [
                {roleId: "1", groups: ["admin"]},
                {roleId: "2", groups: ["media"]},
                {roleId: "3", groups: ["specs"]},
            ],
        }, ACTOR);

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.message).toContain("2");
        expect(mocks.deleteRoleGroupsExcept).not.toHaveBeenCalledWith(client, "3", ["specs"]);
    });
});
