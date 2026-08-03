"use client";

import {useCallback, useMemo} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {PlayerSeasonStat} from "@/server/domains/player";
import {
    STAT_VIEW_COLUMNS,
    STAT_VIEW_DEFAULT_SORT,
    STAT_VIEWS,
    StatView,
} from "@/app/features/player/playerStatColumnMeta";

export type SortKey = keyof PlayerSeasonStat;
export type SortOrder = "asc" | "desc";

/** Matches TeamsFilterBar's ordering so the two region pickers read the same. */
export const REGION_ORDER = ["AS", "EU", "NA", "SA"] as const;
export const REGION_ALL = "all";

// Season boards carry region and season in the route (/[region]/[season]/leaderboard) —
// the navbar's RegionSeasonSelector owns that choice. `region` here is for the all-time
// board only, where a career row's region is data rather than scope. Everything in this
// type is presentation state, which is why the page can stay statically cached.
export type LeaderboardFilters = {
    view: StatView;
    sort: SortKey;
    order: SortOrder;
    /** Region code, or `all`. Ignored by the season board, which renders no picker. */
    region: string;
    /**
     * Season slugs to include. Empty means every season — the default, and the reason
     * a bare `/leaderboard` is still the whole-career board.
     */
    seasons: string[];
    /** Free-text player search. Both boards. */
    q: string;
};

/**
 * Search predicate, structurally typed so both boards' rows satisfy it. Lives here
 * rather than in the table because the filter bar has to count matches to render
 * "showing N of M", and two copies of this would drift.
 */
export function matchesPlayerQuery(
    row: {username: string; display_name: string | null},
    q: string
): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
        row.username.toLowerCase().includes(needle) ||
        (row.display_name?.toLowerCase().includes(needle) ?? false)
    );
}

const isStatView = (v: string): v is StatView => STAT_VIEWS.some(s => s.value === v);

const viewHasColumn = (view: StatView, key: string): key is SortKey =>
    STAT_VIEW_COLUMNS[view].some(c => c.key === key);

const isRegion = (v: string): boolean => REGION_ORDER.some(r => r === v);

/** Omits defaults so the clean state is a bare leaderboard URL. */
export function buildLeaderboardQuery(f: LeaderboardFilters): string {
    const params = new URLSearchParams();
    if (f.view !== "overview") params.set("view", f.view);
    if (f.sort !== STAT_VIEW_DEFAULT_SORT[f.view]) params.set("sort", f.sort);
    if (f.order !== "desc") params.set("order", f.order);
    if (f.region !== REGION_ALL) params.set("region", f.region.toLowerCase());
    // Sorted so the same selection always produces the same URL — two people picking
    // S2 then S1 versus S1 then S2 should be able to compare links.
    if (f.seasons.length > 0) params.set("seasons", [...f.seasons].sort().join(","));
    if (f.q !== "") params.set("q", f.q);
    return params.toString();
}

export function useLeaderboardFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const filters: LeaderboardFilters = useMemo(() => {
        const rawView = (searchParams.get("view") ?? "overview").toLowerCase();
        const view: StatView = isStatView(rawView) ? rawView : "overview";

        // A sort key from another view would silently sort by a column the reader cannot
        // see, so it falls back to the view's own default rather than persisting.
        const rawSort = searchParams.get("sort") ?? "";
        const sort: SortKey = viewHasColumn(view, rawSort) ? rawSort : STAT_VIEW_DEFAULT_SORT[view];

        const order: SortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";

        // Untrusted URL input: an unrecognised code falls back to `all` rather than
        // filtering the board down to nothing, matching useTeamsFilters.
        const rawRegion = (searchParams.get("region") ?? REGION_ALL).toUpperCase();
        const region = isRegion(rawRegion) ? rawRegion : REGION_ALL;

        // Slugs are not validated here — the hook has no season list. The page
        // intersects them with the cohorts actually present, so a stale slug from an
        // old link simply drops out instead of emptying the board.
        const seasons = (searchParams.get("seasons") ?? "")
            .split(",")
            .map(s => s.trim().toLowerCase())
            .filter(Boolean);

        return {
            view,
            sort,
            order,
            region,
            seasons: [...new Set(seasons)],
            q: searchParams.get("q") ?? "",
        };
    }, [searchParams]);

    const write = useCallback(
        (next: LeaderboardFilters) => {
            const query = buildLeaderboardQuery(next);
            router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false});
        },
        [pathname, router]
    );

    // Switching view always resets the sort to that view's default, even when the old
    // column exists in the new view. The three Season columns (SP, PTS, PTS/S) appear in
    // every view, so carrying the sort over meant picking "Setting" while sorted by PTS
    // left the reader on a points ranking labelled as a setting board.
    const setView = useCallback(
        (view: StatView) => {
            write({...filters, view, sort: STAT_VIEW_DEFAULT_SORT[view], order: "desc"});
        },
        [filters, write]
    );

    // Re-clicking the active column flips direction; a new column starts descending,
    // which is the useful direction for every stat on this board.
    const setSort = useCallback(
        (sort: SortKey) => {
            const order: SortOrder = sort === filters.sort && filters.order === "desc" ? "asc" : "desc";
            write({...filters, sort, order});
        },
        [filters, write]
    );

    const setRegion = useCallback(
        (region: string) => write({...filters, region}),
        [filters, write]
    );

    const setQuery = useCallback(
        (q: string) => write({...filters, q}),
        [filters, write]
    );

    /** Adds or removes one cohort. Clearing every cohort means "all seasons". */
    const toggleSeason = useCallback(
        (slug: string) => {
            const seasons = filters.seasons.includes(slug)
                ? filters.seasons.filter(s => s !== slug)
                : [...filters.seasons, slug];
            write({...filters, seasons});
        },
        [filters, write]
    );

    const clearSeasons = useCallback(
        () => write({...filters, seasons: []}),
        [filters, write]
    );

    return {filters, setView, setSort, setRegion, setQuery, toggleSeason, clearSeasons};
}
