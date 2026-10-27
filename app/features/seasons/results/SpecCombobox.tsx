"use client";

import {useId, useMemo, useState, type KeyboardEvent, type RefObject} from "react";
import {Input} from "@/app/components/ui/input";
import type {LeagueSpec} from "@/server/domains/spec/types";
import {cn} from "@/lib/utils";

const MAX_RESULTS = 8;

export function filterSpecs(specs: readonly LeagueSpec[], query: string): LeagueSpec[] {
    const q = query.trim().toLowerCase();
    if (!q) return specs.slice(0, MAX_RESULTS);
    const prefix: LeagueSpec[] = [];
    const inner: LeagueSpec[] = [];
    for (const s of specs) {
        const name = s.name.toLowerCase();
        if (name.startsWith(q)) prefix.push(s);
        else if (name.includes(q) || s.position.toLowerCase().includes(q)) inner.push(s);
    }
    return [...prefix, ...inner].slice(0, MAX_RESULTS);
}

interface Props {
    specs: readonly LeagueSpec[];
    query: string;
    onQueryChange: (query: string) => void;
    selected: LeagueSpec | null;
    onSelect: (spec: LeagueSpec | null) => void;
    onEnter: () => void;
    winnerBySpec: ReadonlyMap<string, string>;
    inputRef: RefObject<HTMLInputElement | null>;
    invalid?: boolean;
}

export function SpecCombobox({specs, query, onQueryChange, selected, onSelect, onEnter, winnerBySpec, inputRef, invalid}: Props) {
    const id = useId();
    const listId = `${id}-list`;
    const [focused, setFocused] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [active, setActive] = useState(0);

    const results = useMemo(() => filterSpecs(specs, selected ? "" : query), [specs, query, selected]);
    const open = focused && !dismissed && !selected && results.length > 0;
    const highlighted = Math.min(active, results.length - 1);

    const pick = (spec: LeagueSpec) => {
        setActive(0);
        setDismissed(true);
        onSelect(spec);
        onQueryChange(spec.name);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setDismissed(false);
            setActive(Math.min(highlighted + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(highlighted - 1, 0));
        } else if (e.key === "Tab" && !e.shiftKey) {
            if (open && highlighted >= 0) pick(results[highlighted]);
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (open && highlighted >= 0) {
                pick(results[highlighted]);
                onEnter();
            } else if (selected) {
                onEnter();
            }
        } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            setDismissed(true);
        }
    };

    return (
        <div className="relative flex min-w-0 flex-col gap-1">
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Spec
            </label>
            <div className="relative">
                <Input
                    ref={inputRef}
                    id={id}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={open && highlighted >= 0 ? `${listId}-${highlighted}` : undefined}
                    aria-invalid={invalid || undefined}
                    aria-describedby={selected ? `${id}-picked` : undefined}
                    autoComplete="off"
                    spellCheck={false}
                    value={query}
                    placeholder="Search specs"
                    className={cn("rounded-md pr-28", selected && "font-semibold")}
                    onChange={e => {
                        setActive(0);
                        setDismissed(false);
                        if (selected) onSelect(null);
                        onQueryChange(e.target.value);
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => { setFocused(false); setDismissed(false); }}
                    onKeyDown={onKeyDown}
                />
                {selected ? (
                    <span id={`${id}-picked`} className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2 text-xs text-muted-foreground">
                        {selected.position}
                        <span className="font-mono tabular-nums">★{selected.stars}</span>
                    </span>
                ) : open && highlighted >= 0 ? (
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <kbd className="border border-border px-1 font-mono text-xs">Tab</kbd> select
                    </span>
                ) : null}
            </div>
            {open && (
                <div
                    className="absolute inset-x-0 top-full z-30 mt-1 border border-border bg-popover shadow-lg"
                    onMouseDown={e => e.preventDefault()}
                >
                    <ul id={listId} role="listbox" aria-label="Specs" className="max-h-64 overflow-y-auto">
                        {results.map((s, i) => {
                            const winner = winnerBySpec.get(s.id);
                            return (
                                <li
                                    key={s.id}
                                    id={`${listId}-${i}`}
                                    role="option"
                                    aria-selected={i === highlighted}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => { pick(s); inputRef.current?.focus(); }}
                                    className={cn("flex h-8 cursor-pointer items-center justify-between gap-3 px-3 text-sm", i === highlighted && "bg-muted")}
                                >
                                    <span className="flex min-w-0 items-baseline gap-2">
                                        <span className="truncate">{s.name}</span>
                                        {winner && <span className="shrink-0 truncate text-xs text-muted-foreground">won by @{winner}</span>}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                        {s.position}
                                        <span className="font-mono tabular-nums">★{s.stars}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
            {!selected && query.trim() !== "" && focused && results.length === 0 && (
                <p className="absolute inset-x-0 top-full z-30 mt-1 border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
                    No spec matches “{query.trim()}”
                </p>
            )}
        </div>
    );
}
