export type LeagueFields = {stars: number; position: string};

export function isLeagueSpec<T extends {stars: number | null; position: string | null; is_custom: boolean}>(spec: T): spec is T & LeagueFields {
    return !spec.is_custom && spec.stars !== null && spec.position !== null;
}
