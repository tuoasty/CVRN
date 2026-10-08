import type {RecordViewRow} from "@/shared/types/db";
import type {PositionCounts} from "@/server/domains/player";
import {
    RECORD_CATEGORIES,
    RECORD_GRAINS,
    RECORD_SUBJECTS,
    type RecordCategory,
    type RecordEntry,
    type RecordGrain,
    type RecordSubject,
} from "../types";

const GRAINS = new Set<string>(RECORD_GRAINS);
const SUBJECTS = new Set<string>(RECORD_SUBJECTS);
const CATEGORIES = new Set<string>(RECORD_CATEGORIES.map(c => c.key));

function isPositionCounts(value: unknown): value is PositionCounts {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

export function mapRecordRow(row: RecordViewRow): RecordEntry | null {
    if (!row.grain || !GRAINS.has(row.grain)) return null;
    if (!row.subject || !SUBJECTS.has(row.subject)) return null;
    if (!row.category || !CATEGORIES.has(row.category)) return null;
    if (row.row_num == null || row.rank == null || row.value == null) return null;
    if (!row.record_season_id || !row.played_at) return null;

    const player =
        row.player_id && row.player_username
            ? {
                  id: row.player_id,
                  username: row.player_username,
                  displayName: row.player_display_name,
                  avatarUrl: row.player_avatar_url,
              }
            : null;

    const team =
        row.team_id && row.team_name && row.team_slug
            ? {
                  id: row.team_id,
                  name: row.team_name,
                  slug: row.team_slug,
                  logoUrl: row.team_logo_url,
                  logoBgRemoved: row.team_logo_bg_removed ?? false,
              }
            : null;

    const opponent =
        row.opponent_team_id && row.opponent_team_name && row.opponent_team_slug
            ? {id: row.opponent_team_id, name: row.opponent_team_name, slug: row.opponent_team_slug}
            : null;

    return {
        grain: row.grain as RecordGrain,
        subject: row.subject as RecordSubject,
        category: row.category as RecordCategory,
        rowNum: row.row_num,
        rank: row.rank,
        value: row.value,
        tiedBeyond: row.tied_beyond ?? 0,
        player,
        team,
        opponent,
        match: row.match_id ? {id: row.match_id, code: row.match_code, round: row.match_round ?? null} : null,
        setNumber: row.set_number,
        season: {
            id: row.record_season_id,
            name: row.season_name ?? "",
            slug: row.season_slug ?? "",
            number: row.season_number,
            active: row.season_active ?? false,
        },
        regionCode: row.region_code ?? "",
        playedAt: row.played_at,
        setsPlayed: row.sets_played ?? 0,
        matchesPlayed: row.matches_played ?? 0,
        positionCounts: isPositionCounts(row.position_counts) ? row.position_counts : null,
    };
}
