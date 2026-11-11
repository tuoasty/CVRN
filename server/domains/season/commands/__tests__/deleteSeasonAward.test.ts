import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({
    findSeasonAwardBucketPath: vi.fn(),
    deleteSeasonAwardById: vi.fn(),
    deleteFile: vi.fn(),
    order: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/seasonHistory.repo", () => ({
    findSeasonAwardBucketPath: mocks.findSeasonAwardBucketPath,
    deleteSeasonAwardById: mocks.deleteSeasonAwardById,
}));
vi.mock("@/server/storage/storage.service", () => ({deleteFile: mocks.deleteFile}));
vi.mock("@/server/supabase/admin", () => ({getSupabaseAdmin: () => ({})}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {deleteSeasonAward} from "../deleteSeasonAward";

const supabase = {} as DBClient;
const awardId = "11111111-1111-4111-8111-111111111111";

describe("deleteSeasonAward", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.order.length = 0;
        mocks.findSeasonAwardBucketPath.mockResolvedValue(Ok("awards/a.png"));
        mocks.deleteFile.mockImplementation(async () => { mocks.order.push("file"); return Ok(true); });
    });

    it("does not delete the avatar file when the row delete fails", async () => {
        mocks.deleteSeasonAwardById.mockResolvedValue(Err({message: "denied", code: "DB_ERROR"}));

        const result = await deleteSeasonAward(supabase, {awardId});

        expect(result.ok).toBe(false);
        expect(mocks.deleteFile).not.toHaveBeenCalled();
    });

    it("deletes the file after the row delete succeeds", async () => {
        mocks.deleteSeasonAwardById.mockImplementation(async () => { mocks.order.push("row"); return Ok(true); });

        const result = await deleteSeasonAward(supabase, {awardId});

        expect(result.ok).toBe(true);
        expect(mocks.order).toEqual(["row", "file"]);
    });
});
