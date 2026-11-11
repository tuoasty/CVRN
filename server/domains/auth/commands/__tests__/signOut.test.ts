import {beforeEach, describe, expect, it, vi} from "vitest";
import {Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({
    recordAudit: vi.fn(),
    getCurrentGroups: vi.fn(),
}));

vi.mock("@/server/domains/audit", () => ({recordAudit: mocks.recordAudit}));
vi.mock("../../queries/getCurrentGroups", () => ({getCurrentGroups: mocks.getCurrentGroups}));
vi.mock("@/server/utils/logger", () => ({logger: {error: vi.fn(), info: vi.fn(), warn: vi.fn()}}));

import {signOut} from "../signOut";

function client(user: {id: string} | null) {
    const order: string[] = [];
    const supabase = {
        auth: {
            getUser: vi.fn().mockResolvedValue({data: {user}}),
            signOut: vi.fn().mockImplementation(async () => {
                order.push("signOut");
                return {error: null};
            }),
        },
    } as unknown as DBClient;
    return {supabase, order};
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.recordAudit.mockImplementation(() => undefined);
});

describe("signOut", () => {
    it("records signOut with the groups before signing out", async () => {
        const {supabase, order} = client({id: "u1"});
        mocks.getCurrentGroups.mockResolvedValue(Ok(["graphics"]));
        mocks.recordAudit.mockImplementation(() => {
            order.push("audit");
        });

        const result = await signOut(supabase);

        expect(result.ok).toBe(true);
        expect(mocks.recordAudit).toHaveBeenCalledWith({
            kind: "auth",
            userId: "u1",
            groups: ["graphics"],
            action: "signOut",
            outcome: "allowed",
        });
        expect(order).toEqual(["audit", "signOut"]);
    });

    it("records nothing without a user", async () => {
        const {supabase} = client(null);

        const result = await signOut(supabase);

        expect(result.ok).toBe(true);
        expect(mocks.recordAudit).not.toHaveBeenCalled();
    });

    it("records nothing for a session with no groups", async () => {
        const {supabase} = client({id: "u1"});
        mocks.getCurrentGroups.mockResolvedValue(Ok([]));

        await signOut(supabase);

        expect(mocks.recordAudit).not.toHaveBeenCalled();
    });
});
