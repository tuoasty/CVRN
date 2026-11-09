import type {Match, MatchSet, PlayerMatchStatTotal, Standing} from "@/shared/types/db";
import type {MatchWithDetails} from "@/server/domains/match";
import type {MediaPost} from "@/server/domains/media";
import type {LeaderboardStatRow} from "@/server/domains/player";

let seq = 0;
function nextId(prefix: string): string {
    seq += 1;
    return `${prefix}-${seq}`;
}

export const SEASON_ID = "season-1";
export const HOME = "team-home";
export const AWAY = "team-away";

export function makeMatch(o: Partial<Match> & { sets?: MatchSet[]; round?: string | null } = {}): MatchWithDetails {
    const {sets, round, ...rest} = o;
    const match = {
        id: nextId("match"),
        season_id: SEASON_ID,
        home_team_id: HOME,
        away_team_id: AWAY,
        match_type: "season",
        status: "scheduled",
        week: 1,
        match_code: "W1-M1",
        scheduled_at: "2026-11-12T19:00:00Z",
        best_of: 5,
        home_sets_won: null,
        away_sets_won: null,
        home_team_lvr: null,
        away_team_lvr: null,
        home_team_points: null,
        away_team_points: null,
        home_team_bonus: null,
        away_team_bonus: null,
        point_diff: null,
        match_mvp_player_id: null,
        loser_mvp_player_id: null,
        is_forfeit: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
        ...rest,
    } as Match;
    return {match, sets: sets ?? [], officials: [], playoff_round: round ?? null};
}

export function makePost(o: Partial<MediaPost> = {}): MediaPost {
    return {
        id: nextId("post"),
        type: "gfx",
        title: "GFX",
        description: null,
        image_url: "https://cdn.test/gfx.png",
        image_width: null,
        image_height: null,
        video_url: null,
        author_id: null,
        match_id: null,
        team_id: null,
        player_id: null,
        season_id: SEASON_ID,
        round_key: null,
        article_id: null,
        published_at: "2026-11-01T00:00:00Z",
        is_pinned: false,
        pinned_at: null,
        created_by: "user",
        created_at: "2026-11-01T00:00:00Z",
        updated_at: null,
        ...o,
    };
}

export function makeStanding(o: Partial<Standing> = {}): Standing {
    return {
        team_id: HOME,
        team_name: "Home",
        team_slug: "home",
        team_logo_url: null,
        team_logo_bg_removed: false,
        season_id: SEASON_ID,
        region_id: "region-1",
        rank: 1,
        wins: 0,
        losses: 0,
        sets_won: 0,
        sets_lost: 0,
        total_lvr: 100,
        starting_lvr: 100,
        total_points: 0,
        starting_points: 0,
        total_bonus: 0,
        last_round_point_diff: null,
        ...o,
    } as Standing;
}

export function makeLeaderRow(o: Partial<LeaderboardStatRow> = {}): LeaderboardStatRow {
    return {
        player_id: nextId("player"),
        season_id: SEASON_ID,
        region_id: "region-1",
        team_id: HOME,
        sets_played: 10,
        matches_played: 3,
        points_total: 0,
        points_per_set: 0,
        assists_total: 0,
        assists_per_set: 0,
        blocks_total: 0,
        blocks_per_set: 0,
        receives_total: 0,
        receives_per_set: 0,
        ...o,
    } as LeaderboardStatRow;
}

export function makeTotal(o: Partial<PlayerMatchStatTotal> = {}): PlayerMatchStatTotal {
    return {
        match_id: "match-x",
        player_id: nextId("player"),
        team_id: HOME,
        display_name: null,
        avatar_url: null,
        points: 0,
        assists: 0,
        total_blocks: 0,
        total_receives: 0,
        sets_played: 3,
        ...o,
    } as PlayerMatchStatTotal;
}
