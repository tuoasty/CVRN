import type {MatchWithDetails} from "@/server/domains/match";
import type {MediaPost} from "@/server/domains/media";
import {isRegionToday} from "./phase";
import type {SeasonPhase} from "./types";

export type HeroCandidate =
    | { kind: "match"; post: MediaPost; match: MatchWithDetails }
    | { kind: "potw" | "totw"; post: MediaPost }
    | { kind: "champion"; post: MediaPost | null };

const MAX_HERO = 24;

function time(iso: string | null): number {
    return iso ? new Date(iso).getTime() : Number.NaN;
}

function hasBothTeams(m: MatchWithDetails): boolean {
    return !!m.match.home_team_id && !!m.match.away_team_id;
}

function withGfx(matches: MatchWithDetails[], gfxByMatch: Map<string, MediaPost>): { match: MatchWithDetails; post: MediaPost }[] {
    return matches.flatMap(match => {
        const post = gfxByMatch.get(match.match.id);
        return post && hasBothTeams(match) ? [{match, post}] : [];
    });
}

export function rankHeroCandidates(input: {
    phase: SeasonPhase;
    now: Date;
    timeZone: string;
    seasonId: string;
    upcoming: MatchWithDetails[];
    completed: MatchWithDetails[];
    posts: MediaPost[];
    championTeamId: string | null;
}): HeroCandidate[] {
    const now = input.now.getTime();
    const gfxByMatch = new Map<string, MediaPost>();
    for (const post of input.posts) {
        if (post.type === "gfx" && post.image_url && post.match_id) gfxByMatch.set(post.match_id, post);
    }

    if (input.phase === "completed") {
        const out: HeroCandidate[] = [];
        const champion = input.posts.find(p => p.type === "champion" && p.image_url && p.season_id === input.seasonId) ?? null;
        if (champion || input.championTeamId) out.push({kind: "champion", post: champion});
        const playoffs = withGfx(input.completed.filter(m => m.match.match_type === "playoffs"), gfxByMatch)
            .sort((a, b) => time(b.match.match.scheduled_at) - time(a.match.match.scheduled_at));
        for (const {match, post} of playoffs) out.push({kind: "match", match, post});
        return out.slice(0, MAX_HERO);
    }

    const upcoming = withGfx(input.upcoming, gfxByMatch)
        .filter(c => !Number.isNaN(time(c.match.match.scheduled_at)))
        .sort((a, b) => time(a.match.match.scheduled_at) - time(b.match.match.scheduled_at));
    const today = upcoming.filter(c => isRegionToday(c.match.match.scheduled_at, input.timeZone, input.now));
    const soon = upcoming.filter(c => {
        const t = time(c.match.match.scheduled_at);
        return !today.includes(c) && t > now;
    });

    const pool: HeroCandidate[] = [
        ...input.posts
            .filter(p => (p.type === "potw" || p.type === "totw") && p.image_url && p.season_id === input.seasonId)
            .map(p => ({kind: p.type as "potw" | "totw", post: p})),
        ...withGfx(input.completed, gfxByMatch)
            .filter(c => time(c.match.match.scheduled_at) <= now)
            .map(c => ({kind: "match" as const, match: c.match, post: c.post})),
    ].sort((a, b) => (b.post?.published_at ?? "").localeCompare(a.post?.published_at ?? ""));

    return [
        ...today.map(c => ({kind: "match" as const, match: c.match, post: c.post})),
        ...soon.map(c => ({kind: "match" as const, match: c.match, post: c.post})),
        ...pool,
    ].slice(0, MAX_HERO);
}
