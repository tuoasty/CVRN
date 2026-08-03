import {CACHE_TAGS, type CacheTag} from "./tags";

/**
 * Human-facing metadata for the admin cache page.
 *
 * Next exposes no API for enumerating tag registrations, so this is hand-maintained
 * against the `tags:` arrays in `publicReads.ts`. The test in `__tests__/tagInfo.test.ts`
 * parses that file and fails if `readCount` drifts, so the numbers here are checked rather
 * than trusted.
 *
 * `readCount` is what sizes the warning in the UI: the tags are wildly asymmetric —
 * purging `media` clears one read, purging `matches` clears eleven and re-renders most of
 * the site. Showing that at the point of decision is the whole reason this table exists.
 */
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
        readCount: 14,
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
        description: "Player profiles, avatars, and rosters.",
        readCount: 8,
        affects: "Players, player detail, teams, match detail, archive",
    },
    [CACHE_TAGS.seasons]: {
        label: "Seasons",
        description: "Season metadata, archive, and podium.",
        readCount: 5,
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
        description: "Media posts.",
        readCount: 1,
        affects: "Media page, home sidebar",
    },
};

/** Display order: most-likely-needed first, not alphabetical. */
export const CACHE_TAG_ORDER: CacheTag[] = [
    CACHE_TAGS.standings,
    CACHE_TAGS.matches,
    CACHE_TAGS.playoffs,
    CACHE_TAGS.teams,
    CACHE_TAGS.players,
    CACHE_TAGS.seasons,
    CACHE_TAGS.regions,
    CACHE_TAGS.media,
];
