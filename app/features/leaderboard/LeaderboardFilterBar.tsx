"use client";

import {useEffect, useState, type ReactNode} from "react";
import {Calendar as CalendarIcon, Search, X} from "lucide-react";
import {format, startOfDay, addDays, subDays, isSameDay} from "date-fns";
import type {DateRange as CalendarRange} from "react-day-picker";
import {cn} from "@/lib/utils";
import {Popover, PopoverContent, PopoverTrigger} from "@/app/components/ui/popover";
import {Calendar} from "@/app/components/ui/calendar";
import {OptionButton, OptionRow} from "@/app/components/filters/OptionRow";
import {ViewTabs} from "@/app/components/filters/ViewTabs";
import {useDebouncedValue} from "@/app/hooks/useDebouncedValue";
import type {DateRange} from "./useLeaderboardFilters";
import type {SeasonCohort} from "./seasonCohorts";
import {StatView, STAT_VIEWS} from "@/app/features/player/playerStatColumnMeta";
import {REGION_ALL, REGION_ORDER, POSITION_ALL} from "./useLeaderboardFilters";
import {POSITIONS} from "@/shared/volleyball/positions";

type Props = {
    view: StatView;
    query: string;
    onViewChange: (view: StatView) => void;
    onQueryChange: (q: string) => void;

    region?: string;
    onRegionChange?: (region: string) => void;

    position?: string;
    onPositionChange?: (position: string) => void;

    cohorts?: SeasonCohort[];
    selectedSeasons?: string[];
    onSeasonsChange?: (slugs: string[]) => void;

    range?: DateRange;
    onRangeChange?: (range: DateRange) => void;
};

export const LEADERBOARD_TABS_ID = "leaderboard-view";

const REGION_OPTIONS = REGION_ORDER.map(code => ({value: code as string, label: code}));
const POSITION_OPTIONS = POSITIONS.map(p => ({value: p.code as string, label: p.code, title: p.label}));

function Rule() {
    return <span aria-hidden className="h-5 w-px shrink-0 bg-border" />;
}

function Num({children}: {children: ReactNode}) {
    return <span className="font-mono tabular-nums">{children}</span>;
}

export function LeaderboardCount({total, shown}: {total: number; shown: number}) {
    return (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
            {shown !== total ? (
                <>
                    Showing <Num>{shown}</Num> of <Num>{total}</Num> players
                </>
            ) : (
                <>
                    <Num>{total}</Num> {total === 1 ? "player" : "players"}
                </>
            )}
        </span>
    );
}

export default function LeaderboardFilterBar({
    view,
    query,
    onViewChange,
    onQueryChange,
    region,
    onRegionChange,
    position,
    onPositionChange,
    cohorts,
    selectedSeasons,
    onSeasonsChange,
    range,
    onRangeChange,
}: Props) {
    const showRegions = region !== undefined && onRegionChange !== undefined;
    const showPositions = position !== undefined && onPositionChange !== undefined;
    const showSeasons = cohorts !== undefined && selectedSeasons !== undefined && onSeasonsChange !== undefined;
    const showRange = range !== undefined && onRangeChange !== undefined;

    return (
        <div>
            <ViewTabs
                label="Stat view"
                idBase={LEADERBOARD_TABS_ID}
                tabs={STAT_VIEWS}
                value={view}
                onChange={onViewChange}
                density="compact"
                wrapToolsBelow="xl"
                toolsClassName="xl:pb-1.5"
            >
                <div className="flex flex-wrap items-center justify-between gap-5">
                    <div className="flex flex-wrap items-center gap-5">
                        {showPositions && (
                            <OptionRow
                                layout="inline"
                                label="Position"
                                allOption={{label: "All"}}
                                options={POSITION_OPTIONS}
                                value={position === POSITION_ALL ? null : position}
                                onChange={next => onPositionChange(next ?? POSITION_ALL)}
                            />
                        )}
                        {showPositions && showRange && <Rule />}
                        {showRange && <DateRangeFilter range={range} onChange={onRangeChange} />}
                    </div>
                    <PlayerSearchInput value={query} onChange={onQueryChange} />
                </div>
            </ViewTabs>

            {(showRegions || showSeasons) && (
                <div className="mt-2 flex flex-wrap items-center gap-5">
                    {showRegions && (
                        <OptionRow
                            layout="inline"
                            label="Region"
                            allOption={{label: "All"}}
                            options={REGION_OPTIONS}
                            value={region === REGION_ALL ? null : region}
                            onChange={next => onRegionChange(next ?? REGION_ALL)}
                        />
                    )}
                    {showRegions && showSeasons && <Rule />}
                    {showSeasons && (
                        <SeasonFilter cohorts={cohorts} selected={selectedSeasons} onChange={onSeasonsChange} />
                    )}
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
        <div className="relative w-full sm:w-[200px]">
            <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
            />
            <input
                type="search"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Find a player…"
                aria-label="Find a player"
                className={cn(
                    "h-8 w-full rounded-sm border border-border bg-background pl-8 pr-8 text-sm",
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

function SeasonFilter({
    cohorts,
    selected,
    onChange,
}: {
    cohorts: SeasonCohort[];
    selected: string[];
    onChange: (slugs: string[]) => void;
}) {
    if (cohorts.length === 0) return null;

    const options = cohorts.map(cohort => ({
        value: cohort.slug,
        label: cohort.label.match(/\d+$/)?.[0] ?? cohort.label,
        title: `${cohort.label} · ${cohort.regionCount} ${cohort.regionCount === 1 ? "region" : "regions"}`,
    }));

    return (
        <OptionRow
            multi
            mono
            layout="inline"
            label="Season"
            allOption={{label: "All"}}
            options={options}
            values={selected}
            onChange={onChange}
            trailing={
                selected.length > 1 ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                        <Num>{selected.length}</Num> combined
                    </span>
                ) : null
            }
        />
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
        <div className="flex items-center">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <OptionButton density="compact" selected={active} className="gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 opacity-70" aria-hidden />
                        {label}
                    </OptionButton>
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
                    className="inline-grid size-6 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <X className="h-3.5 w-3.5" aria-hidden />
                </button>
            )}
        </div>
    );
}
