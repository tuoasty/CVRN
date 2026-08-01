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

// Region and season are carried by the route (/[region]/[season]/leaderboard), not by
// query params — the navbar's RegionSeasonSelector already owns that choice for every
// season page. Only presentation state lives here.
export type LeaderboardFilters = {
    view: StatView;
    sort: SortKey;
    order: SortOrder;
};

const isStatView = (v: string): v is StatView => STAT_VIEWS.some(s => s.value === v);

const viewHasColumn = (view: StatView, key: string): key is SortKey =>
    STAT_VIEW_COLUMNS[view].some(c => c.key === key);

/** Omits defaults so the clean state is a bare season leaderboard URL. */
export function buildLeaderboardQuery(f: LeaderboardFilters): string {
    const params = new URLSearchParams();
    if (f.view !== "overview") params.set("view", f.view);
    if (f.sort !== STAT_VIEW_DEFAULT_SORT[f.view]) params.set("sort", f.sort);
    if (f.order !== "desc") params.set("order", f.order);
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

        return {view, sort, order};
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

    return {filters, setView, setSort};
}
