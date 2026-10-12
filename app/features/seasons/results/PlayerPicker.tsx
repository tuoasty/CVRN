"use client";

import {useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject} from "react";
import {Input} from "@/app/components/ui/input";
import {searchPlayersInDatabaseAction} from "@/app/actions/player.actions";
import {useDebouncedValue} from "@/app/hooks/useDebouncedValue";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {clientLogger} from "@/app/utils/clientLogger";
import {cn} from "@/lib/utils";

const MAX_RESULTS = 8;

export function rankPlayers(players: readonly PlayerWithTeamInfo[], query: string): PlayerWithTeamInfo[] {
    const q = query.trim().toLowerCase();
    const exact = players.filter(p => p.username?.toLowerCase() === q);
    const rest = players.filter(p => p.username?.toLowerCase() !== q);
    return [...exact, ...rest].slice(0, MAX_RESULTS);
}

interface Props {
    seasonId: string;
    query: string;
    onQueryChange: (query: string) => void;
    onCommit: (player: PlayerWithTeamInfo) => void;
    inputRef?: RefObject<HTMLInputElement | null>;
    label?: string;
    placeholder?: string;
    hint?: string;
    disabled?: boolean;
    compact?: boolean;
}

export function PlayerPicker({seasonId, query, onQueryChange, onCommit, inputRef, label = "Player", placeholder = "Search username", hint, disabled, compact}: Props) {
    const id = useId();
    const listId = `${id}-list`;
    const [results, setResults] = useState<PlayerWithTeamInfo[]>([]);
    const [resultsFor, setResultsFor] = useState("");
    const [focused, setFocused] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [active, setActive] = useState(0);
    const requestRef = useRef(0);

    const trimmed = query.trim();
    const debounced = useDebouncedValue(trimmed, 300);

    useEffect(() => {
        const request = ++requestRef.current;
        if (!debounced) {
            setResults([]);
            setResultsFor("");
            return;
        }
        searchPlayersInDatabaseAction({query: debounced, seasonId})
            .then(res => {
                if (request !== requestRef.current) return;
                setResults(res.ok ? rankPlayers(res.value, debounced) : []);
                setResultsFor(debounced);
                setActive(0);
            })
            .catch(err => {
                if (request !== requestRef.current) return;
                clientLogger.error("PlayerPicker", "Player search failed", {err});
                setResults([]);
                setResultsFor(debounced);
            });
    }, [debounced, seasonId]);

    const ready = trimmed !== "" && resultsFor === trimmed;
    const open = focused && !dismissed && trimmed !== "";
    const highlighted = ready && results.length > 0 ? Math.min(active, results.length - 1) : -1;

    const commit = (index: number) => {
        const player = results[index];
        if (!player) return;
        setDismissed(true);
        onCommit(player);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setDismissed(false);
            if (results.length > 0) setActive(Math.min(highlighted + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(highlighted - 1, 0));
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (highlighted >= 0) commit(highlighted);
        } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            setDismissed(true);
        }
    };

    return (
        <div className="relative flex min-w-0 flex-col gap-1">
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
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
                    autoComplete="off"
                    spellCheck={false}
                    disabled={disabled}
                    value={query}
                    placeholder={placeholder}
                    className={cn("rounded-md", hint && "pr-20", compact && "h-8")}
                    onChange={e => { setDismissed(false); onQueryChange(e.target.value); }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => { setFocused(false); setDismissed(false); }}
                    onKeyDown={onKeyDown}
                />
                {hint && highlighted >= 0 && open && (
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <kbd className="border border-border px-1 font-mono text-xs">↵</kbd> {hint}
                    </span>
                )}
            </div>
            {open && (
                <div
                    className="absolute inset-x-0 top-full z-30 mt-1 border border-border bg-popover shadow-lg"
                    onMouseDown={e => e.preventDefault()}
                >
                    {!ready ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground" aria-live="polite">Searching</p>
                    ) : results.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground" aria-live="polite">No players match “{trimmed}”</p>
                    ) : null}
                    <ul id={listId} role="listbox" aria-label="Players">
                        {ready && results.map((p, i) => (
                            <li
                                key={p.id}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === highlighted}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => commit(i)}
                                className={cn(
                                    "flex h-8 cursor-pointer items-center justify-between gap-3 px-3 text-sm",
                                    i === highlighted && "bg-muted",
                                )}
                            >
                                <span className="flex min-w-0 items-baseline gap-2">
                                    <span className="truncate font-medium">@{p.username ?? p.id}</span>
                                    {p.display_name && p.display_name !== p.username && (
                                        <span className="truncate text-xs text-muted-foreground">{p.display_name}</span>
                                    )}
                                </span>
                                <span className="shrink-0 truncate text-xs text-muted-foreground">
                                    {p.season_team_name ?? "No team this season"}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
