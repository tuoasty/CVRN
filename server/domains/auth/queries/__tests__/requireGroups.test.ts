import {describe, expect, it, vi} from "vitest";
import type {DBClient} from "@/shared/types/db";
import {requireGroups} from "../requireGroups";

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
