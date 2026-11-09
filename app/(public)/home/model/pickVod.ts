import type {MatchWithDetails} from "@/server/domains/match";
import type {MediaPost} from "@/server/domains/media";
import type {SeasonPhase} from "./types";

const RECENT_MS = 14 * 24 * 60 * 60 * 1000;

const time = (m: MatchWithDetails) => (m.match.scheduled_at ? new Date(m.match.scheduled_at).getTime() : 0);

export function pickVod(input: {
    phase: SeasonPhase;
    now: Date;
    completed: MatchWithDetails[];
    posts: MediaPost[];
    heroMatchIds: Set<string>;
}): { post: MediaPost; match: MatchWithDetails } | null {
    const matchById = new Map(input.completed.map(m => [m.match.id, m]));
    const vods = input.posts.flatMap(post => {
        if (post.type !== "video" || !post.video_url || !post.match_id) return [];
        const match = matchById.get(post.match_id);
        return match ? [{post, match}] : [];
    });

    if (input.phase === "completed") {
        return vods.find(v => v.match.playoff_round === "grand_final") ?? null;
    }

    const pool = vods.filter(v => !input.heroMatchIds.has(v.match.match.id)).sort((a, b) => time(b.match) - time(a.match));
    if (pool.length === 0) return null;
    const withGfx = new Set(input.posts.filter(p => p.type === "gfx" && p.match_id).map(p => p.match_id as string));
    const cutoff = input.now.getTime() - RECENT_MS;
    const recent = pool.filter(v => time(v.match) >= cutoff);
    return recent.find(v => withGfx.has(v.match.match.id)) ?? recent[0] ?? pool[0];
}
