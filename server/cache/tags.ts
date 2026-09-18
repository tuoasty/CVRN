
export const CACHE_TAGS = {
    regions: "regions",
    seasons: "seasons",
    teams: "teams",
    players: "players",
    standings: "standings",
    matches: "matches",
    playoffs: "playoffs",
    media: "media",
    articles: "articles",
    stats: "stats",
    specs: "specs",
    rawStats: "raw-stats",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_CACHE_TAGS: CacheTag[] = Object.values(CACHE_TAGS);

export const PUBLIC_REVALIDATE_SECONDS = 604800;

export const STATS_REVALIDATE_SECONDS = 2592000;

export const RAW_STATS_REVALIDATE_SECONDS = 900;
