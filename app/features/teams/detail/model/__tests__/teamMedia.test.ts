import {describe, expect, it} from "vitest";
import type {MediaPost, MediaPostType} from "@/server/domains/media/types";
import {filterTeamMedia, mediaSubline} from "../teamMedia";

function post(id: string, type: MediaPostType, o: Partial<MediaPost> = {}): MediaPost {
    return {
        id,
        type,
        title: id,
        description: null,
        image_url: null,
        image_width: null,
        image_height: null,
        video_url: null,
        author_id: null,
        match_id: null,
        team_id: null,
        player_id: null,
        season_id: "s1",
        round_key: null,
        article_id: null,
        published_at: "2026-10-01T00:00:00Z",
        is_pinned: false,
        pinned_at: null,
        created_by: "u",
        created_at: "2026-10-01T00:00:00Z",
        updated_at: null,
        ...o,
    };
}

const input = {teamId: "t1", seasonId: "s1", matchIds: ["m1"], rosterIds: ["p1"]};

describe("filterTeamMedia", () => {
    it("includes team posts, this team's match media and roster POTW, newest first", () => {
        const out = filterTeamMedia(
            [
                post("team", "totw", {team_id: "t1", published_at: "2026-10-01T00:00:00Z"}),
                post("gfx", "gfx", {match_id: "m1", published_at: "2026-10-03T00:00:00Z"}),
                post("potw", "potw", {player_id: "p1", published_at: "2026-10-02T00:00:00Z"}),
            ],
            input,
        );
        expect(out.map((p) => p.id)).toEqual(["gfx", "potw", "team"]);
    });

    it("excludes other teams' POTW, other seasons and article media", () => {
        const out = filterTeamMedia(
            [
                post("otherPotw", "potw", {player_id: "p9"}),
                post("oldSeason", "gfx", {team_id: "t1", season_id: "s0"}),
                post("article", "article", {team_id: "t1"}),
                post("rosterGfx", "gfx", {player_id: "p1"}),
            ],
            input,
        );
        expect(out).toEqual([]);
    });
});

describe("mediaSubline", () => {
    it("joins the type label with the week or playoff round", () => {
        expect(mediaSubline(post("a", "gfx", {round_key: "week:3"}))).toBe("GFX · Week 3");
        expect(mediaSubline(post("b", "potw"))).toBe("POTW");
    });
});
