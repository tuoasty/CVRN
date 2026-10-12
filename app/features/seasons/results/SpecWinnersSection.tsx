"use client";

import {useState, type Dispatch, type SetStateAction} from "react";
import {Loader2, X} from "lucide-react";
import {awardSpecWinnerAction, deleteSpecWinnerAction} from "@/app/actions/spec.actions";
import {SpecWinnerWithRefs} from "@/server/domains/spec";
import {toast} from "@/app/utils/toast";
import {EmptyRows, NewLabel, SectionHeader, StarPicker, TextAction} from "./ResultsUi";
import {StagedSpec} from "./types";

const ROW = "grid h-8 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-1 text-sm";

function byStars(a: SpecWinnerWithRefs, b: SpecWinnerWithRefs) {
    return b.stars_awarded - a.stars_awarded;
}

export function mergeSpecWinner(winners: SpecWinnerWithRefs[], winner: SpecWinnerWithRefs): SpecWinnerWithRefs[] {
    return [winner, ...winners.filter(w => w.spec_id !== winner.spec_id)].sort(byStars);
}

interface Props {
    seasonId: string;
    winners: SpecWinnerWithRefs[];
    setWinners: Dispatch<SetStateAction<SpecWinnerWithRefs[]>>;
    staged: StagedSpec[];
    armed: boolean;
    onAdd: () => void;
}

export function SpecWinnersSection({seasonId, winners, setWinners, staged, armed, onAdd}: Props) {
    const [starsFor, setStarsFor] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

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

    const replacedBy = new Set(staged.map(s => s.spec.id));

    return (
        <section>
            <SectionHeader title="Spec winners" meta={winners.length > 0 ? `${winners.length}` : undefined}>
                <TextAction armed={armed} aria-pressed={armed} onClick={onAdd}>+ Award spec</TextAction>
            </SectionHeader>
            {winners.length === 0 && staged.length === 0 && <EmptyRows>No spec winners yet</EmptyRows>}
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
                            <span className={replacedBy.has(w.spec_id) ? "text-muted-foreground line-through" : undefined}>{w.spec.name}</span>
                            {" "}<span className="text-muted-foreground">@{w.player.username}</span>
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
                {staged.map(s => (
                    <div key={s.tempId} className={ROW}>
                        <span className="font-mono text-xs tabular-nums">★{s.stars}</span>
                        <span className="flex min-w-0 items-baseline gap-1.5">
                            <span className="truncate">
                                {s.spec.name} <span className="text-muted-foreground">@{s.player.username ?? s.player.id}</span>
                            </span>
                            <NewLabel />
                        </span>
                        <span />
                    </div>
                ))}
            </div>
        </section>
    );
}
