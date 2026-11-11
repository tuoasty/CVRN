import {beforeEach, describe, expect, it, vi} from "vitest";
import {Ok} from "@/shared/types/result";

const mocks = vi.hoisted(() => ({findMatchById: vi.fn(), deleteMatch: vi.fn()}));

vi.mock("@/server/db/matches.repo", () => ({findMatchById: mocks.findMatchById, deleteMatch: mocks.deleteMatch}));
vi.mock("@/server/utils/logger", () => ({logger: {info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()}}));

import {deleteMatchService} from "../deleteMatch";
import type {DBClient} from "@/shared/types/db";

const db = {} as DBClient;

describe("deleteMatchService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.deleteMatch.mockResolvedValue(Ok(undefined));
    });

    it("refuses a completed match to anyone but a super admin", async () => {
        mocks.findMatchById.mockResolvedValue(Ok({id: "m1", status: "completed", match_type: "season"}));

        const result = await deleteMatchService(db, "m1", {isSuperAdmin: false});

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("FORBIDDEN");
            expect(result.error.message).toBe("Only a super admin can delete a completed match.");
        }
        expect(mocks.deleteMatch).not.toHaveBeenCalled();
    });

    it("deletes a scheduled match for an admin", async () => {
        mocks.findMatchById.mockResolvedValue(Ok({id: "m1", status: "scheduled", match_type: "season"}));

        const result = await deleteMatchService(db, "m1", {isSuperAdmin: false});

        expect(result.ok).toBe(true);
        expect(mocks.deleteMatch).toHaveBeenCalledWith(db, "m1");
    });
});
