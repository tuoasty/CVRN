import {beforeEach, describe, expect, it, vi} from "vitest";
import {Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";
import {createMediaPost} from "../createMediaPost";
import type {CreateMediaInput, MediaPost} from "../../types";

const mocks = vi.hoisted(() => ({
    insertMediaPost: vi.fn(),
    findRoundMediaPost: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
    readImageDimensions: vi.fn(),
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

vi.mock("@/server/storage/imageDimensions", () => ({
    readImageDimensions: mocks.readImageDimensions,
}));

const supabase = {} as DBClient;

function input(overrides: Partial<CreateMediaInput> = {}): CreateMediaInput {
    return {
        type: "gfx",
        title: "Week 4 GFX",
        imageFile: new File(["x"], "gfx.png", {type: "image/png"}),
        userId: "user",
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadFile.mockResolvedValue(Ok({url: "https://cdn.test/gfx.png"}));
    mocks.deleteFile.mockResolvedValue(Ok(undefined));
    mocks.readImageDimensions.mockResolvedValue(null);
    mocks.insertMediaPost.mockImplementation(async (_client: DBClient, row: unknown) => Ok(row as MediaPost));
});

describe("createMediaPost dimensions", () => {
    it("writes image dimensions with the post", async () => {
        mocks.readImageDimensions.mockResolvedValue({width: 1080, height: 1350});
        await createMediaPost(supabase, input());
        expect(mocks.insertMediaPost.mock.calls[0][1]).toMatchObject({image_width: 1080, image_height: 1350});
    });

    it("writes null dimensions when there is no uploaded file", async () => {
        await createMediaPost(supabase, input({imageFile: undefined}));
        expect(mocks.insertMediaPost.mock.calls[0][1]).toMatchObject({image_width: null, image_height: null});
        expect(mocks.readImageDimensions).not.toHaveBeenCalled();
    });
});
