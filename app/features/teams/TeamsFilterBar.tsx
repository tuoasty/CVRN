"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { Region } from "@/shared/types/db";
import { SeasonWithPlayoffConfig } from "@/server/domains/season";
import { cn } from "@/lib/utils";
import {
    isSpecificSeason,
    REGION_ALL,
    SEASON_ACTIVE,
    SEASON_INACTIVE,
    TeamsFilters,
} from "./selectTeams";

// Preferred button order; any other region codes are appended after these.
const REGION_ORDER = ["AS", "EU", "NA", "SA"];

const SEARCH_DEBOUNCE_MS = 250;

interface TeamsFilterBarProps {
    filters: TeamsFilters;
    regions: Region[];
    seasons: SeasonWithPlayoffConfig[];
    resultCount: number;
    onRegionChange: (region: string) => void;
    onSeasonChange: (season: string) => void;
    onQueryChange: (q: string) => void;
}

export default function TeamsFilterBar({
    filters,
    regions,
    seasons,
    resultCount,
    onRegionChange,
    onSeasonChange,
    onQueryChange,
}: TeamsFilterBarProps) {
    const [seasonOpen, setSeasonOpen] = useState(false);
    const [inputValue, setInputValue] = useState(filters.q);

    // Adopt external changes (back-navigation, reset). The guard avoids a redundant re-render
    // on the round trip where our own debounced write lands back as filters.q.
    useEffect(() => {
        setInputValue((current) => (current === filters.q ? current : filters.q));
    }, [filters.q]);

    useEffect(() => {
        if (inputValue === filters.q) return;
        const timer = setTimeout(() => onQueryChange(inputValue), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [inputValue, filters.q, onQueryChange]);

    const orderedRegions = useMemo(
        () =>
            [...regions].sort((a, b) => {
                const ai = REGION_ORDER.indexOf(a.code.toUpperCase());
                const bi = REGION_ORDER.indexOf(b.code.toUpperCase());
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            }),
        [regions]
    );

    // Slugs are unique per-region, so a specific season is only offered once a region is chosen.
    const regionSeasons = useMemo(() => {
        if (filters.region === REGION_ALL) return [];
        const region = regions.find((r) => r.code.toLowerCase() === filters.region);
        if (!region) return [];
        return seasons.filter((s) => s.region_id === region.id);
    }, [filters.region, regions, seasons]);

    const seasonLabel = useMemo(() => {
        if (filters.season === SEASON_ACTIVE) return "Active";
        if (filters.season === SEASON_INACTIVE) return "Concluded";
        const match = regionSeasons.find((s) => s.slug.toLowerCase() === filters.season);
        return match?.name ?? filters.season;
    }, [filters.season, regionSeasons]);

    const selectSeason = (season: string) => {
        onSeasonChange(season);
        setSeasonOpen(false);
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div
                role="group"
                aria-label="Filter by region"
                className="flex items-center h-9 rounded-sm border border-border bg-muted/50 p-0.5"
            >
                <button
                    type="button"
                    aria-pressed={filters.region === REGION_ALL}
                    onClick={() => onRegionChange(REGION_ALL)}
                    className={cn(
                        "px-3 h-full text-xs font-semibold rounded-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        filters.region === REGION_ALL
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    All
                </button>
                {orderedRegions.map((region) => {
                    const code = region.code.toLowerCase();
                    const selected = filters.region === code;
                    return (
                        <button
                            key={region.id}
                            type="button"
                            aria-pressed={selected}
                            aria-label={region.name}
                            onClick={() => onRegionChange(code)}
                            className={cn(
                                "px-3 h-full text-xs font-semibold rounded-sm transition-colors uppercase focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                selected
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {region.code}
                        </button>
                    );
                })}
            </div>

            <Popover open={seasonOpen} onOpenChange={setSeasonOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label={`Filter by season, currently ${seasonLabel}`}
                        className="flex items-center gap-1 h-9 px-2.5 rounded-sm border border-border bg-background text-xs text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <span className="text-foreground">{seasonLabel}</span>
                        <ChevronDown
                            className={cn(
                                "h-3 w-3 transition-transform duration-150",
                                seasonOpen && "rotate-180"
                            )}
                        />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="w-48 p-1">
                    <SeasonOption
                        label="Active"
                        hint="Ongoing seasons"
                        selected={filters.season === SEASON_ACTIVE}
                        onSelect={() => selectSeason(SEASON_ACTIVE)}
                    />
                    <SeasonOption
                        label="Concluded"
                        hint="Finished seasons"
                        selected={filters.season === SEASON_INACTIVE}
                        onSelect={() => selectSeason(SEASON_INACTIVE)}
                    />

                    {regionSeasons.length > 0 && (
                        <>
                            <div className="my-1 h-px bg-border" />
                            <p className="px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                                Specific season
                            </p>
                            {regionSeasons.map((season) => (
                                <SeasonOption
                                    key={season.id}
                                    label={season.name}
                                    selected={
                                        isSpecificSeason(filters.season) &&
                                        season.slug.toLowerCase() === filters.season
                                    }
                                    onSelect={() => selectSeason(season.slug.toLowerCase())}
                                />
                            ))}
                        </>
                    )}
                </PopoverContent>
            </Popover>

            <div className="w-full sm:flex-1 sm:max-w-sm">
                <label htmlFor="teams-search" className="sr-only">
                    Search teams by name
                </label>
                <Input
                    id="teams-search"
                    type="text"
                    placeholder="Search teams..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="rounded-sm"
                />
            </div>

            <div className="text-sm text-muted-foreground sm:ml-auto tabular-nums" aria-live="polite">
                {resultCount} {resultCount === 1 ? "team" : "teams"}
            </div>
        </div>
    );
}

function SeasonOption({
    label,
    hint,
    selected,
    onSelect,
}: {
    label: string;
    hint?: string;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "w-full text-left text-xs px-2 py-1.5 rounded-sm transition-colors flex items-center justify-between gap-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                selected
                    ? "bg-primary/10 text-foreground border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
        >
            <span>{label}</span>
            {hint && <span className="text-[9px] text-muted-foreground/70">{hint}</span>}
        </button>
    );
}
