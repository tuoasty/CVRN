import {CACHE_TAGS, type CacheTag} from "./tags";

export type CacheTagInfo = {
    label: string;
    description: string;
    readCount: number;
    affects: string;
};

export const CACHE_TAG_INFO: Record<CacheTag, CacheTagInfo> = {
    [CACHE_TAGS.standings]: {
        label: "Standings",
        description: "Standings table ordering and totals.",
        readCount: 1,
        affects: "Standings page",
    },
    [CACHE_TAGS.matches]: {
        label: "Matches",
        description:
            "Match lists, schedules, match detail pages, box scores, standings and playoff rounds. Widest blast radius.",
        readCount: 12,
        affects: "Matches, match detail, standings, playoffs, home",
    },
    [CACHE_TAGS.playoffs]: {
        label: "Playoffs",
        description: "Playoff bracket structure, rounds and advancement.",
        readCount: 5,
        affects: "Playoffs page, matches playoff tab",
    },
    [CACHE_TAGS.teams]: {
        label: "Teams",
        description: "Team pages, logos, and rosters.",
        readCount: 11,
        affects: "Teams, team detail, matches, match detail, archive, home",
    },
    [CACHE_TAGS.players]: {
        label: "Players",
        description:
            "Player profiles, avatars, and rosters. Also backs the identity (names, avatars, team logos) joined onto both leaderboards.",
        readCount: 8,
        affects: "Players, player detail, teams, match detail, archive, leaderboards",
    },
    [CACHE_TAGS.seasons]: {
        label: "Seasons",
        description: "Season metadata, archive, and podium.",
        readCount: 6,
        affects: "Archive, season routing, podium",
    },
    [CACHE_TAGS.regions]: {
        label: "Regions",
        description: "Region list and region routing.",
        readCount: 2,
        affects: "Region routing, navbar selector",
    },
    [CACHE_TAGS.media]: {
        label: "Media",
        description: "Media posts, including the GFX and VOD attached to a match.",
        readCount: 2,
        affects: "Media page, home sidebar, match detail",
    },
    [CACHE_TAGS.stats]: {
        label: "Stats",
        description:
            "Player box-score numbers behind both leaderboards. Held for 30 days and purged only by a stats sync, so this is the tag to press after uploading match sheets.",
        readCount: 2,
        affects: "Season leaderboard, all-time leaderboard, spec calibration",
    },
};

export const CACHE_TAG_ORDER: CacheTag[] = [
    CACHE_TAGS.stats,
    CACHE_TAGS.standings,
    CACHE_TAGS.matches,
    CACHE_TAGS.playoffs,
    CACHE_TAGS.teams,
    CACHE_TAGS.players,
    CACHE_TAGS.seasons,
    CACHE_TAGS.regions,
    CACHE_TAGS.media,
];
