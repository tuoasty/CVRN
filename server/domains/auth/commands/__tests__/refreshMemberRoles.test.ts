import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";

const mocks = vi.hoisted(() => ({
    findUserAccount: vi.fn(),
    updateUserAccountRoles: vi.fn(),
    getGuildMember: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/userAccounts.repo", () => ({
    findUserAccount: mocks.findUserAccount,
    updateUserAccountRoles: mocks.updateUserAccountRoles,
}));
vi.mock("@/server/discord/client", () => ({getGuildMember: mocks.getGuildMember}));
vi.mock("@/server/supabase/admin", () => ({getSupabaseAdmin: () => ({})}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {refreshMemberRoles} from "../refreshMemberRoles";

const now = new Date("2026-11-11T12:00:00.000Z");
const account = {
    user_id: "u1",
    discord_user_id: "d1",
    role_ids: ["old"],
    roles_verified_at: "2026-11-11T11:00:00.000Z",
    roles_valid_until: "2026-11-11T11:05:00.000Z",
};

describe("refreshMemberRoles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.findUserAccount.mockResolvedValue(Ok(account));
        mocks.updateUserAccountRoles.mockResolvedValue(Ok(true));
    });

    it("two concurrent calls for the same user make one Discord call", async () => {
        let release: (v: unknown) => void = () => {};
        mocks.getGuildMember.mockReturnValue(new Promise((r) => { release = r; }));

        const a = refreshMemberRoles("u1", now);
        const b = refreshMemberRoles("u1", now);
        await Promise.resolve();
        release(Ok({roles: ["r1"]}));
        const [ra, rb] = await Promise.all([a, b]);

        expect(mocks.getGuildMember).toHaveBeenCalledTimes(1);
        expect(ra).toEqual(rb);
        expect(ra).toEqual(Ok({roleIds: ["r1"], rolesVerifiedAt: "2026-11-11T12:00:00.000Z", rolesValidUntil: "2026-11-11T12:05:00.000Z"}));
    });

    it("a not-member result writes empty roles", async () => {
        mocks.getGuildMember.mockResolvedValue(Ok(null));

        await refreshMemberRoles("u1", now);

        expect(mocks.updateUserAccountRoles).toHaveBeenCalledWith({}, "u1", {
            roleIds: [], rolesVerifiedAt: "2026-11-11T12:00:00.000Z", rolesValidUntil: "2026-11-11T12:05:00.000Z",
        });
    });

    it("a Discord error inside the grace hour keeps roles", async () => {
        mocks.getGuildMember.mockResolvedValue(Err({message: "down", code: "INTEGRATION_ERROR"}));

        const result = await refreshMemberRoles("u1", new Date("2026-11-11T11:30:00.000Z"));

        expect(result).toEqual(Ok({roleIds: ["old"], rolesVerifiedAt: "2026-11-11T11:00:00.000Z", rolesValidUntil: "2026-11-11T11:35:00.000Z"}));
    });

    it("no account row returns NOT_FOUND without calling Discord", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok(null));

        const result = await refreshMemberRoles("u1", now);

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
        expect(mocks.getGuildMember).not.toHaveBeenCalled();
    });
});
