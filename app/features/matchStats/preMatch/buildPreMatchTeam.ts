import type {PlayerLeaderboardRow} from "@/server/domains/player";
import type {RosterPlayer} from "@/server/domains/match";
import {positionLabel, type PositionCode} from "@/shared/volleyball/positions";
import {aggregateCareerRows} from "@/app/features/leaderboard/aggregateCareerRows";
import {mainPosition} from "@/app/(public)/home/model/awardLines";
import {buildPublicPlayerHref} from "@/app/utils/matchDetailHref";
import type {StatCell} from "@/app/(public)/home/model/types";

export type PreMatchSource = "season" | "alltime";

export interface PreMatchPlayer {
    playerId: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
    href: string | null;
    role: RosterPlayer["role"];
    setsPlayed: number;
    line: StatCell[];
}

export type PreMatchSectionKey = PositionCode | "none";

export interface PreMatchSection {
    key: PreMatchSectionKey;
    position: PositionCode | null;
    label: string;
    players: PreMatchPlayer[];
}

export interface PreMatchTeam {
    source: PreMatchSource;
    sections: PreMatchSection[];
}

const NO_STATS = "No stats yet";

export const PRE_MATCH_ORDER: PositionCode[] = ["SET", "OPP", "OUT", "MID", "LIB"];

type Spec = {label: string; field: string; pct?: boolean};

const LINES: Record<PositionCode, Spec[]> = {
    SET: [{label: "AST/set", field: "assists_per_set"}, {label: "SET%", field: "set_eff", pct: true}, {label: "APK/set", field: "ape_kills_per_set"}],
    OPP: [{label: "PTS/set", field: "points_per_set"}, {label: "K/set", field: "kills_per_set"}, {label: "HIT%", field: "hit_eff", pct: true}],
    OUT: [{label: "PTS/set", field: "points_per_set"}, {label: "K/set", field: "kills_per_set"}, {label: "REC/set", field: "receives_per_set"}],
    MID: [{label: "B/set", field: "blocks_per_set"}, {label: "KB/set", field: "kill_blocks_per_set"}, {label: "KB%", field: "kb_pct", pct: true}],
    LIB: [{label: "REC/set", field: "receives_per_set"}, {label: "DIG/set", field: "digs_per_set"}, {label: "DIV/set", field: "dives_per_set"}],
};

function lineFor(position: PositionCode, row: Record<string, unknown>): StatCell[] {
    return LINES[position].map(({label, field, pct}) => {
        const raw = row[field];
        const has = typeof raw === "number" && Number.isFinite(raw);
        if (pct) return {label, value: has ? `${((raw as number) * 100).toFixed(1)}%` : "-"};
        return {label, value: (has ? (raw as number) : 0).toFixed(1)};
    });
}

function byPlayer(rows: PlayerLeaderboardRow[]): Map<string, ReturnType<typeof aggregateCareerRows>[number]> {
    return new Map(aggregateCareerRows(rows).map(r => [r.player_id as string, r]));
}

export function buildPreMatchTeam(input: {
    roster: RosterPlayer[];
    rows: PlayerLeaderboardRow[];
    seasonId: string;
    regionId: string;
}): PreMatchTeam {
    const ids = new Set(input.roster.map(p => p.player_id));
    const mine = input.rows.filter(r => r.player_id && ids.has(r.player_id) && r.region_id === input.regionId);
    const career = byPlayer(mine);
    const season = byPlayer(mine.filter(r => r.season_id === input.seasonId));
    const source: PreMatchSource = [...season.values()].some(r => (r.sets_played ?? 0) > 0) ? "season" : "alltime";
    const stats = source === "season" ? season : career;

    const sections = new Map<PreMatchSectionKey, PreMatchPlayer[]>();
    for (const p of input.roster) {
        const row = stats.get(p.player_id);
        const played = (row?.sets_played ?? 0) > 0;
        const position = played ? mainPosition(career.get(p.player_id)?.position_counts) : null;
        const key: PreMatchSectionKey = position ?? "none";
        const player: PreMatchPlayer = {
            playerId: p.player_id,
            name: p.display_name ?? p.username ?? "Unknown",
            username: p.username,
            avatarUrl: p.avatar_url,
            href: buildPublicPlayerHref(p.username),
            role: p.role,
            setsPlayed: position ? row?.sets_played ?? 0 : 0,
            line: position && row ? lineFor(position, row as unknown as Record<string, unknown>) : [],
        };
        const list = sections.get(key) ?? [];
        list.push(player);
        sections.set(key, list);
    }

    const ordered: PreMatchSection[] = [];
    for (const code of PRE_MATCH_ORDER) {
        const players = sections.get(code);
        if (players) ordered.push({key: code, position: code, label: positionLabel(code), players: players.sort((a, b) => b.setsPlayed - a.setsPlayed)});
    }
    const none = sections.get("none");
    if (none) ordered.push({key: "none", position: null, label: NO_STATS, players: none});
    return {source, sections: ordered};
}
