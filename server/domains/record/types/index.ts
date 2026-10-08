import type {PositionCounts} from "@/server/domains/player";

export const RECORD_GRAINS = ["set", "match", "season"] as const;
export type RecordGrain = (typeof RECORD_GRAINS)[number];

export const RECORD_SUBJECTS = ["player", "team"] as const;
export type RecordSubject = (typeof RECORD_SUBJECTS)[number];

export const RECORD_CATEGORIES = [
    {key: "points", label: "Points"},
    {key: "kills", label: "Kills"},
    {key: "ape_kills", label: "Ape Kills"},
    {key: "delay_kills", label: "Delay Kills"},
    {key: "quick_kills", label: "Quick Kills"},
    {key: "wipes_tools", label: "Wipes/Tools"},
    {key: "assists", label: "Assists"},
    {key: "blocks", label: "Blocks"},
    {key: "kill_blocks", label: "Kill Blocks"},
    {key: "block_touches", label: "Block Touches"},
    {key: "receives", label: "Receives"},
    {key: "digs", label: "Digs"},
    {key: "dives", label: "Dives"},
    {key: "aces", label: "Aces"},
    {key: "errors", label: "Errors"},
] as const;
export type RecordCategory = (typeof RECORD_CATEGORIES)[number]["key"];

export const TEAM_EXCLUDED_CATEGORIES: readonly RecordCategory[] = ["points"];

export type RecordScope =
    | {kind: "all"}
    | {kind: "region"; regionId: string; regionCode: string}
    | {kind: "season"; regionId: string; regionCode: string; seasonId: string; seasonSlug: string; seasonName: string};

export interface RecordEntry {
    grain: RecordGrain;
    subject: RecordSubject;
    category: RecordCategory;
    rowNum: number;
    rank: number;
    value: number;
    tiedBeyond: number;
    player: {id: string; username: string; displayName: string | null; avatarUrl: string | null} | null;
    team: {id: string; name: string; slug: string; logoUrl: string | null; logoBgRemoved: boolean} | null;
    opponent: {id: string; name: string; slug: string} | null;
    match: {id: string; code: string | null} | null;
    setNumber: number | null;
    season: {id: string; name: string; slug: string; number: number | null; active: boolean};
    regionCode: string;
    playedAt: string;
    setsPlayed: number;
    matchesPlayed: number;
    positionCounts: PositionCounts | null;
}

export interface RecordCategoryGroup {
    category: RecordCategory;
    label: string;
    entries: RecordEntry[];
    tiedBeyond: number;
}

export type RecordBook = Record<RecordSubject, Record<RecordGrain, RecordCategoryGroup[]>>;

export interface RecordsPayload {
    scope: RecordScope;
    book: RecordBook;
}

export interface GetRecordsInput {
    regionCode?: string;
    seasonSlug?: string;
}

export {RecordsParamsSchema} from "./schemas";
export type {RecordsParams} from "./schemas";
