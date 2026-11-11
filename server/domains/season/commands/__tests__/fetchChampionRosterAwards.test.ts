import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";

const mocks = vi.hoisted(() => ({
    findSeasonPodium: vi.fn(),
    insertSeasonAward: vi.fn(),
    deleteSeasonAwardsByCategory: vi.fn(),
    findSeasonAwardBucketPathsByCategory: vi.fn(),
    findAllTeamPlayers: vi.fn(),
    getRobloxFullAvatarsById: vi.fn(),
    deleteFile: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/seasonHistory.repo", () => ({
    findSeasonPodium: mocks.findSeasonPodium,
    insertSeasonAward: mocks.insertSeasonAward,
    deleteSeasonAwardsByCategory: mocks.deleteSeasonAwardsByCategory,
    findSeasonAwardBucketPathsByCategory: mocks.findSeasonAwardBucketPathsByCategory,
}));
vi.mock("@/server/db/players.repo", () => ({findAllTeamPlayers: mocks.findAllTeamPlayers}));
vi.mock("@/server/roblox/users", () => ({getRobloxFullAvatarsById: mocks.getRobloxFullAvatarsById}));
vi.mock("@/server/storage/storage.service", () => ({deleteFile: mocks.deleteFile}));
vi.mock("@/server/supabase/admin", () => ({getSupabaseAdmin: () => ({})}));
vi.mock("../storeAwardAvatar", () => ({storeAwardAvatar: vi.fn()}));
vi.mock("@/server/utils/logger", () => {
    const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
    return {logger: {...log, child: () => log}};
});

import {fetchChampionRosterAwards} from "../fetchChampionRosterAwards";

const supabase = {} as DBClient;

describe("fetchChampionRosterAwards", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.findSeasonPodium.mockResolvedValue(Ok([{place: 1, team_id: "t1"}]));
        mocks.findAllTeamPlayers.mockResolvedValue(Ok([{role: "captain", player: {id: "p1", username: "a", roblox_user_id: "100"}}]));
        mocks.getRobloxFullAvatarsById.mockResolvedValue(Ok([]));
        mocks.findSeasonAwardBucketPathsByCategory.mockResolvedValue(Ok(["awards/old.png"]));
        mocks.deleteFile.mockResolvedValue(Ok(true));
    });

    it("keeps old avatar files when clearing old entries fails", async () => {
        mocks.deleteSeasonAwardsByCategory.mockResolvedValue(Err({message: "denied", code: "DB_ERROR"}));

        const result = await fetchChampionRosterAwards(supabase, "s1", "u1");

        expect(result.ok).toBe(false);
        expect(mocks.deleteFile).not.toHaveBeenCalled();
    });
});
