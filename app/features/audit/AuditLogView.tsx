"use client";

import {useEffect, useRef, useState} from "react";
import {ChevronDown} from "lucide-react";
import {cn} from "@/lib/utils";
import {useAuditLog} from "@/app/hooks/useAuditLog";
import {useDebouncedValue} from "@/app/hooks/useDebouncedValue";
import {OptionButton, OptionRow} from "@/app/components/filters/OptionRow";
import {Input} from "@/app/components/ui/input";
import {Button} from "@/app/components/ui/button";
import {Skeleton} from "@/app/components/ui/skeleton";
import {groupList} from "@/app/features/staff/groupLabels";
import type {AuditEntry, AuditKind, AuditOutcome, AuditPerson} from "@/server/domains/audit/types";
import {auditActionLabel, formatAuditTarget} from "./formatAudit";

const KIND_OPTIONS = [
    {value: "action", label: "Actions"},
    {value: "auth", label: "Sign-ins"},
] as const;

const OUTCOME_OPTIONS = [
    {value: "allowed", label: "Allowed"},
    {value: "denied", label: "Denied"},
] as const;

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
];

const GRID = "lg:grid lg:grid-cols-[7.5rem_minmax(0,13rem)_minmax(0,10rem)_minmax(0,13rem)_minmax(0,1fr)_4.5rem] lg:gap-x-4";

function relativeTime(iso: string, now: number): string {
    const seconds = Math.round((Date.parse(iso) - now) / 1000);
    const rtf = new Intl.RelativeTimeFormat("en", {numeric: "auto"});
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
    }
    return "just now";
}

function absoluteTime(iso: string): string {
    return new Date(iso).toLocaleString("en-GB", {dateStyle: "medium", timeStyle: "medium"});
}

function personLabel(person: {displayName: string | null; username: string | null}): string {
    return person.displayName ?? person.username ?? "Unknown account";
}

function Avatar({url, name}: {url: string | null; name: string}) {
    if (url) return <img src={url} alt="" width={24} height={24} className="size-6 shrink-0 object-cover" />;
    return (
        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center bg-muted text-xs font-semibold text-muted-foreground">
            {name.charAt(0).toUpperCase()}
        </span>
    );
}

function PersonFilter({people, value, onChange}: {people: AuditPerson[]; value: string | null; onChange: (userId: string | null) => void}) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const selected = people.find(p => p.userId === value) ?? null;

    function pick(userId: string | null) {
        onChange(userId);
        setOpen(false);
        triggerRef.current?.focus();
    }

    return (
        <div className="contents">
            <div className="flex items-center gap-1.5">
                <span id="audit-person-label" className="mr-1 text-xs font-semibold text-muted-foreground">Person</span>
                <button
                    ref={triggerRef}
                    type="button"
                    aria-expanded={open}
                    aria-controls="audit-person-tray"
                    aria-labelledby="audit-person-label audit-person-value"
                    onClick={() => setOpen(o => !o)}
                    onKeyDown={e => {
                        if (e.key === "Escape" && open) setOpen(false);
                    }}
                    className={cn(
                        "inline-flex h-8 items-center gap-1 px-2 text-sm transition-colors duration-150 motion-reduce:transition-none max-md:h-11",
                        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        selected ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground",
                    )}
                >
                    <span id="audit-person-value" className="max-w-[12rem] truncate">{selected ? personLabel(selected) : "Everyone"}</span>
                    <ChevronDown aria-hidden className={cn("size-3 transition-transform duration-150 motion-reduce:transition-none", open && "rotate-180")} />
                </button>
            </div>
            {open && (
                <div
                    id="audit-person-tray"
                    role="group"
                    aria-label="Choose a person"
                    onKeyDown={e => {
                        if (e.key === "Escape") {
                            setOpen(false);
                            triggerRef.current?.focus();
                        }
                    }}
                    className="order-last flex w-full flex-wrap items-center gap-0.5 pt-1"
                >
                    <OptionButton density="compact" selected={value === null} aria-pressed={value === null} className="max-md:h-11" onClick={() => pick(null)}>
                        Everyone
                    </OptionButton>
                    <span aria-hidden className="mx-1 h-4 w-px bg-border" />
                    {people.map(person => (
                        <OptionButton
                            key={person.userId}
                            density="compact"
                            selected={value === person.userId}
                            aria-pressed={value === person.userId}
                            className="max-md:h-11"
                            onClick={() => pick(person.userId)}
                        >
                            {personLabel(person)}
                        </OptionButton>
                    ))}
                    {people.length === 0 && <span className="px-2 text-sm text-muted-foreground">No one has signed in yet.</span>}
                </div>
            )}
        </div>
    );
}

