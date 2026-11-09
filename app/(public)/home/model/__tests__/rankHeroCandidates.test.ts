import {describe, expect, it} from "vitest";
import {rankHeroCandidates} from "../rankHeroCandidates";
import {makeMatch, makePost, SEASON_ID} from "./fixtures";
import type {MatchWithDetails} from "@/server/domains/match";
import type {MediaPost} from "@/server/domains/media";
import type {SeasonPhase} from "../types";

const NOW = new Date("2026-11-12T10:00:00Z");
const TZ = "Europe/London";
const DAY = 24 * 60 * 60 * 1000;

function at(offsetMs: number): string {
    return new Date(NOW.getTime() + offsetMs).toISOString();
}

function gfxFor(m: MatchWithDetails, o: Partial<MediaPost> = {}): MediaPost {
    return makePost({type: "gfx", match_id: m.match.id, ...o});
}

function run(o: {
    phase?: SeasonPhase;
    upcoming?: MatchWithDetails[];
    completed?: MatchWithDetails[];
    posts?: MediaPost[];
    championTeamId?: string | null;
}) {
    return rankHeroCandidates({
        phase: o.phase ?? "regular",
        now: NOW,
        timeZone: TZ,
        seasonId: SEASON_ID,
        upcoming: o.upcoming ?? [],
        completed: o.completed ?? [],
        posts: o.posts ?? [],
        championTeamId: o.championTeamId ?? null,
    });
}

function ids(cands: ReturnType<typeof run>): string[] {
    return cands.map(c => (c.post ? c.post.id : "champion-lockup"));
}

describe("rankHeroCandidates", () => {
    it("today's GFX match leads over a nearer-by-index upcoming one", () => {
        const tomorrow = makeMatch({scheduled_at: at(DAY)});
        const today = makeMatch({scheduled_at: at(6 * 60 * 60 * 1000)});
        const pa = gfxFor(tomorrow);
        const pb = gfxFor(today);
        expect(ids(run({upcoming: [tomorrow, today], posts: [pa, pb]}))).toEqual([pb.id, pa.id]);
    });

    it("keeps upcoming matches beyond 14 days, after nearer ones", () => {
        const far = makeMatch({scheduled_at: at(15 * DAY)});
        const near = makeMatch({scheduled_at: at(2 * DAY)});
        const pf = gfxFor(far);
        const pn = gfxFor(near);
        expect(ids(run({upcoming: [far, near], posts: [pf, pn]}))).toEqual([pn.id, pf.id]);
    });

    it("pool orders POTW, TOTW and result GFX by published_at desc", () => {
        const done = makeMatch({status: "completed", scheduled_at: at(-2 * DAY)});
        const result = gfxFor(done, {published_at: "2026-11-10T00:00:00Z"});
        const potw = makePost({type: "potw", published_at: "2026-11-11T00:00:00Z"});
        const totw = makePost({type: "totw", published_at: "2026-11-09T00:00:00Z"});
        const out = run({completed: [done], posts: [totw, result, potw]});
        expect(out.map(c => c.kind)).toEqual(["potw", "match", "totw"]);
        expect(ids(out)).toEqual([potw.id, result.id, totw.id]);
    });

    it("keeps older result GFX, sorted after newer posts", () => {
        const old = makeMatch({status: "completed", scheduled_at: at(-30 * DAY)});
        const recent = makeMatch({status: "completed", scheduled_at: at(-2 * DAY)});
        const po = gfxFor(old, {published_at: "2026-10-12T00:00:00Z"});
        const pr = gfxFor(recent, {published_at: "2026-11-10T00:00:00Z"});
        expect(ids(run({completed: [old, recent], posts: [po, pr]}))).toEqual([pr.id, po.id]);
    });

    it("excludes matches with a TBD team", () => {
        const tbd = makeMatch({scheduled_at: at(DAY), away_team_id: null});
        expect(run({upcoming: [tbd], posts: [gfxFor(tbd)]})).toEqual([]);
    });

    it("excludes posts without an image", () => {
        const m = makeMatch({scheduled_at: at(DAY)});
        expect(run({upcoming: [m], posts: [gfxFor(m, {image_url: null})]})).toEqual([]);
    });

    it("caps at 24", () => {
        const matches = Array.from({length: 30}, (_, i) => makeMatch({scheduled_at: at((i + 1) * DAY)}));
        expect(run({upcoming: matches, posts: matches.map(m => gfxFor(m))})).toHaveLength(24);
    });

    it("returns [] when nothing is eligible", () => {
        expect(run({upcoming: [makeMatch({scheduled_at: at(DAY)})]})).toEqual([]);
    });

    it("other seasons' POTW never appear", () => {
        expect(run({posts: [makePost({type: "potw", season_id: "season-old"})]})).toEqual([]);
    });

    it("ignores pin status", () => {
        const pinned = makePost({type: "news", is_pinned: true, pinned_at: "2026-11-11T00:00:00Z"});
        expect(run({posts: [pinned]})).toEqual([]);
    });

    it("completed: champion GFX first, then playoff GFX newest first", () => {
        const sf = makeMatch({status: "completed", match_type: "playoffs", scheduled_at: at(-5 * DAY), round: "upper_final"});
        const gf = makeMatch({status: "completed", match_type: "playoffs", scheduled_at: at(-3 * DAY), round: "grand_final"});
        const reg = makeMatch({status: "completed", match_type: "season", scheduled_at: at(-20 * DAY)});
        const champ = makePost({type: "champion"});
        const sfPost = gfxFor(sf);
        const gfPost = gfxFor(gf);
        const out = run({phase: "completed", completed: [gf, sf, reg], posts: [sfPost, gfPost, gfxFor(reg), champ], championTeamId: "team-home"});
        expect(ids(out)).toEqual([champ.id, gfPost.id, sfPost.id]);
        expect(out[0].kind).toBe("champion");
    });

    it("completed without champion GFX yields a null-post champion when championTeamId is set", () => {
        const out = run({phase: "completed", championTeamId: "team-home"});
        expect(out).toEqual([{kind: "champion", post: null}]);
    });

    it("completed with neither yields no champion candidate", () => {
        expect(run({phase: "completed", championTeamId: null})).toEqual([]);
    });
});
