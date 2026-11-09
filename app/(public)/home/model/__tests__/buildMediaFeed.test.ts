import {describe, expect, it} from "vitest";
import {buildMediaFeed} from "../buildMediaFeed";
import {makePost} from "./fixtures";

describe("buildMediaFeed", () => {
    it("pinned first, then newest", () => {
        const old = makePost({published_at: "2026-10-01T00:00:00Z"});
        const fresh = makePost({published_at: "2026-11-05T00:00:00Z"});
        const pinnedOld = makePost({published_at: "2026-09-01T00:00:00Z", is_pinned: true, pinned_at: "2026-10-01T00:00:00Z"});
        const pinnedNew = makePost({published_at: "2026-08-01T00:00:00Z", is_pinned: true, pinned_at: "2026-11-01T00:00:00Z"});
        const out = buildMediaFeed([old, pinnedOld, fresh, pinnedNew], new Set());
        expect(out.map(p => p.id)).toEqual([pinnedNew.id, pinnedOld.id, fresh.id, old.id]);
    });

    it("excludes hero ids, articles and clips", () => {
        const hero = makePost();
        const article = makePost({type: "article"});
        const clip = makePost({type: "clip"});
        const keep = makePost({type: "potw"});
        const out = buildMediaFeed([hero, article, clip, keep], new Set([hero.id]));
        expect(out.map(p => p.id)).toEqual([keep.id]);
    });

    it("keeps a video post with only a YouTube url", () => {
        const yt = makePost({type: "video", image_url: null, video_url: "https://youtu.be/abcdefghijk"});
        const twitch = makePost({type: "video", image_url: null, video_url: "https://www.twitch.tv/videos/123"});
        const nothing = makePost({type: "gfx", image_url: null});
        const out = buildMediaFeed([yt, twitch, nothing], new Set());
        expect(out.map(p => p.id)).toEqual([yt.id]);
    });

    it("caps at 12 by default", () => {
        const many = Array.from({length: 20}, (_, i) => makePost({published_at: `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z`}));
        expect(buildMediaFeed(many, new Set())).toHaveLength(12);
        expect(buildMediaFeed(many, new Set(), 5)).toHaveLength(5);
    });
});
