import {beforeEach, describe, expect, it, vi} from "vitest";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({recordAudit: vi.fn()}));
vi.mock("@/server/domains/audit", () => ({recordAudit: mocks.recordAudit}));

import {requireGroups} from "../requireGroups";

beforeEach(() => {
    mocks.recordAudit.mockReset();
});

function client(user: {id: string} | null, groups: string[] | null, rpcError: unknown = null) {
    return {
        auth: {getUser: vi.fn().mockResolvedValue({data: {user}})},
        rpc: vi.fn().mockResolvedValue({data: groups, error: rpcError}),
    } as unknown as DBClient;
}

describe("requireGroups", () => {
    it("super_admin passes a statistics-only check", async () => {
        const result = await requireGroups(client({id: "u1"}, ["super_admin"]), ["statistics"]);
        expect(result).toEqual({ok: true, value: {userId: "u1", groups: ["super_admin"]}});
    });

    it("passes when any listed group is held", async () => {
        const result = await requireGroups(client({id: "u1"}, ["media", "statistics"]), ["admin", "statistics"]);
        expect(result.ok).toBe(true);
    });

    it("admin fails a statistics-only check", async () => {
        const result = await requireGroups(client({id: "u1"}, ["admin"]), ["statistics"]);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
    });

    it("empty groups (blocked or expired) is FORBIDDEN", async () => {
        const result = await requireGroups(client({id: "u1"}, []), ["admin"]);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
    });

    it("no user is UNAUTHORIZED", async () => {
        const result = await requireGroups(client(null, null), ["admin"]);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("UNAUTHORIZED");
    });

    it("an rpc error is a DB_ERROR, not access", async () => {
        const result = await requireGroups(client({id: "u1"}, null, {message: "boom"}), ["admin"]);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("DB_ERROR");
    });
});

describe("requireGroups audit", () => {
    it("records allowed with the action and target", async () => {
        const result = await requireGroups(client({id: "u1"}, ["admin"]), ["admin"], {action: "completeMatch", target: {matchId: "m1"}});
        expect(result.ok).toBe(true);
        expect(mocks.recordAudit).toHaveBeenCalledWith({
            userId: "u1",
            groups: ["admin"],
            action: "completeMatch",
            outcome: "allowed",
            target: {matchId: "m1"},
        });
    });

    it("records denied for a graphics user on an admin action", async () => {
        const result = await requireGroups(client({id: "u2"}, ["graphics"]), ["admin"], {action: "deleteTeam", target: {teamId: "t1"}});
        expect(result.ok).toBe(false);
        expect(mocks.recordAudit).toHaveBeenCalledWith({
            userId: "u2",
            groups: ["graphics"],
            action: "deleteTeam",
            outcome: "denied",
            target: {teamId: "t1"},
        });
    });

    it("records nothing without the audit argument", async () => {
        await requireGroups(client({id: "u1"}, ["admin"]), ["admin"]);
        await requireGroups(client({id: "u2"}, ["graphics"]), ["admin"]);
        expect(mocks.recordAudit).not.toHaveBeenCalled();
    });

    it("records nothing when there is no user", async () => {
        await requireGroups(client(null, null), ["admin"], {action: "deleteTeam"});
        expect(mocks.recordAudit).not.toHaveBeenCalled();
    });

    it("records nothing for a session with no groups", async () => {
        await requireGroups(client({id: "u3"}, []), ["admin"], {action: "deleteTeam"});
        expect(mocks.recordAudit).not.toHaveBeenCalled();
    });

    it("records nothing when the group lookup fails", async () => {
        await requireGroups(client({id: "u1"}, null, {message: "boom"}), ["admin"], {action: "deleteTeam"});
        expect(mocks.recordAudit).not.toHaveBeenCalled();
    });
});