function AuditRow({entry, now, onPerson}: {entry: AuditEntry; now: number; onPerson: (userId: string) => void}) {
    const name = personLabel(entry);
    const target = formatAuditTarget(entry.target, entry.kind);
    const denied = entry.outcome === "denied";

    return (
        <li className={cn(GRID, "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-2 py-3 transition-colors duration-150 hover:bg-muted/30 motion-reduce:transition-none lg:items-center")}>
            <time
                dateTime={entry.createdAt}
                title={absoluteTime(entry.createdAt)}
                className="col-start-1 row-start-1 truncate text-sm text-muted-foreground max-lg:hidden"
            >
                {relativeTime(entry.createdAt, now)}
            </time>

            <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 lg:col-start-2">
                <Avatar url={entry.avatarUrl} name={name} />
                <div className="flex min-w-0 items-baseline gap-1.5">
                    {entry.userId ? (
                        <button
                            type="button"
                            onClick={() => onPerson(entry.userId as string)}
                            title={`Show only ${name}`}
                            className="truncate text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            {name}
                        </button>
                    ) : (
                        <span className="truncate text-sm font-semibold text-foreground">{name}</span>
                    )}
                    {entry.username && <span className="truncate text-xs text-muted-foreground">@{entry.username}</span>}
                    <time dateTime={entry.createdAt} title={absoluteTime(entry.createdAt)} className="shrink-0 text-xs text-muted-foreground lg:hidden">
                        {relativeTime(entry.createdAt, now)}
                    </time>
                </div>
            </div>

            <p className="col-span-2 row-start-4 truncate text-xs text-muted-foreground lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:text-sm" title={groupList(entry.groups)}>
                {entry.groups.length > 0 ? groupList(entry.groups) : "No groups"}
            </p>

            <p className="col-start-1 row-start-2 truncate text-sm text-foreground lg:col-start-4 lg:row-start-1">
                {auditActionLabel(entry)}
            </p>

            <p
                className="col-span-2 row-start-3 truncate font-mono text-xs tabular-nums text-muted-foreground empty:hidden lg:col-span-1 lg:col-start-5 lg:row-start-1"
                title={target || undefined}
            >
                {target}
            </p>

            <p
                className={cn(
                    "col-start-2 row-start-1 text-right text-sm lg:col-start-6",
                    denied ? "font-semibold text-foreground dark:text-destructive" : "text-muted-foreground",
                )}
            >
                {denied ? "Denied" : "Allowed"}
            </p>
        </li>
    );
}

function AuditSkeleton() {
    return (
        <ul aria-hidden className="mt-2">
            {Array.from({length: 8}, (_, i) => (
                <li key={i} className={cn(GRID, "flex items-center gap-3 px-2 py-3")}>
                    <Skeleton className="h-4 w-20 motion-reduce:animate-none max-lg:hidden" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="size-6 motion-reduce:animate-none" />
                        <Skeleton className="h-4 w-28 motion-reduce:animate-none" />
                    </div>
                    <Skeleton className="h-4 w-20 motion-reduce:animate-none max-lg:hidden" />
                    <Skeleton className="h-4 w-32 motion-reduce:animate-none max-lg:hidden" />
                    <Skeleton className="h-4 w-40 motion-reduce:animate-none max-lg:hidden" />
                    <Skeleton className="ml-auto h-4 w-14 motion-reduce:animate-none" />
                </li>
            ))}
        </ul>
    );
}

