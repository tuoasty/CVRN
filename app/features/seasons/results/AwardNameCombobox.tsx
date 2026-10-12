"use client";

import {useId, useMemo, useState, type KeyboardEvent, type RefObject} from "react";
import {Input} from "@/app/components/ui/input";
import {cn} from "@/lib/utils";

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
}

export function filterSuggestions(suggestions: readonly string[], value: string): string[] {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, MAX_SUGGESTIONS);
    const prefix: string[] = [];
    const inner: string[] = [];
    for (const s of suggestions) {
        const lower = s.toLowerCase();
        if (lower.startsWith(q)) prefix.push(s);
        else if (lower.includes(q)) inner.push(s);
    }
    return [...prefix, ...inner].slice(0, MAX_SUGGESTIONS);
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

export function AwardNameCombobox({value, onChange, onEnter, suggestions, categoryLabel, inputRef, disabled, invalid}: Props) {
    const id = useId();
    const listId = `${id}-list`;
    const [focused, setFocused] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [active, setActive] = useState<number | null>(null);

    const matches = useMemo(() => filterSuggestions(suggestions, value), [suggestions, value]);
    const defaultActive = value.trim() && matches.length > 0 ? 0 : -1;
    const highlighted = Math.min(active ?? defaultActive, matches.length - 1);
    const open = focused && !dismissed && matches.length > 0;
    const accepting = open && highlighted >= 0;

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

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setDismissed(false);
            setActive(Math.min(highlighted + 1, matches.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(highlighted - 1, -1));
        } else if (e.key === "Tab" && !e.shiftKey) {
            if (accepting) accept(highlighted);
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onEnter(accepting ? accept(highlighted) : value);
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
                    aria-activedescendant={accepting ? `${listId}-${highlighted}` : undefined}
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
                    <p className="px-3 pt-1.5 pb-0.5 text-xs text-muted-foreground">Used before in {categoryLabel}</p>
                    <ul id={listId} role="listbox" aria-label={`Award names used in ${categoryLabel}`}>
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
                    </ul>
                </div>
            )}
        </div>
    );
}
