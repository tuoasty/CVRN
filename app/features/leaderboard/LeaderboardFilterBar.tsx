"use client";

import {useEffect, useState} from "react";
import {Calendar as CalendarIcon, Check, ChevronDown, Search, X} from "lucide-react";
import {format, startOfDay, addDays, subDays, isSameDay} from "date-fns";
import type {DateRange as CalendarRange} from "react-day-picker";
import {cn} from "@/lib/utils";
import {Popover, PopoverContent, PopoverTrigger} from "@/app/components/ui/popover";
import {Calendar} from "@/app/components/ui/calendar";
import {useDebouncedValue} from "@/app/hooks/useDebouncedValue";
import type {DateRange} from "./useLeaderboardFilters";
import type {SeasonCohort} from "./seasonCohorts";
import StatViewSelector from "@/app/features/player/StatViewSelector";
import {StatView} from "@/app/features/player/playerStatColumnMeta";
import {REGION_ALL, REGION_ORDER, POSITION_ALL} from "./useLeaderboardFilters";
import {POSITIONS} from "@/shared/volleyball/positions";

type Props = {
    view: StatView;
    query: string;
    onViewChange: (view: StatView) => void;
    onQueryChange: (q: string) => void;

    totalCount: number;

    shownCount: number;

    region?: string;
    onRegionChange?: (region: string) => void;

    position?: string;
    onPositionChange?: (position: string) => void;

    cohorts?: SeasonCohort[];
    selectedSeasons?: string[];
    onToggleSeason?: (slug: string) => void;
    onClearSeasons?: () => void;

    range?: DateRange;
    onRangeChange?: (range: DateRange) => void;
};

export default function LeaderboardFilterBar({
    view,
    query,
    onViewChange,
    onQueryChange,
    totalCount,
    shownCount,
    region,
    onRegionChange,
    position,
    onPositionChange,
    cohorts,
    selectedSeasons,
    onToggleSeason,
    onClearSeasons,
    range,
    onRangeChange,
}: Props) {
    const showRegions = region !== undefined && onRegionChange !== undefined;
    const showPositions = position !== undefined && onPositionChange !== undefined;
    const showSeasons =
        cohorts !== undefined &&
        selectedSeasons !== undefined &&
        onToggleSeason !== undefined &&
        onClearSeasons !== undefined;
    const showRange = range !== undefined && onRangeChange !== undefined;
    const narrowed = shownCount !== totalCount;

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <StatViewSelector value={view} onChange={onViewChange} />
                    {showRange && <DateRangeFilter range={range} onChange={onRangeChange} />}
                    {showPositions && <PositionFilter value={position} onChange={onPositionChange} />}
                </div>
                <PlayerSearchInput value={query} onChange={onQueryChange} />
            </div>

            {(showRegions || showSeasons) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {showRegions && <RegionFilter value={region} onChange={onRegionChange} />}
                        {showSeasons && (
                            <SeasonFilter
                                cohorts={cohorts}
                                selected={selectedSeasons}
                                onToggle={onToggleSeason}
                                onClear={onClearSeasons}
                            />
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {narrowed
                            ? `Showing ${shownCount} of ${totalCount} players`
                            : `${totalCount} ${totalCount === 1 ? "player" : "players"}`}
                    </span>
                </div>
            )}
        </div>
    );
}

