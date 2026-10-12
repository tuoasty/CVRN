import {SeasonAwardEntryWithPlayer} from "../types";

type RawAwardRow = Omit<SeasonAwardEntryWithPlayer, "players"> & {
    players: {
        id: string;
        username: string;
        player_team_seasons?: {season_id: string; teams: {name: string} | null}[] | null;
    };
};

export function toSeasonAwardEntry(row: RawAwardRow): SeasonAwardEntryWithPlayer {
    const {player_team_seasons, ...player} = row.players;
    const teamName = (player_team_seasons ?? []).find(pts => pts.season_id === row.season_id && pts.teams?.name)?.teams?.name ?? null;
    return {...row, players: {...player, season_team_name: teamName}};
}

export function toSeasonAwardEntries(rows: unknown[]): SeasonAwardEntryWithPlayer[] {
    return (rows as RawAwardRow[]).map(toSeasonAwardEntry);
}
