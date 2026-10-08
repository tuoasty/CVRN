"use client";

import {useState, type ReactNode} from "react";
import {useRouter} from "next/navigation";
import {Check, ChevronDown} from "lucide-react";
import {cn} from "@/lib/utils";
import {Popover, PopoverContent, PopoverTrigger} from "@/app/components/ui/popover";
import {RegionFilter} from "@/app/features/leaderboard/LeaderboardFilterBar";
import {REGION_ALL} from "@/app/features/leaderboard/useLeaderboardFilters";
import type {RecordEntry, RecordGrain, RecordSubject, RecordsPayload} from "@/server/domains/record";
import {
    buildRecordsHref,
    nextScopeForRegion,
    seasonsForRegion,
    type RecordSeasonOption,
} from "./recordScopeParams";

const GRAINS: {key: RecordGrain; label: string}[] = [
    {key: "set", label: "Single Set"},
    {key: "match", label: "Single Match"},
    {key: "season", label: "Season"},
];

const SUBJECTS: {key: RecordSubject; label: string}[] = [
    {key: "player", label: "Players"},
    {key: "team", label: "Teams"},
];

type Props = {
    payload: RecordsPayload;
    seasonOptions: RecordSeasonOption[];
    region: string | null;
    season: number | null;
};

export default function RecordsPage({payload, seasonOptions, region, season}: Props) {
    const router = useRouter();
    const [subject, setSubject] = useState<RecordSubject>("player");

    const goTo = (next: {region: string | null; season: number | null}) => {
        router.push(buildRecordsHref(next.region, next.season));
    };

    const handleRegion = (code: string) => {
        const nextRegion = code === REGION_ALL ? null : code;
        goTo(nextScopeForRegion(seasonOptions, nextRegion, season));
    };

    const book = payload.book[subject];
    const isEmpty = GRAINS.every(g => book[g.key].length === 0);

    return (
        <div className="mx-auto max-w-[1400px] px-7 pb-20 pt-6">
            <h1 className="mb-5 text-2xl font-semibold tracking-[-.025em]">Records</h1>

            <div className="mb-6 flex flex-wrap items-center gap-2">
                <RegionFilter value={region ? region.toUpperCase() : REGION_ALL} onChange={handleRegion} />
                <SeasonSelect
                    options={seasonsForRegion(seasonOptions, region)}
                    value={season}
                    showRegionCount={!region}
                    onChange={next => goTo({region, season: next})}
                />
                <SegmentedControl
                    label="Record subject"
                    options={SUBJECTS}
                    value={subject}
                    onChange={setSubject}
                />
            </div>

            {isEmpty ? (
                <p className="text-sm text-muted-foreground">No tracked matches in this scope yet.</p>
            ) : (
                GRAINS.map(grain => (
                    <section key={grain.key} className="mb-10">
                        <h2 className="mb-3 text-lg font-semibold">{grain.label}</h2>
                        {book[grain.key].map(group => (
                            <div key={group.category} className="mb-4">
                                <h3 className="text-sm font-semibold">{group.label}</h3>
                                <ol className="text-sm">
                                    {group.entries.map(entry => (
                                        <li key={entry.rowNum} className="flex gap-3">
                                            <span className="w-6 font-mono tabular-nums">{entry.rank}</span>
                                            <span className="w-48">{entryName(entry)}</span>
                                            <span className="w-10 font-mono tabular-nums">{entry.value}</span>
                                            <span className="text-muted-foreground">{contextLine(entry)}</span>
                                        </li>
                                    ))}
                                </ol>
                                {group.tiedBeyond > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        +{group.tiedBeyond} more tied at {group.entries[group.entries.length - 1].value}
                                    </p>
                                )}
                            </div>
                        ))}
                    </section>
                ))
            )}

            <p className="mt-10 text-xs text-muted-foreground">Records from tracked playoff matches.</p>
        </div>
    );
}

function entryName(entry: RecordEntry): string {
    if (entry.subject === "team") return entry.team?.name ?? "Unknown team";
    return entry.player?.displayName ?? entry.player?.username ?? "Unknown player";
}

function contextLine(entry: RecordEntry): string {
    const scope = `${entry.regionCode} S${entry.season.number ?? "?"}`;
    if (entry.grain === "season") {
        const base = `${scope} · ${entry.matchesPlayed} M · ${entry.setsPlayed} S`;
        return entry.season.active ? `${base} (in progress)` : base;
    }
    const parts = [
        entry.opponent ? `vs ${entry.opponent.name}` : null,
        entry.match?.code ?? null,
        entry.grain === "set" ? `Set ${entry.setNumber}` : `${entry.setsPlayed} sets`,
        scope,
    ];
    return parts.filter(Boolean).join(" · ");
}

function SegmentedControl<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: {key: T; label: string}[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div role="group" aria-label={label} className="flex items-center h-9 rounded-sm border border-border bg-muted/50 p-0.5">
            {options.map(option => {
                const selected = option.key === value;
                return (
                    <button
                        key={option.key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(option.key)}
                        className={cn(
                            "px-3 h-full text-xs font-semibold rounded-sm transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

function SeasonSelect({
    options,
    value,
    showRegionCount,
    onChange,
}: {
    options: RecordSeasonOption[];
    value: number | null;
    showRegionCount: boolean;
    onChange: (season: number | null) => void;
}) {
    const [open, setOpen] = useState(false);
    if (options.length === 0) return null;

    const select = (next: number | null) => {
        setOpen(false);
        if (next !== value) onChange(next);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                className={cn(
                    "inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-border text-xs font-semibold transition-colors",
                    "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    value !== null
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground",
                )}
            >
                {value !== null ? `Season ${value}` : "All seasons"}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 rounded-sm p-1">
                <SeasonOption checked={value === null} onSelect={() => select(null)}>
                    All seasons
                </SeasonOption>
                <div className="my-1 h-px bg-border" />
                {options.map(option => (
                    <SeasonOption key={option.number} checked={value === option.number} onSelect={() => select(option.number)}>
                        <span className="flex-1 text-left">Season {option.number}</span>
                        {showRegionCount && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {option.regionCodes.length}
                                {option.regionCodes.length === 1 ? " region" : " regions"}
                            </span>
                        )}
                    </SeasonOption>
                ))}
            </PopoverContent>
        </Popover>
    );
}

function SeasonOption({
    checked,
    onSelect,
    children,
}: {
    checked: boolean;
    onSelect: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={checked}
            onClick={onSelect}
            className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
        >
            <Check className={cn("h-4 w-4 shrink-0", !checked && "invisible")} aria-hidden />
            {children}
        </button>
    );
}