function PlayerSearchInput({value, onChange}: {value: string; onChange: (q: string) => void}) {
    const [draft, setDraft] = useState(value);
    const debounced = useDebouncedValue(draft, 250);

    useEffect(() => {
        if (debounced !== value) onChange(debounced);

    }, [debounced]);

    useEffect(() => {
        if (value === "") setDraft("");
    }, [value]);

    return (
        <div className="relative w-full sm:w-64">
            <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                aria-hidden
            />
            <input
                type="search"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Find a player…"
                aria-label="Find a player"
                className={cn(
                    "h-9 w-full rounded-sm border border-border bg-background pl-8 pr-8 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",

                    "[&::-webkit-search-cancel-button]:appearance-none",
                )}
            />
            {draft !== "" && (
                <button
                    type="button"
                    onClick={() => setDraft("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

function RegionFilter({value, onChange}: {value: string; onChange: (region: string) => void}) {
    return (
        <div
            role="group"
            aria-label="Filter by region"
            className="flex items-center h-9 rounded-sm border border-border bg-muted/50 p-0.5"
        >
            {[REGION_ALL, ...REGION_ORDER].map(code => {
                const selected = value === code;
                return (
                    <button
                        key={code}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(code)}
                        className={cn(
                            "px-3 h-full text-xs font-semibold rounded-sm transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            selected
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {code === REGION_ALL ? "All" : code}
                    </button>
                );
            })}
        </div>
    );
}

function PositionFilter({value, onChange}: {value: string; onChange: (position: string) => void}) {
    return (
        <div
            role="group"
            aria-label="Filter by position"
            className="flex items-center h-9 rounded-sm border border-border bg-muted/50 p-0.5"
        >
            {[POSITION_ALL, ...POSITIONS.map(p => p.code)].map(code => {
                const selected = value === code;
                return (
                    <button
                        key={code}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(code)}
                        className={cn(
                            "px-3 h-full text-xs font-semibold rounded-sm transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            selected
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {code === POSITION_ALL ? "All" : code}
                    </button>
                );
            })}
        </div>
    );
}

function SeasonFilter({
    cohorts,
    selected,
    onToggle,
    onClear,
}: {
    cohorts: SeasonCohort[];
    selected: string[];
    onToggle: (slug: string) => void;
    onClear: () => void;
}) {
    if (cohorts.length === 0) return null;

    const label =
        selected.length === 0
            ? "All seasons"
            : selected.length === 1
                ? (cohorts.find(c => c.slug === selected[0])?.label ?? selected[0])
                : `${selected.length} seasons`;

    return (
        <Popover>
            <PopoverTrigger
                className={cn(
                    "inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-border text-xs font-semibold transition-colors",
                    "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    selected.length > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground",
                )}
            >
                {label}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 rounded-sm p-1">
                <button
                    type="button"
                    onClick={onClear}
                    className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    )}
                >
                    <Check
                        className={cn("h-4 w-4 shrink-0", selected.length > 0 && "invisible")}
                        aria-hidden
                    />
                    All seasons
                </button>
                <div className="my-1 h-px bg-border" />
                {cohorts.map(cohort => {
                    const checked = selected.includes(cohort.slug);
                    return (
                        <button
                            key={cohort.slug}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => onToggle(cohort.slug)}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            )}
                        >
                            <Check
                                className={cn("h-4 w-4 shrink-0", !checked && "invisible")}
                                aria-hidden
                            />
                            <span className="flex-1 text-left">{cohort.label}</span>
                            {}
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {cohort.regionCount}
                                {cohort.regionCount === 1 ? " region" : " regions"}
                            </span>
                        </button>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
}

function DateRangeFilter({
    range,
    onChange,
}: {
    range: DateRange;
    onChange: (range: DateRange) => void;
}) {
    const active = Boolean(range.from && range.to);

    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<CalendarRange | undefined>(undefined);

    useEffect(() => {
        if (open) setDraft(undefined);
    }, [open]);

    function handleSelect(next: CalendarRange | undefined) {
        const hadFrom = Boolean(draft?.from);
        setDraft(next);
        if (hadFrom && next?.from && next?.to) {
            onChange({
                from: startOfDay(next.from).toISOString(),
                to: startOfDay(addDays(next.to, 1)).toISOString(),
            });
            setOpen(false);
        }
    }

    function clear() {
        setDraft(undefined);
        onChange({from: null, to: null});
    }

    const hint = !draft?.from
        ? "Select the first day"
        : draft.to && !isSameDay(draft.from, draft.to)
            ? `${format(draft.from, "MMM d")} – ${format(draft.to, "MMM d")}`
            : "Select the last day";

    const label = active
        ? `${format(new Date(range.from!), "MMM d")} – ${format(subDays(new Date(range.to!), 1), "MMM d")}`
        : "All dates";

    return (
        <div className="flex items-center gap-1">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    className={cn(
                        "inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-border text-xs font-semibold transition-colors",
                        "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground",
                    )}
                >
                    <CalendarIcon className="h-3.5 w-3.5" aria-hidden />
                    {label}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto rounded-sm p-0">
                    <Calendar
                        mode="range"
                        selected={draft}
                        onSelect={handleSelect}
                        numberOfMonths={1}
                        defaultMonth={range.from ? new Date(range.from) : undefined}
                    />
                    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
                        <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>
                        <button
                            type="button"
                            onClick={clear}
                            disabled={!draft?.from}
                            className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            Clear
                        </button>
                    </div>
                </PopoverContent>
            </Popover>
            {active && (
                <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear date range"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
