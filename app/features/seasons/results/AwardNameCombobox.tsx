"use client";

import {useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject} from "react";
import {Input} from "@/app/components/ui/input";
import {cn} from "@/lib/utils";
import {resolveListedName} from "./stagedAwards";

const MAX_SUGGESTIONS = 8;

interface Props {
    value: string;
    onChange: (value: string) => void;
    onEnter: (value: string) => void;
    suggestions: readonly string[];
    categoryLabel: string;
    inputRef: RefObject<HTMLInputElement | null>;
    disabled?: boolean;
    invalid?: boolean;
    strict?: boolean;
    onAddToList?: (name: string) => void;
}

export function filterSuggestions(suggestions: readonly string[], value: string, limit: number = MAX_SUGGESTIONS): string[] {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, limit);
    const exact: string[] = [];
    const prefix: string[] = [];
    const inner: string[] = [];
    for (const s of suggestions) {
        const lower = s.toLowerCase();
        if (lower === q) exact.push(s);
        else if (lower.startsWith(q)) prefix.push(s);
        else if (lower.includes(q)) inner.push(s);
    }
    return [...exact, ...prefix, ...inner].slice(0, limit);
}

function Highlighted({text, query}: {text: string; query: string}) {
    const q = query.trim().toLowerCase();
    const at = q ? text.toLowerCase().indexOf(q) : -1;
    if (at < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, at)}
            <span className="font-semibold">{text.slice(at, at + q.length)}</span>
            {text.slice(at + q.length)}
        </>
    );
}

export function AwardNameCombobox({value, onChange, onEnter, suggestions, categoryLabel, inputRef, disabled, invalid, strict, onAddToList}: Props) {
    const id = useId();
    const listId = `${id}-list`;
    const listRef = useRef<HTMLUListElement | null>(null);
    const [focused, setFocused] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [active, setActive] = useState<number | null>(null);

    const matches = useMemo(
        () => filterSuggestions(suggestions, value, strict ? suggestions.length : MAX_SUGGESTIONS),
        [suggestions, value, strict],
    );
    const typed = value.trim();
    const canAdd = Boolean(strict && onAddToList && typed && resolveListedName(typed, suggestions) === null);
    const rowCount = matches.length + (canAdd ? 1 : 0);
    const defaultActive = typed && matches.length > 0 ? 0 : -1;
    const highlighted = Math.min(active ?? defaultActive, rowCount - 1);
    const open = focused && !dismissed && rowCount > 0;
    const accepting = open && highlighted >= 0 && highlighted < matches.length;
    const addHighlighted = open && canAdd && highlighted === matches.length;
    const listLabel = strict ? "Award list" : `Used before in ${categoryLabel}`;

    useEffect(() => {
        if (open && highlighted >= 0) listRef.current?.children[highlighted]?.scrollIntoView({block: "nearest"});
    }, [open, highlighted]);

    const change = (next: string) => {
        setActive(null);
        setDismissed(false);
        onChange(next);
    };

    const accept = (index: number) => {
        const next = matches[index];
        setActive(null);
        setDismissed(true);
        onChange(next);
        return next;
    };

    const addToList = () => {
        setActive(null);
        setDismissed(true);
        onAddToList?.(typed);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setDismissed(false);
            setActive(Math.min(highlighted + 1, rowCount - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(highlighted - 1, -1));
        } else if (e.key === "Tab" && !e.shiftKey) {
            if (accepting) accept(highlighted);
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (addHighlighted) {
                addToList();
                return;
            }
            const next = accepting ? accept(highlighted) : value;
            if (strict && resolveListedName(next, suggestions) === null) {
                setDismissed(false);
                return;
            }
            onEnter(next);
        } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            setDismissed(true);
        }
    };

    return (
        <div className="relative flex min-w-0 flex-col gap-1">
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Award name
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
                    autoComplete="off"
                    spellCheck={false}
                    disabled={disabled}
                    value={value}
                    placeholder="e.g. Finals MVP"
                    className="rounded-md pr-24"
                    onChange={e => change(e.target.value)}
                    onFocus={() => { setFocused(true); setDismissed(value.trim() !== ""); }}
                    onBlur={() => { setFocused(false); setDismissed(false); setActive(null); }}
                    onKeyDown={onKeyDown}
                />
                {accepting && (
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <kbd className="border border-border px-1 font-mono text-xs">Tab</kbd> accept
                    </span>
                )}
            </div>
            {open && (
                <div
                    className="absolute inset-x-0 top-full z-30 mt-1 border border-border bg-popover shadow-lg"
                    onMouseDown={e => e.preventDefault()}
                >
                    <p className="px-3 pt-1.5 pb-0.5 text-xs text-muted-foreground">{listLabel}</p>
                    <ul ref={listRef} id={listId} role="listbox" aria-label={listLabel} className="max-h-[min(32rem,60vh)] overflow-y-auto">
                        {matches.map((name, i) => (
                            <li
                                key={name}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === highlighted}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => { accept(i); inputRef.current?.focus(); }}
                                className={cn(
                                    "flex h-8 cursor-pointer items-center truncate px-3 text-sm",
                                    i === highlighted && "bg-muted",
                                )}
                            >
                                <span className="truncate"><Highlighted text={name} query={value} /></span>
                            </li>
                        ))}
                        {canAdd && (
                            <li
                                id={`${listId}-${matches.length}`}
                                role="option"
                                aria-selected={addHighlighted}
                                onMouseEnter={() => setActive(matches.length)}
                                onClick={addToList}
                                className={cn(
                                    "flex h-8 cursor-pointer items-center border-t border-border px-3 text-sm text-primary",
                                    addHighlighted && "bg-muted",
                                )}
                            >
                                <span className="truncate">Add &quot;{typed}&quot; to the award list</span>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
