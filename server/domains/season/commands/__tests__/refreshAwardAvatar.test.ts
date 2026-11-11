import {beforeEach, describe, expect, it, vi} from "vitest";
import {Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({
    findSeasonAwardPlayerRobloxId: vi.fn(),
    getRobloxFullAvatarsById: vi.fn(),
    storeAwardAvatar: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/seasonHistory.repo", () => ({findSeasonAwardPlayerRobloxId: mocks.findSeasonAwardPlayerRobloxId}));
vi.mock("@/server/roblox/users", () => ({getRobloxFullAvatarsById: mocks.getRobloxFullAvatarsById}));
vi.mock("../storeAwardAvatar", () => ({storeAwardAvatar: mocks.storeAwardAvatar}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {refreshAwardAvatar} from "../refreshAwardAvatar";

const supabase = {} as DBClient;
const awardId = "11111111-1111-4111-8111-111111111111";

describe("refreshAwardAvatar", () => {
    beforeEach(() => vi.clearAllMocks());

    it("stores the Roblox avatar of the award's own player", async () => {
        mocks.findSeasonAwardPlayerRobloxId.mockResolvedValue(Ok("555"));
        mocks.getRobloxFullAvatarsById.mockResolvedValue(Ok([{targetId: 555, imageUrl: "https://tr.rbxcdn.com/x.png"}]));
        mocks.storeAwardAvatar.mockResolvedValue(Ok({url: "https://cdn/x.png", path: "awards/x.png"}));

        const result = await refreshAwardAvatar(supabase, awardId);

        expect(mocks.getRobloxFullAvatarsById).toHaveBeenCalledWith(["555"]);
        expect(mocks.storeAwardAvatar).toHaveBeenCalledWith(awardId, "https://tr.rbxcdn.com/x.png");
        expect(result).toEqual(Ok({url: "https://cdn/x.png", path: "awards/x.png"}));
    });

    it("returns NOT_FOUND when the award has no player", async () => {
        mocks.findSeasonAwardPlayerRobloxId.mockResolvedValue(Ok(null));

        const result = await refreshAwardAvatar(supabase, awardId);

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
        expect(mocks.storeAwardAvatar).not.toHaveBeenCalled();
    });

    it("returns INTEGRATION_ERROR when Roblox has no image", async () => {
        mocks.findSeasonAwardPlayerRobloxId.mockResolvedValue(Ok("555"));
        mocks.getRobloxFullAvatarsById.mockResolvedValue(Ok([]));

        const result = await refreshAwardAvatar(supabase, awardId);

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTEGRATION_ERROR");
        expect(mocks.storeAwardAvatar).not.toHaveBeenCalled();
    });
});
