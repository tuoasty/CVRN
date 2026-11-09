import {describe, expect, it} from "vitest";
import {pickVod} from "../pickVod";
import {makeMatch, makePost} from "./fixtures";

const NOW = new Date("2026-11-12T12:00:00Z");

function done(scheduledAt: string, o: Parameters<typeof makeMatch>[0] = {}) {
    return makeMatch({status: "completed", scheduled_at: scheduledAt, home_sets_won: 3, away_sets_won: 1, ...o});
}

function vod(matchId: string, o: Parameters<typeof makePost>[0] = {}) {
    return makePost({type: "video", image_url: null, video_url: "https://www.youtube.com/watch?v=abcdefghijk", match_id: matchId, ...o});
}

describe("pickVod", () => {
    it("prefers a VOD whose match has a GFX", () => {
        const newer = done("2026-11-11T19:00:00Z");
        const older = done("2026-11-08T19:00:00Z");
        const posts = [vod(newer.match.id), vod(older.match.id), makePost({type: "gfx", match_id: older.match.id})];
        const out = pickVod({phase: "regular", now: NOW, completed: [newer, older], posts, heroMatchIds: new Set()});
        expect(out?.match.match.id).toBe(older.match.id);
    });

    it("picks the newest when no VOD match has a GFX", () => {
        const newer = done("2026-11-11T19:00:00Z");
        const older = done("2026-11-08T19:00:00Z");
        const out = pickVod({phase: "regular", now: NOW, completed: [older, newer], posts: [vod(older.match.id), vod(newer.match.id)], heroMatchIds: new Set()});
        expect(out?.match.match.id).toBe(newer.match.id);
    });

    it("never picks the hero's match", () => {
        const hero = done("2026-11-11T19:00:00Z");
        const other = done("2026-11-10T19:00:00Z");
        const posts = [vod(hero.match.id), vod(other.match.id), makePost({type: "gfx", match_id: hero.match.id})];
        const out = pickVod({phase: "regular", now: NOW, completed: [hero, other], posts, heroMatchIds: new Set([hero.match.id])});
        expect(out?.match.match.id).toBe(other.match.id);
    });

    it("falls back to the newest VOD this season", () => {
        const old = done("2026-10-01T19:00:00Z");
        const older = done("2026-09-20T19:00:00Z");
        const out = pickVod({phase: "regular", now: NOW, completed: [older, old], posts: [vod(older.match.id), vod(old.match.id)], heroMatchIds: new Set()});
        expect(out?.match.match.id).toBe(old.match.id);
    });

    it("ignores VODs for matches outside this season and posts without a video url", () => {
        const m = done("2026-11-11T19:00:00Z");
        const posts = [vod("other-season-match"), vod(m.match.id, {video_url: null})];
        expect(pickVod({phase: "regular", now: NOW, completed: [m], posts, heroMatchIds: new Set()})).toBeNull();
    });

    it("completed phase picks the grand final VOD", () => {
        const grand = done("2026-11-01T19:00:00Z", {match_type: "playoffs", round: "grand_final"});
        const semi = done("2026-11-05T19:00:00Z", {match_type: "playoffs", round: "semifinal"});
        const posts = [vod(semi.match.id), vod(grand.match.id)];
        const out = pickVod({phase: "completed", now: NOW, completed: [semi, grand], posts, heroMatchIds: new Set([grand.match.id])});
        expect(out?.match.match.id).toBe(grand.match.id);
    });

    it("completed phase without a grand final VOD shows nothing", () => {
        const semi = done("2026-11-05T19:00:00Z", {match_type: "playoffs", round: "semifinal"});
        expect(pickVod({phase: "completed", now: NOW, completed: [semi], posts: [vod(semi.match.id)], heroMatchIds: new Set()})).toBeNull();
    });
});
