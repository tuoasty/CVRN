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
        readCount: 15,
        affects: "Matches, match detail, standings, playoffs, home",
    },
    [CACHE_TAGS.playoffs]: {
        label: "Playoffs",
        description: "Playoff bracket structure, rounds and advancement.",
        readCount: 6,
        affects: "Playoffs page, matches playoff tab",
    },
    [CACHE_TAGS.teams]: {
        label: "Teams",
        description: "Team pages, logos, and rosters.",
        readCount: 13,
        affects: "Teams, team detail, matches, match detail, archive, home",
    },
    [CACHE_TAGS.players]: {
        label: "Players",
        description:
            "Player profiles, avatars, and rosters. Also backs the identity (names, avatars, team logos) joined onto both leaderboards.",
        readCount: 11,
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
        readCount: 6,
        affects: "Media page, home sidebar, match detail",
    },
    [CACHE_TAGS.articles]: {
        label: "Articles",
        description: "News articles and their cover posts.",
        readCount: 2,
        affects: "Media page articles tab, article detail, home",
    },
    [CACHE_TAGS.updateLogs]: {
        label: "Update Logs",
        description: "Published game update logs and the version list used for prev/next and the switcher.",
        readCount: 2,
        affects: "Updates pages",
    },
    [CACHE_TAGS.stats]: {
        label: "Stats",
        description:
            "Player box-score numbers behind both leaderboards. Held for 30 days and purged only by a stats sync, so this is the tag to press after uploading match sheets.",
        readCount: 3,
        affects: "Season leaderboard, all-time leaderboard, spec calibration",
    },
    [CACHE_TAGS.specs]: {
        label: "Specs",
        description:
            "The published public spec-requirements snapshots (masked difficulty tiers, one per region) and the list of published regions. Regenerated on Publish.",
        readCount: 2,
        affects: "Spec requirements page",
    },
    [CACHE_TAGS.rawStats]: {
        label: "Raw Stats",
        description:
            "Raw (unpublished) per-player box-score totals and percentile ranks read directly off player_match_stats, independent of the Publish gate on the Stats tag. Held for 15 minutes.",
        readCount: 3,
        affects: "Player detail API, stats summary API",
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
    CACHE_TAGS.articles,
    CACHE_TAGS.updateLogs,
    CACHE_TAGS.specs,
    CACHE_TAGS.rawStats,
];
