import {describe, expect, it} from "vitest";
import type {DBClient} from "@/shared/types/db";
import {findAuditEntries} from "../auditLog.repo";

function stubClient() {
    const calls: [string, ...unknown[]][] = [];
    const builder = {
        select: (...args: unknown[]) => (calls.push(["select", ...args]), builder),
        order: (...args: unknown[]) => (calls.push(["order", ...args]), builder),
        limit: (...args: unknown[]) => (calls.push(["limit", ...args]), builder),
        lt: (...args: unknown[]) => (calls.push(["lt", ...args]), builder),
        eq: (...args: unknown[]) => (calls.push(["eq", ...args]), builder),
        ilike: (...args: unknown[]) => (calls.push(["ilike", ...args]), builder),
        then(resolve: (value: {data: unknown[]; error: null}) => unknown) {
            return Promise.resolve({data: [], error: null}).then(resolve);
        },
    };
    const client = {from: (table: string) => (calls.push(["from", table]), builder)} as unknown as DBClient;
    return {client, calls};
}

describe("findAuditEntries", () => {
    it("orders newest first with no filters", async () => {
        const {client, calls} = stubClient();

        await findAuditEntries(client, {limit: 51});

        expect(calls).toEqual([
            ["from", "audit_log"],
            ["select", "*"],
            ["order", "id", {ascending: false}],
            ["limit", 51],
        ]);
    });

    it("passes the cursor as lt id and every filter", async () => {
        const {client, calls} = stubClient();

        await findAuditEntries(client, {before: 51, userId: "u1", action: "complete", kind: "action", outcome: "denied", limit: 51});

        expect(calls).toEqual(expect.arrayContaining([
            ["lt", "id", 51],
            ["eq", "user_id", "u1"],
            ["ilike", "action", "%complete%"],
            ["eq", "kind", "action"],
            ["eq", "outcome", "denied"],
        ]));
    });
});
