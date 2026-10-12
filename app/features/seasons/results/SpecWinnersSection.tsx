"use client";

import {useId, useMemo, useState, type Dispatch, type KeyboardEvent, type SetStateAction} from "react";
import {Loader2, X} from "lucide-react";
import {Button} from "@/app/components/ui/button";
import {Input} from "@/app/components/ui/input";
import {awardSpecWinnerAction, deleteSpecWinnerAction} from "@/app/actions/spec.actions";
import {SpecWinnerWithRefs} from "@/server/domains/spec";
import {PlayerWithTeamInfo} from "@/server/domains/player";
import {Spec} from "@/shared/types/db";
import {toast} from "@/app/utils/toast";
import {clientLogger} from "@/app/utils/clientLogger";
import {cn} from "@/lib/utils";
import {PlayerPicker} from "./PlayerPicker";
import {EmptyRows, SectionHeader, TextAction} from "./ResultsUi";

const ROW = "grid h-8 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-1 text-sm";

function byStars(a: SpecWinnerWithRefs, b: SpecWinnerWithRefs) {
    return b.stars_awarded - a.stars_awarded;
}

function StarPicker({value, max, onChange, disabled, label}: {value: number; max?: number; onChange: (n: number) => void; disabled?: boolean; label: string}) {
    return (
        <div role="group" aria-label={label} className="flex items-center">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    aria-pressed={n === value}
                    onClick={() => onChange(value === n ? 0 : n)}
                    className={cn(
                        "inline-flex size-6 items-center justify-center rounded-md text-sm leading-none transition-colors duration-150 motion-reduce:transition-none",
                        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
                        n <= value ? "text-foreground" : "text-border hover:text-muted-foreground",
                    )}
                >
                    ★
                </button>
            ))}
            {typeof max === "number" && (
                <span className="ml-1 font-mono text-xs tabular-nums text-muted-foreground">{value}/{max}</span>
            )}
        </div>
    );
}

