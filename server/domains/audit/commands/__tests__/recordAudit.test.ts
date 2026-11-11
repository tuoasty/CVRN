import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";

const mocks = vi.hoisted(() => ({
    findUserAccount: vi.fn(),
    insertAuditEntry: vi.fn(),
    loggerError: vi.fn(),
    pending: [] as Promise<unknown>[],
}));

vi.mock("@/server/utils/runInBackground", () => ({
    runInBackground: (fn: () => Promise<unknown>) => {
        mocks.pending.push(fn().catch(() => undefined));
    },
}));
vi.mock("@/server/supabase/admin", () => ({getSupabaseAdmin: () => ({})}));
vi.mock("@/server/db/userAccounts.repo", () => ({findUserAccount: mocks.findUserAccount}));
vi.mock("@/server/db/auditLog.repo", () => ({insertAuditEntry: mocks.insertAuditEntry}));
vi.mock("@/server/utils/logger", () => ({logger: {error: mocks.loggerError}}));

import {recordAudit} from "../recordAudit";

async function flush() {
    await Promise.all(mocks.pending.splice(0));
}

const account = {
    user_id: "u1",
    discord_user_id: "d1",
    discord_display_name: "Kev",
    discord_username: "kev",
    discord_avatar_url: "https://cdn.discordapp.com/a.png",
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.pending.length = 0;
});

describe("recordAudit", () => {
    it("inserts with the account snapshot", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok(account));
        mocks.insertAuditEntry.mockResolvedValue(Ok(true));

        recordAudit({userId: "u1", groups: ["admin"], action: "completeMatch", outcome: "allowed", target: {matchId: "m1"}});
        await flush();

        expect(mocks.insertAuditEntry).toHaveBeenCalledWith({}, {
            kind: "action",
            user_id: "u1",
            discord_user_id: "d1",
            display_name: "Kev",
            username: "kev",
            avatar_url: "https://cdn.discordapp.com/a.png",
            groups: ["admin"],
            action: "completeMatch",
            outcome: "allowed",
            target: {matchId: "m1"},
        });
    });

    it("uses a given snapshot without reading the account", async () => {
        mocks.insertAuditEntry.mockResolvedValue(Ok(true));

        recordAudit({
            kind: "auth",
            userId: null,
            groups: [],
            action: "signIn",
            outcome: "denied",
            target: {reason: "no_role"},
            snapshot: {discordUserId: "d9", displayName: "New", username: "new", avatarUrl: null},
        });
        await flush();

        expect(mocks.findUserAccount).not.toHaveBeenCalled();
        expect(mocks.insertAuditEntry).toHaveBeenCalledWith({}, expect.objectContaining({
            kind: "auth",
            user_id: null,
            discord_user_id: "d9",
            display_name: "New",
            target: {reason: "no_role"},
        }));
    });

    it("still inserts when the account read fails", async () => {
        mocks.findUserAccount.mockResolvedValue(Err({message: "boom", code: "DB_ERROR"}));
        mocks.insertAuditEntry.mockResolvedValue(Ok(true));

        recordAudit({userId: "u1", groups: ["admin"], action: "completeMatch", outcome: "allowed"});
        await flush();

        expect(mocks.insertAuditEntry).toHaveBeenCalledWith({}, expect.objectContaining({
            user_id: "u1",
            discord_user_id: null,
            target: null,
        }));
    });

    it("an insert error does not throw", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok(account));
        mocks.insertAuditEntry.mockResolvedValue(Err({message: "boom", code: "DB_ERROR"}));

        expect(() => recordAudit({userId: "u1", groups: ["admin"], action: "completeMatch", outcome: "allowed"})).not.toThrow();
        await flush();

        expect(mocks.loggerError).toHaveBeenCalled();
    });

    it("a rejected insert does not throw", async () => {
        mocks.findUserAccount.mockResolvedValue(Ok(account));
        mocks.insertAuditEntry.mockRejectedValue(new Error("network"));

        expect(() => recordAudit({userId: "u1", groups: ["admin"], action: "completeMatch", outcome: "allowed"})).not.toThrow();
        await flush();

        expect(mocks.loggerError).toHaveBeenCalled();
    });
});
