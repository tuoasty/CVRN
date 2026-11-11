import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({
    findAuditEntries: vi.fn(),
    findAllUserAccounts: vi.fn(),
    admin: {},
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/auditLog.repo", () => ({findAuditEntries: mocks.findAuditEntries}));
vi.mock("@/server/db/userAccounts.repo", () => ({findAllUserAccounts: mocks.findAllUserAccounts}));
vi.mock("@/server/supabase/admin", () => ({getSupabaseAdmin: () => mocks.admin}));

import {getAuditLog} from "../getAuditLog";

const supabase = {} as DBClient;

function row(id: number) {
    return {
        id,
        created_at: "2026-11-11T10:00:00Z",
        kind: "action",
        user_id: "u1",
        discord_user_id: "d1",
        display_name: "Kev",
        username: "kev",
        avatar_url: null,
        groups: ["admin"],
        action: "completeMatch",
        outcome: "allowed",
        target: {matchId: "m1"},
    };
}

function rows(from: number, count: number) {
    return Array.from({length: count}, (_, i) => row(from - i));
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.findAllUserAccounts.mockResolvedValue(Ok([
        {user_id: "u1", discord_display_name: "Kev", discord_username: "kev"},
        {user_id: "u2", discord_display_name: null, discord_username: "alt"},
    ]));
});

describe("getAuditLog", () => {
    it("returns 50 entries and a cursor when 51 come back", async () => {
        mocks.findAuditEntries.mockResolvedValue(Ok(rows(100, 51)));

        const result = await getAuditLog(supabase, {});

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.entries).toHaveLength(50);
        expect(result.value.nextCursor).toBe(51);
        expect(result.value.entries[0]).toEqual({
            id: 100,
            createdAt: "2026-11-11T10:00:00Z",
            kind: "action",
            userId: "u1",
            displayName: "Kev",
            username: "kev",
            avatarUrl: null,
            groups: ["admin"],
            action: "completeMatch",
            outcome: "allowed",
            target: {matchId: "m1"},
        });
    });

    it("no cursor on the last page", async () => {
        mocks.findAuditEntries.mockResolvedValue(Ok(rows(10, 10)));

        const result = await getAuditLog(supabase, {});

        expect(result.ok && result.value.nextCursor).toBe(null);
        expect(result.ok && result.value.entries).toHaveLength(10);
    });

    it("passes the cursor and a limit of 51 to the repo", async () => {
        mocks.findAuditEntries.mockResolvedValue(Ok([]));

        await getAuditLog(supabase, {before: 51});

        expect(mocks.findAuditEntries).toHaveBeenCalledWith(supabase, expect.objectContaining({before: 51, limit: 51}));
    });

    it("passes kind, outcome and person filters", async () => {
        mocks.findAuditEntries.mockResolvedValue(Ok([]));

        await getAuditLog(supabase, {kind: "auth", outcome: "denied", userId: "u2"});

        expect(mocks.findAuditEntries).toHaveBeenCalledWith(supabase, expect.objectContaining({kind: "auth", outcome: "denied", userId: "u2"}));
    });

    it("drops spaces from the action search so a humanized name matches", async () => {
        mocks.findAuditEntries.mockResolvedValue(Ok([]));

        await getAuditLog(supabase, {action: "complete match"});

        expect(mocks.findAuditEntries).toHaveBeenCalledWith(supabase, expect.objectContaining({action: "completematch"}));
    });

    it("lists people from accounts with the service role, by name", async () => {
        mocks.findAuditEntries.mockResolvedValue(Ok([]));

        const result = await getAuditLog(supabase, {});

        expect(mocks.findAllUserAccounts).toHaveBeenCalledWith(mocks.admin);
        expect(result.ok && result.value.people).toEqual([
            {userId: "u2", displayName: null, username: "alt"},
            {userId: "u1", displayName: "Kev", username: "kev"},
        ]);
    });

    it("returns the entries error", async () => {
        mocks.findAuditEntries.mockResolvedValue(Err({message: "boom", code: "DB_ERROR"}));

        const result = await getAuditLog(supabase, {});

        expect(result.ok).toBe(false);
    });
});