function SpecCombobox({specs, selected, onSelect}: {specs: Spec[]; selected: Spec | null; onSelect: (spec: Spec) => void}) {
    const id = useId();
    const listId = `${id}-list`;
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const [active, setActive] = useState(0);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (q ? specs.filter(s => s.name.toLowerCase().includes(q) || s.position.toLowerCase().includes(q)) : specs).slice(0, 8);
    }, [specs, query]);
    const open = focused && results.length > 0 && (query !== "" || !selected);
    const highlighted = Math.min(active, results.length - 1);

    const pick = (spec: Spec) => {
        onSelect(spec);
        setQuery("");
        setFocused(false);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(highlighted + 1, results.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(highlighted - 1, 0)); }
        else if (e.key === "Enter" && open && highlighted >= 0) { e.preventDefault(); pick(results[highlighted]); }
        else if (e.key === "Escape" && open) { e.stopPropagation(); setFocused(false); }
    };

    return (
        <div className="relative flex min-w-0 flex-col gap-1">
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spec</label>
            <Input
                id={id}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open ? `${listId}-${highlighted}` : undefined}
                autoComplete="off"
                value={query}
                placeholder={selected ? `${selected.name} · ${selected.position}` : "Search specs"}
                className={cn("h-8 rounded-md", selected && "placeholder:text-foreground")}
                onChange={e => { setQuery(e.target.value); setActive(0); setFocused(true); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={onKeyDown}
            />
            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Specs"
                    onMouseDown={e => e.preventDefault()}
                    className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto border border-border bg-popover shadow-lg"
                >
                    {results.map((s, i) => (
                        <li
                            key={s.id}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={i === highlighted}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => pick(s)}
                            className={cn("flex h-8 cursor-pointer items-center justify-between gap-3 px-3 text-sm", i === highlighted && "bg-muted")}
                        >
                            <span className="truncate">{s.name}</span>
                            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                {s.position}
                                <span className="font-mono tabular-nums">★{s.stars}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function AwardSpecForm({seasonId, specs, onAwarded, onClose}: {seasonId: string; specs: Spec[]; onAwarded: (w: SpecWinnerWithRefs) => void; onClose: () => void}) {
    const [spec, setSpec] = useState<Spec | null>(null);
    const [player, setPlayer] = useState<PlayerWithTeamInfo | null>(null);
    const [playerQuery, setPlayerQuery] = useState("");
    const [stars, setStars] = useState(0);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!spec || !player) return;
        setSaving(true);
        try {
            const result = await awardSpecWinnerAction({seasonId, specId: spec.id, playerId: player.id, starsAwarded: stars});
            if (!result.ok) { toast.error("Failed to award spec", result.error.message); return; }
            onAwarded(result.value);
            toast.success(`${spec.name} awarded to @${player.username}`);
            setSpec(null);
            setPlayer(null);
            setPlayerQuery("");
            setStars(0);
        } catch (err) {
            clientLogger.error("SpecWinnersSection", "Award spec failed", {err});
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-2 border-b border-border py-2">
            <SpecCombobox specs={specs} selected={spec} onSelect={s => { setSpec(s); setStars(s.stars); }} />
            <PlayerPicker
                seasonId={seasonId}
                compact
                query={playerQuery}
                onQueryChange={q => { setPlayerQuery(q); if (player) setPlayer(null); }}
                onCommit={p => { setPlayer(p); setPlayerQuery(`@${p.username ?? p.id}`); }}
                placeholder="Search username"
            />
            <div className="flex flex-wrap items-center gap-2">
                <StarPicker label="Stars awarded" value={stars} max={spec?.stars} disabled={!spec} onChange={setStars} />
                <div className="ml-auto flex items-center gap-3">
                    <TextAction tone="quiet" onClick={onClose}>Cancel</TextAction>
                    <Button size="sm" className="rounded-md" disabled={!spec || !player || saving} onClick={submit}>
                        {saving && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                        Award
                    </Button>
                </div>
            </div>
        </div>
    );
}

interface Props {
    seasonId: string;
    specs: Spec[];
    winners: SpecWinnerWithRefs[];
    setWinners: Dispatch<SetStateAction<SpecWinnerWithRefs[]>>;
}

export function SpecWinnersSection({seasonId, specs, winners, setWinners}: Props) {
    const [formOpen, setFormOpen] = useState(false);
    const [starsFor, setStarsFor] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const awardable = useMemo(() => specs.filter(s => !s.is_vaulted), [specs]);

    const onAwarded = (w: SpecWinnerWithRefs) => {
        setWinners(prev => [w, ...prev.filter(x => x.spec_id !== w.spec_id)].sort(byStars));
    };

    const updateStars = async (w: SpecWinnerWithRefs, stars: number) => {
        setStarsFor(null);
        if (stars === w.stars_awarded) return;
        setBusy(w.id);
        const previous = winners;
        setWinners(prev => prev.map(x => (x.id === w.id ? {...x, stars_awarded: stars} : x)).sort(byStars));
        try {
            const result = await awardSpecWinnerAction({seasonId, specId: w.spec_id, playerId: w.player_id, starsAwarded: stars});
            if (!result.ok) {
                setWinners(previous);
                toast.error("Failed to update stars", result.error.message);
            }
        } finally {
            setBusy(null);
        }
    };

    const remove = async (w: SpecWinnerWithRefs) => {
        setBusy(w.id);
        try {
            const result = await deleteSpecWinnerAction({id: w.id});
            if (!result.ok) { toast.error("Failed to remove spec winner", result.error.message); return; }
            setWinners(prev => prev.filter(x => x.id !== w.id));
        } finally {
            setBusy(null);
        }
    };

    return (
        <section>
            <SectionHeader title="Spec winners" meta={winners.length > 0 ? `${winners.length}` : undefined}>
                <TextAction armed={formOpen} aria-expanded={formOpen} onClick={() => setFormOpen(o => !o)}>+ Award spec</TextAction>
            </SectionHeader>
            {formOpen && <AwardSpecForm seasonId={seasonId} specs={awardable} onAwarded={onAwarded} onClose={() => setFormOpen(false)} />}
            {winners.length === 0 && !formOpen && <EmptyRows>No spec winners yet</EmptyRows>}
            <div className="[&>*:last-child]:border-b-0">
                {winners.map(w => (
                    <div key={w.id} className={ROW}>
                        <button
                            type="button"
                            aria-label={`${w.spec.name}: ${w.stars_awarded} stars. Change stars`}
                            aria-expanded={starsFor === w.id}
                            onClick={() => setStarsFor(s => (s === w.id ? null : w.id))}
                            className="inline-flex h-6 items-center rounded-md font-mono text-xs tabular-nums underline-offset-4 transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                        >
                            ★{w.stars_awarded}
                        </button>
                        <span className="truncate">
                            {w.spec.name} <span className="text-muted-foreground">@{w.player.username}</span>
                        </span>
                        <span className="flex items-center gap-1">
                            {starsFor === w.id && (
                                <StarPicker
                                    label={`Stars for ${w.spec.name}`}
                                    value={w.stars_awarded}
                                    max={w.spec.stars}
                                    disabled={busy === w.id}
                                    onChange={n => updateStars(w, n)}
                                />
                            )}
                            <button
                                type="button"
                                aria-label={`Remove ${w.spec.name} winner @${w.player.username}`}
                                disabled={busy === w.id}
                                onClick={() => remove(w)}
                                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-destructive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 motion-reduce:transition-none"
                            >
                                {busy === w.id ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> : <X className="size-3.5" />}
                            </button>
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
