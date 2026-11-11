import {beforeEach, describe, expect, it, vi} from "vitest";
import {Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({
    insertSeasonAward: vi.fn(),
    refreshAwardAvatar: vi.fn(),
    storeAwardAvatar: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/seasonHistory.repo", () => ({insertSeasonAward: mocks.insertSeasonAward}));
vi.mock("../refreshAwardAvatar", () => ({refreshAwardAvatar: mocks.refreshAwardAvatar}));
vi.mock("../storeAwardAvatar", () => ({storeAwardAvatar: mocks.storeAwardAvatar}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {upsertSeasonAward} from "../upsertSeasonAward";

const supabase = {} as DBClient;

describe("upsertSeasonAward", () => {
    beforeEach(() => vi.clearAllMocks());

    it("derives the avatar server-side from the award's player and never stores a caller URL", async () => {
        mocks.insertSeasonAward.mockResolvedValue(Ok({id: "a1"}));
        mocks.refreshAwardAvatar.mockResolvedValue(Ok({url: "u", path: "p"}));

        const result = await upsertSeasonAward(supabase, {
            seasonId: "11111111-1111-4111-8111-111111111111",
            playerId: "22222222-2222-4222-8222-222222222222",
            awardName: "MVP",
            category: "individual",
            cdnUrl: "http://169.254.169.254/latest",
        } as never, "u1");

        expect(result.ok).toBe(true);
        expect(mocks.refreshAwardAvatar).toHaveBeenCalledWith(supabase, "a1");
        expect(mocks.storeAwardAvatar).not.toHaveBeenCalled();
    });
});
