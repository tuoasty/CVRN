import {beforeEach, describe, expect, it, vi} from "vitest";
import {Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({getCurrentGroups: vi.fn()}));

vi.mock("@/server/domains/auth/queries/getCurrentGroups", () => ({getCurrentGroups: mocks.getCurrentGroups}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {clearUserRoleCache, getUserRole} from "../roles.repo";

function clientWithoutRoleRow() {
    const single = vi.fn().mockResolvedValue({data: null, error: {code: "PGRST116"}});
    return {from: () => ({select: () => ({eq: () => ({single})})})} as unknown as DBClient;
}

describe("getUserRole bridge", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearUserRoleCache();
    });

    it("maps Discord super_admin to the old super_admin role", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok(["super_admin", "admin", "statistics"]));
        expect(await getUserRole(clientWithoutRoleRow(), "u1")).toEqual(Ok("super_admin"));
    });

    it("maps Discord admin to the old admin role", async () => {
        mocks.getCurrentGroups.mockResolvedValue(Ok(["admin"]));
        expect(await getUserRole(clientWithoutRoleRow(), "u1")).toEqual(Ok("admin"));
    });

    it("returns null for other groups and does not cache the fallback", async () => {
        mocks.getCurrentGroups.mockResolvedValueOnce(Ok(["statistics"])).mockResolvedValueOnce(Ok(["admin"]));
        const client = clientWithoutRoleRow();

        expect(await getUserRole(client, "u1")).toEqual(Ok(null));
        expect(await getUserRole(client, "u1")).toEqual(Ok("admin"));
    });
});
