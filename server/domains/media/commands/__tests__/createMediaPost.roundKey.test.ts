import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";
import {createMediaPost} from "../createMediaPost";
import type {CreateMediaInput, MediaPost} from "../../types";

const mocks = vi.hoisted(() => ({
    insertMediaPost: vi.fn(),
    findRoundMediaPost: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
}));

vi.mock("@/server/db/mediaPost.repo", () => ({
    insertMediaPost: mocks.insertMediaPost,
    findRoundMediaPost: mocks.findRoundMediaPost,
    findAllMediaPosts: vi.fn(),
    findChampionGfxBySeasonId: vi.fn(),
}));

vi.mock("@/server/storage/storage.service", () => ({
    uploadFile: mocks.uploadFile,
    deleteFile: mocks.deleteFile,
}));

const supabase = {} as DBClient;
const SEASON_ID = "11111111-1111-4111-8111-111111111111";

function input(overrides: Partial<CreateMediaInput> = {}): CreateMediaInput {
    return {
        type: "potw",
        title: "Player of the Week",
        imageFile: new File(["x"], "potw.png", {type: "image/png"}),
        seasonId: SEASON_ID,
        roundKey: "week:3",
        userId: "user",
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.findRoundMediaPost.mockResolvedValue(Ok(null));
    mocks.uploadFile.mockResolvedValue(Ok({url: "https://cdn.test/potw.png"}));
    mocks.deleteFile.mockResolvedValue(Ok(undefined));
    mocks.insertMediaPost.mockImplementation(async (_client: DBClient, row: unknown) => Ok(row as MediaPost));
});

describe("createMediaPost roundKey", () => {
    it("rejects roundKey on a type other than potw or totw", async () => {
        const result = await createMediaPost(supabase, input({type: "gfx"}));
        expect(result).toMatchObject({ok: false, error: {code: "VALIDATION_ERROR"}});
        expect(mocks.insertMediaPost).not.toHaveBeenCalled();
    });

    it("rejects roundKey with no seasonId", async () => {
        const result = await createMediaPost(supabase, input({seasonId: null}));
        expect(result).toMatchObject({ok: false, error: {code: "VALIDATION_ERROR"}});
        expect(mocks.insertMediaPost).not.toHaveBeenCalled();
    });

    it.each(["week:", "week:abc", "week:3:1", "banana", "season", "playoffs"])("rejects the malformed roundKey %s", async roundKey => {
        const result = await createMediaPost(supabase, input({roundKey}));
        expect(result).toMatchObject({ok: false, error: {code: "VALIDATION_ERROR"}});
        expect(mocks.uploadFile).not.toHaveBeenCalled();
    });

    it.each(["week:3", "semifinal", "losers_round_2"])("stores the valid roundKey %s", async roundKey => {
        const result = await createMediaPost(supabase, input({roundKey}));
        expect(result.ok).toBe(true);
        expect(mocks.insertMediaPost.mock.calls[0][1]).toMatchObject({round_key: roundKey, season_id: SEASON_ID});
    });

    it("returns MEDIA_ROUND_SLOT_TAKEN when the spot is filled, before any upload", async () => {
        mocks.findRoundMediaPost.mockResolvedValue(Ok({id: "existing"}));
        const result = await createMediaPost(supabase, input());
        expect(result).toMatchObject({ok: false, error: {code: "MEDIA_ROUND_SLOT_TAKEN"}});
        expect(mocks.findRoundMediaPost).toHaveBeenCalledWith(supabase, SEASON_ID, "potw", "week:3");
        expect(mocks.uploadFile).not.toHaveBeenCalled();
    });

    it("maps a round slot unique violation to MEDIA_ROUND_SLOT_TAKEN", async () => {
        mocks.insertMediaPost.mockResolvedValue(Err({
            message: 'duplicate key value violates unique constraint "media_posts_one_round_slot"',
            code: "DB_ERROR",
        }));
        const result = await createMediaPost(supabase, input());
        expect(result).toMatchObject({ok: false, error: {code: "MEDIA_ROUND_SLOT_TAKEN"}});
        expect(mocks.deleteFile).toHaveBeenCalledOnce();
    });

    it("keeps other insert failures as they are", async () => {
        mocks.insertMediaPost.mockResolvedValue(Err({message: "connection lost", code: "DB_ERROR"}));
        const result = await createMediaPost(supabase, input());
        expect(result).toMatchObject({ok: false, error: {code: "DB_ERROR"}});
    });

    it("leaves a post with no roundKey unaffected", async () => {
        const result = await createMediaPost(supabase, input({roundKey: null}));
        expect(result.ok).toBe(true);
        expect(mocks.findRoundMediaPost).not.toHaveBeenCalled();
        expect(mocks.insertMediaPost.mock.calls[0][1]).toMatchObject({round_key: null});
    });
});
