"use client";

import {useCallback, useState} from "react";
import {PlayerSeasonStat, PositionCounts} from "@/server/domains/player";
import {PositionCode} from "@/shared/volleyball/positions";
import {topPositions} from "@/app/features/player/formatPositions";
import {
    STAT_VIEW_DEFAULT_SORT,
    StatView,
} from "@/app/features/player/playerStatColumnMeta";

export type SortKey = keyof PlayerSeasonStat;
export type SortOrder = "asc" | "desc";

export const REGION_ORDER = ["AS", "EU", "NA", "SA"] as const;
export const REGION_ALL = "all";
export const POSITION_ALL = "all";

export type DateRange = {from: string | null; to: string | null};

export type LeaderboardFilters = {
    view: StatView;
    sort: SortKey;
    order: SortOrder;

    region: string;

    position: string;

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

export function matchesPosition(
    row: {position_counts: PositionCounts | null},
    position: string
): boolean {
    if (position === POSITION_ALL) return true;
    return topPositions(row.position_counts).includes(position as PositionCode);
}

const DEFAULT_FILTERS: LeaderboardFilters = {
    view: "overview",
    sort: STAT_VIEW_DEFAULT_SORT["overview"],
    order: "desc",
    region: REGION_ALL,
    position: POSITION_ALL,
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

    const setPosition = useCallback((position: string) => {
        setFilters(f => ({...f, position}));
    }, []);

    const setQuery = useCallback((q: string) => {
        setFilters(f => ({...f, q}));
    }, []);

    const setSeasons = useCallback((seasons: string[]) => {
        setFilters(f => ({...f, seasons}));
    }, []);

    const setRange = useCallback((range: DateRange) => {
        setFilters(f => ({...f, range}));
    }, []);

    return {filters, setView, setSort, setRegion, setPosition, setQuery, setSeasons, setRange};
}
