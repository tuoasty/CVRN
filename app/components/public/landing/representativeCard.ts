import type {PlayerDetail, PlayerSeasonStat} from "@/server/domains/player/types";
import type {RepresentativePlayer, RepresentativeStatKey} from "./representatives";

export interface RepresentativeCard {
    displayName: string;
    username: string;
    avatarUrl: string | null;
    position: string;
    stats: {label: string; value: string}[];
    awards: {count: number; label: string}[];
}

export const NAME_LANE_WITH_AVATAR = 374;
export const NAME_LANE_NO_AVATAR = 480;

const NAME_MIN = 28;
const NAME_MAX = 60;
const DASH = "–";

const SUMMED = [
    "ape_kills_total",
    "delay_kills_total",
    "quick_kills_total",
    "wipes_tools_total",
    "kill_attempts_total",
    "spiking_errors_total",
    "kill_blocks_total",
    "aces_total",
    "assists_total",
    "setting_errors_total",
    "serve_receives_total",
    "digs_total",
    "block_follows_total",
    "dives_total",
    "sets_played",
] as const;

type Totals = Record<(typeof SUMMED)[number], number>;

const LABELS: Record<RepresentativeStatKey, string> = {
    pts: "PTS",
    ptsPerSet: "PTS/S",
    hitPct: "HIT%",
    rec: "REC",
    ast: "AST",
    setPct: "SET%",
    ace: "ACE",
};

function round(value: number, dp: number): number {
    const factor = 10 ** dp;
    const rounded = Math.round(Math.abs(value) * factor) / factor;
    return value < 0 ? -rounded : rounded;
}

function ratio(numerator: number, denominator: number): number | null {
    return denominator === 0 ? null : round(numerator / denominator, 3);
}

function percent(value: number | null): string {
    return value === null ? DASH : `${(value * 100).toFixed(1)}%`;
}

function sumSeasons(rows: PlayerSeasonStat[]): Totals {
    const totals = Object.fromEntries(SUMMED.map(k => [k, 0])) as Totals;
    for (const row of rows) {
        for (const key of SUMMED) totals[key] += Number(row[key] ?? 0);
    }
    return totals;
}

function formatStat(key: RepresentativeStatKey, t: Totals): string {
    const kills = t.ape_kills_total + t.delay_kills_total + t.quick_kills_total + t.wipes_tools_total;
    const points = kills + t.kill_blocks_total + t.aces_total;
    switch (key) {
        case "pts":
            return String(points);
        case "ptsPerSet":
            return t.sets_played === 0 ? DASH : round(points / t.sets_played, 2).toFixed(2);
        case "hitPct":
            return percent(ratio(kills - t.spiking_errors_total, t.kill_attempts_total));
        case "rec":
            return String(t.serve_receives_total + t.digs_total + t.block_follows_total + t.dives_total);
        case "ast":
            return String(t.assists_total);
        case "setPct":
            return percent(ratio(t.assists_total, t.assists_total + t.setting_errors_total));
        case "ace":
            return String(t.aces_total);
    }
}

export function buildRepresentativeCard(
    player: RepresentativePlayer,
    detail: Pick<PlayerDetail, "player" | "seasonStats" | "awards"> | null,
): RepresentativeCard {
    const base = {
        displayName: player.displayNameOverride ?? detail?.player.display_name ?? player.username,
        username: player.username,
        position: player.position,
    };
    if (!detail) return {...base, avatarUrl: null, stats: [], awards: []};

    const totals = sumSeasons(detail.seasonStats);
    const awards = player.awards
        .map(rule => ({
            count: detail.awards.filter(a =>
                "category" in rule ? a.category === rule.category : a.award_name === rule.awardName,
            ).length,
            label: rule.label,
        }))
        .filter(a => a.count > 0);

    return {
        ...base,
        avatarUrl: detail.player.avatar_url ?? null,
        stats: player.stats.map(key => ({label: LABELS[key], value: formatStat(key, totals)})),
        awards,
    };
}

export function fitNameSize(widthAt100: number, lane: number): number {
    if (widthAt100 <= 0) return NAME_MAX;
    return Math.max(NAME_MIN, Math.min(NAME_MAX, Math.floor((lane / (widthAt100 / 100)) * 2) / 2));
}
