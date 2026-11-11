import {beforeEach, describe, expect, it, vi} from "vitest";
import {Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";
import {OWNER_DISCORD_ID} from "@/shared/auth/owner";

const mocks = vi.hoisted(() => ({
    findUserAccount: vi.fn(),
    findUserBlocks: vi.fn(),
    insertUserBlocks: vi.fn(),
    deleteUserBlocks: vi.fn(),
}));

vi.mock("@/server/db/userAccounts.repo", () => ({findUserAccount: mocks.findUserAccount}));
vi.mock("@/server/db/roleGroups.repo", () => ({
    findUserBlocks: mocks.findUserBlocks,
    insertUserBlocks: mocks.insertUserBlocks,
    deleteUserBlocks: mocks.deleteUserBlocks,
}));

import {setUserBlocks} from "../setUserBlocks";

const client = {} as DBClient;
const USER = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";

function block(group_name: string | null) {
    return {user_id: USER, group_name, blocked_by: ACTOR, blocked_at: "2026-11-11T00:00:00Z"};
}

describe("setUserBlocks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.findUserAccount.mockResolvedValue(Ok({user_id: USER, discord_user_id: "999"}));
        mocks.findUserBlocks.mockResolvedValue(Ok([]));
        mocks.insertUserBlocks.mockResolvedValue(Ok(true));
        mocks.deleteUserBlocks.mockResolvedValue(Ok(true));
    });

    it("blocking the owner is FORBIDDEN", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok({user_id: USER, discord_user_id: OWNER_DISCORD_ID}));

        const result = await setUserBlocks(client, {userId: USER, blocked: "all"}, ACTOR);

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
        expect(mocks.insertUserBlocks).not.toHaveBeenCalled();
        expect(mocks.deleteUserBlocks).not.toHaveBeenCalled();
    });

    it("'all' writes one null-group row", async () => {
        const result = await setUserBlocks(client, {userId: USER, blocked: "all"}, ACTOR);

        expect(result.ok).toBe(true);
        expect(mocks.insertUserBlocks).toHaveBeenCalledWith(client, USER, [null], ACTOR);
        expect(mocks.deleteUserBlocks).not.toHaveBeenCalled();
    });

    it("'all' adds the null row before removing per-group rows", async () => {
        mocks.findUserBlocks.mockResolvedValue(Ok([block("graphics")]));
        const order: string[] = [];
        mocks.insertUserBlocks.mockImplementation(async () => { order.push("insert"); return Ok(true); });
        mocks.deleteUserBlocks.mockImplementation(async () => { order.push("delete"); return Ok(true); });

        await setUserBlocks(client, {userId: USER, blocked: "all"}, ACTOR);

        expect(mocks.insertUserBlocks).toHaveBeenCalledWith(client, USER, [null], ACTOR);
        expect(mocks.deleteUserBlocks).toHaveBeenCalledWith(client, USER, ["graphics"]);
        expect(order).toEqual(["insert", "delete"]);
    });

    it("null clears blocks", async () => {
        mocks.findUserBlocks.mockResolvedValue(Ok([block("admin"), block(null)]));

        const result = await setUserBlocks(client, {userId: USER, blocked: null}, ACTOR);

        expect(result.ok).toBe(true);
        expect(mocks.insertUserBlocks).not.toHaveBeenCalled();
        expect(mocks.deleteUserBlocks).toHaveBeenCalledWith(client, USER, ["admin", null]);
    });

    it("a user with no Discord account is NOT_FOUND", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok(null));

        const result = await setUserBlocks(client, {userId: USER, blocked: ["admin"]}, ACTOR);

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });
});
