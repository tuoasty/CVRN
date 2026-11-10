import type {PlayerLeaderboardRow, PlayerWithRole, PositionCounts} from "@/server/domains/player";
import type {PositionCode} from "@/shared/volleyball/positions";
import {topPositions} from "@/app/features/player/formatPositions";
import {aggregateCareerRows} from "@/app/features/leaderboard/aggregateCareerRows";
import {buildPublicPlayerHref} from "@/app/utils/matchDetailHref";

export interface RosterTile {
    player: PlayerWithRole;
    positions: PositionCode[];
    href: string | null;
}

const ROLE_ORDER: Record<PlayerWithRole["role"], number> = {
    captain: 0,
    vice_captain: 1,
    court_captain: 2,
    player: 3,
};

const POSITION_ORDER: PositionCode[] = ["SET", "OPP", "OUT", "MID", "LIB"];

export function positionChain(input: {
    seasonCounts: PositionCounts | null;
    seasonSets: number;
    listed: PositionCode | null;
    careerCounts: PositionCounts | null;
}): PositionCode[] {
    if (input.seasonSets > 0) {
        const season = topPositions(input.seasonCounts, 2);
        if (season.length > 0) return season;
    }
    if (input.listed) return [input.listed];
    return topPositions(input.careerCounts, 1);
}

function positionRank(tile: RosterTile): number {
    const first = tile.positions[0];
    return first ? POSITION_ORDER.indexOf(first) : POSITION_ORDER.length;
}

function nameOf(tile: RosterTile): string {
    return tile.player.display_name || tile.player.username || "";
}

export function buildRosterTiles(input: {
    players: PlayerWithRole[];
    rows: PlayerLeaderboardRow[];
    seasonId: string;
    regionId: string;
}): RosterTile[] {
    const ids = new Set(input.players.map((p) => p.id));
    const mine = input.rows.filter((r) => ids.has(r.player_id) && r.region_id === input.regionId);
    const career = new Map(aggregateCareerRows(mine).map((r) => [r.player_id, r]));
    const season = new Map(
        aggregateCareerRows(mine.filter((r) => r.season_id === input.seasonId)).map((r) => [r.player_id, r]),
    );

    return orderRoster(
        input.players.map((player) => {
            const seasonRow = season.get(player.id);
            return {
                player,
                positions: positionChain({
                    seasonCounts: seasonRow?.position_counts ?? null,
                    seasonSets: seasonRow?.sets_played ?? 0,
                    listed: player.current_position,
                    careerCounts: career.get(player.id)?.position_counts ?? null,
                }),
                href: player.username ? buildPublicPlayerHref(player.username) : null,
            };
        }),
    );
}

export function orderRoster(tiles: RosterTile[]): RosterTile[] {
    return [...tiles].sort(
        (a, b) =>
            ROLE_ORDER[a.player.role] - ROLE_ORDER[b.player.role] ||
            positionRank(a) - positionRank(b) ||
            nameOf(a).localeCompare(nameOf(b), undefined, {sensitivity: "base"}),
    );
}
