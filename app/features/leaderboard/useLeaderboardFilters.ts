"use client";

import {useCallback, useState} from "react";
import {PlayerSeasonStat} from "@/server/domains/player";
import {
    STAT_VIEW_DEFAULT_SORT,
    StatView,
} from "@/app/features/player/playerStatColumnMeta";

export type SortKey = keyof PlayerSeasonStat;
export type SortOrder = "asc" | "desc";

export const REGION_ORDER = ["AS", "EU", "NA", "SA"] as const;
export const REGION_ALL = "all";

export type DateRange = {from: string | null; to: string | null};

export type LeaderboardFilters = {
    view: StatView;
    sort: SortKey;
    order: SortOrder;

    region: string;

    seasons: string[];

    range: DateRange;

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

const DEFAULT_FILTERS: LeaderboardFilters = {
    view: "overview",
    sort: STAT_VIEW_DEFAULT_SORT["overview"],
    order: "desc",
    region: REGION_ALL,
    seasons: [],
    range: {from: null, to: null},
    q: "",
};

export function useLeaderboardFilters() {
    const [filters, setFilters] = useState<LeaderboardFilters>(DEFAULT_FILTERS);

    const setView = useCallback((view: StatView) => {
        setFilters(f => ({...f, view, sort: STAT_VIEW_DEFAULT_SORT[view], order: "desc"}));
    }, []);

    const setSort = useCallback((sort: SortKey) => {
        setFilters(f => ({
            ...f,
            sort,
            order: sort === f.sort && f.order === "desc" ? "asc" : "desc",
        }));
    }, []);

    const setRegion = useCallback((region: string) => {
        setFilters(f => ({...f, region}));
    }, []);

    const setQuery = useCallback((q: string) => {
        setFilters(f => ({...f, q}));
    }, []);

    const toggleSeason = useCallback((slug: string) => {
        setFilters(f => ({
            ...f,
            seasons: f.seasons.includes(slug)
                ? f.seasons.filter(s => s !== slug)
                : [...f.seasons, slug],
        }));
    }, []);

    const clearSeasons = useCallback(() => {
        setFilters(f => ({...f, seasons: []}));
    }, []);

    const setRange = useCallback((range: DateRange) => {
        setFilters(f => ({...f, range}));
    }, []);

    return {filters, setView, setSort, setRegion, setQuery, toggleSeason, clearSeasons, setRange};
}
