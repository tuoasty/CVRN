import {isPlayoffRound, roundLabelLong} from "@/app/utils/playoffRounds";
import type {MediaPost} from "@/server/domains/media/types";

export function filterTeamMedia(
    posts: MediaPost[],
    input: {teamId: string; seasonId: string; matchIds: string[]; rosterIds: string[]},
): MediaPost[] {
    const matchIds = new Set(input.matchIds);
    const rosterIds = new Set(input.rosterIds);
    return posts
        .filter((p) => p.type !== "article" && p.season_id === input.seasonId)
        .filter(
            (p) =>
                p.team_id === input.teamId ||
                (p.match_id !== null && matchIds.has(p.match_id)) ||
                (p.type === "potw" && p.player_id !== null && rosterIds.has(p.player_id)),
        )
        .sort((a, b) => b.published_at.localeCompare(a.published_at));
}

const TYPE_LABEL: Record<MediaPost["type"], string> = {
    gfx: "GFX",
    video: "Video",
    news: "News",
    recap: "Recap",
    clip: "Clip",
    totw: "TOTW",
    potw: "POTW",
    article: "Article",
    champion: "Champion",
    feature: "Feature",
};

function roundText(roundKey: string | null): string | null {
    if (!roundKey) return null;
    const week = roundKey.match(/^week:(\d+)$/);
    if (week) return `Week ${parseInt(week[1], 10)}`;
    return isPlayoffRound(roundKey) ? roundLabelLong(roundKey) : null;
}

export function mediaSubline(post: MediaPost): string {
    const round = roundText(post.round_key);
    return round ? `${TYPE_LABEL[post.type]} · ${round}` : TYPE_LABEL[post.type];
}

export type MediaOpen = "video" | "image" | null;

export function mediaOpenKind(post: MediaPost): MediaOpen {
    if ((post.type === "video" || post.type === "feature" || post.type === "recap") && post.video_url) return "video";
    if ((post.type === "gfx" || post.type === "totw" || post.type === "potw") && post.image_url) return "image";
    return null;
}
