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

export const REGION_ORDER = ["AS", "EU", "NA", "SA"] as const;
export const REGION_ALL = "all";

export type LeaderboardFilters = {
    view: StatView;
    sort: SortKey;
    order: SortOrder;

    region: string;

    seasons: string[];

    q: string;
};

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

export function buildLeaderboardQuery(f: LeaderboardFilters): string {
    const params = new URLSearchParams();
    if (f.view !== "overview") params.set("view", f.view);
    if (f.sort !== STAT_VIEW_DEFAULT_SORT[f.view]) params.set("sort", f.sort);
    if (f.order !== "desc") params.set("order", f.order);
    if (f.region !== REGION_ALL) params.set("region", f.region.toLowerCase());

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

        const rawSort = searchParams.get("sort") ?? "";
        const sort: SortKey = viewHasColumn(view, rawSort) ? rawSort : STAT_VIEW_DEFAULT_SORT[view];

        const order: SortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";

        const rawRegion = (searchParams.get("region") ?? REGION_ALL).toUpperCase();
        const region = isRegion(rawRegion) ? rawRegion : REGION_ALL;

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

    const setView = useCallback(
        (view: StatView) => {
            write({...filters, view, sort: STAT_VIEW_DEFAULT_SORT[view], order: "desc"});
        },
        [filters, write]
    );

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