export function AuditLogView() {
    const [userId, setUserId] = useState<string | null>(null);
    const [kind, setKind] = useState<AuditKind | null>(null);
    const [outcome, setOutcome] = useState<AuditOutcome | null>(null);
    const [actionInput, setActionInput] = useState("");
    const action = useDebouncedValue(actionInput, 300);
    const [now, setNow] = useState(() => Date.now());

    const {entries, people, hasMore, isLoading, isLoadingMore, error, loadMore, mutate} = useAuditLog({userId, action, kind, outcome});

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 60000);
        return () => window.clearInterval(id);
    }, []);

    const filtered = userId !== null || kind !== null || outcome !== null || action.trim() !== "";

    function clearFilters() {
        setUserId(null);
        setKind(null);
        setOutcome(null);
        setActionInput("");
    }

    return (
        <div className="page-wide py-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audit log</h1>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Staff writes and Discord sign-ins, newest first. Reads aren&apos;t logged.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                <OptionRow
                    layout="inline"
                    label="Type"
                    allOption={{label: "All"}}
                    options={KIND_OPTIONS}
                    value={kind}
                    onChange={setKind}
                />
                <OptionRow
                    layout="inline"
                    label="Result"
                    allOption={{label: "All"}}
                    options={OUTCOME_OPTIONS}
                    value={outcome}
                    onChange={setOutcome}
                />
                <PersonFilter people={people} value={userId} onChange={setUserId} />
                <div className="flex items-center gap-1.5">
                    <label htmlFor="audit-action" className="mr-1 text-xs font-semibold text-muted-foreground">Action</label>
                    <Input
                        id="audit-action"
                        value={actionInput}
                        onChange={e => setActionInput(e.target.value.replace(/[^A-Za-z ]/g, "").slice(0, 60))}
                        placeholder="Complete match"
                        autoComplete="off"
                        className="h-9 w-52 rounded-sm max-md:h-11"
                    />
                </div>
            </div>

            <div className="mt-6">
                <div aria-hidden className={cn(GRID, "hidden border-b border-border px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:grid")}>
                    <span>Time</span>
                    <span>Person</span>
                    <span>Groups</span>
                    <span>Action</span>
                    <span>Target</span>
                    <span className="text-right">Result</span>
                </div>

                {entries.length > 0 ? (
                    <>
                        <ul className="mt-2">
                            {entries.map(entry => (
                                <AuditRow key={entry.id} entry={entry} now={now} onPerson={setUserId} />
                            ))}
                        </ul>
                        {hasMore && (
                            <div className="mt-4 flex justify-center">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isLoadingMore}
                                    onClick={() => void loadMore()}
                                    className="rounded-sm underline underline-offset-4 max-md:h-11 disabled:cursor-not-allowed"
                                >
                                    {isLoadingMore ? "Loading more" : "Load more"}
                                </Button>
                            </div>
                        )}
                    </>
                ) : error ? (
                    <div className="py-16 text-center">
                        <p className="text-sm text-foreground">Couldn&apos;t load the audit log.</p>
                        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                        <Button type="button" variant="outline" size="sm" className="mt-4 rounded-sm max-md:h-11" onClick={() => void mutate()}>
                            Try again
                        </Button>
                    </div>
                ) : isLoading ? (
                    <AuditSkeleton />
                ) : filtered ? (
                    <div className="py-16 text-center">
                        <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>
                        <Button type="button" variant="outline" size="sm" className="mt-4 rounded-sm max-md:h-11" onClick={clearFilters}>
                            Clear filters
                        </Button>
                    </div>
                ) : (
                    <p className="py-16 text-center text-sm text-muted-foreground">
                        No activity yet. Staff writes and sign-ins appear here as they happen.
                    </p>
                )}
            </div>
        </div>
    );
}
