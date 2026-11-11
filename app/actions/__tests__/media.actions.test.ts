import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";

const mocks = vi.hoisted(() => ({
    requireGroups: vi.fn(),
    getMediaPostById: vi.fn(),
    createMediaPost: vi.fn(),
    updateMediaPost: vi.fn(),
    assignMediaToMatch: vi.fn(),
    deleteMediaPost: vi.fn(),
    togglePinMediaPost: vi.fn(),
}));

vi.mock("@/server/supabase/server", () => ({createServerSupabase: async () => ({})}));
vi.mock("@/server/cache/revalidate", () => ({revalidatePublicData: vi.fn()}));
vi.mock("@/server/domains/auth", () => ({requireGroups: mocks.requireGroups}));
vi.mock("@/server/domains/media", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/domains/media")>()),
    getMediaPostById: mocks.getMediaPostById,
    createMediaPost: mocks.createMediaPost,
    updateMediaPost: mocks.updateMediaPost,
    assignMediaToMatch: mocks.assignMediaToMatch,
    deleteMediaPost: mocks.deleteMediaPost,
    togglePinMediaPost: mocks.togglePinMediaPost,
}));

import {
    assignMediaToMatchAction,
    createMediaPostAction,
    deleteMediaPostAction,
    updateMediaPostAction,
} from "@/app/actions/media.actions";

const POST_ID = "11111111-1111-4111-8111-111111111111";
const MATCH_ID = "22222222-2222-4222-8222-222222222222";

function asGroups(...groups: string[]) {
    mocks.requireGroups.mockResolvedValue(Ok({userId: "u1", groups}));
}

function form(fields: Record<string, string>) {
    const data = new FormData();
    Object.entries(fields).forEach(([k, v]) => data.set(k, v));
    return data;
}

describe("media actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("refuses a graphics user editing a video post before any write", async () => {
        asGroups("graphics");
        mocks.getMediaPostById.mockResolvedValue(Ok({id: POST_ID, type: "video"}));

        const result = await updateMediaPostAction({postId: POST_ID, title: "x"});

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
        expect(mocks.updateMediaPost).not.toHaveBeenCalled();
    });

    it("lets a graphics user edit a gfx post", async () => {
        asGroups("graphics");
        mocks.getMediaPostById.mockResolvedValue(Ok({id: POST_ID, type: "gfx"}));
        mocks.updateMediaPost.mockResolvedValue(Ok({id: POST_ID}));

        const result = await updateMediaPostAction({postId: POST_ID, title: "x"});

        expect(result.ok).toBe(true);
    });

    it("refuses a graphics user creating a clip before any write", async () => {
        asGroups("graphics");

        const result = await createMediaPostAction(form({type: "clip", title: "x", videoUrl: "https://youtu.be/abc"}));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("FORBIDDEN");
        expect(mocks.createMediaPost).not.toHaveBeenCalled();
    });

    it("refuses a media user assigning a gfx post to a match", async () => {
        asGroups("media");
        mocks.getMediaPostById.mockResolvedValue(Ok({id: POST_ID, type: "gfx"}));

        const result = await assignMediaToMatchAction({postId: POST_ID, matchId: MATCH_ID});

        expect(result.ok).toBe(false);
        expect(mocks.assignMediaToMatch).not.toHaveBeenCalled();
    });

    it("stops at the group guard", async () => {
        mocks.requireGroups.mockResolvedValue(Err({message: "Forbidden", code: "FORBIDDEN"}));

        const result = await deleteMediaPostAction({postId: POST_ID});

        expect(result.ok).toBe(false);
        expect(mocks.requireGroups).toHaveBeenCalledWith(expect.anything(), ["admin"]);
        expect(mocks.deleteMediaPost).not.toHaveBeenCalled();
    });
});
