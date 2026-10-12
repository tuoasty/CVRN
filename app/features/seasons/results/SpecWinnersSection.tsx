"use client";

import {Loader2, X} from "lucide-react";
import {SpecWinnerWithRefs} from "@/server/domains/spec";
import {cn} from "@/lib/utils";
import {EmptyRows, NewLabel, SectionHeader, SubLabel, TextAction} from "./ResultsUi";
import {ROW_INTERACTIVE} from "./AwardRows";
import {groupBySpecPosition} from "./specGroups";
import {StagedSpec} from "./types";

const CELLS = "grid h-8 grid-cols-[44px_minmax(0,1fr)] items-center gap-2 px-1 text-left text-sm";

function byStars(a: SpecWinnerWithRefs, b: SpecWinnerWithRefs) {
    return b.stars_awarded - a.stars_awarded;
}

export function mergeSpecWinner(winners: SpecWinnerWithRefs[], winner: SpecWinnerWithRefs): SpecWinnerWithRefs[] {
    return [winner, ...winners.filter(w => w.spec_id !== winner.spec_id)].sort(byStars);
}

function StarCount({awarded, max}: {awarded: number; max: number}) {
    return (
        <span className="font-mono text-xs tabular-nums" aria-label={`${awarded} of ${max} stars`}>
            {awarded} / {max}
        </span>
    );
}

type Row = {kind: "saved"; winner: SpecWinnerWithRefs} | {kind: "staged"; staged: StagedSpec};

interface Props {
    winners: SpecWinnerWithRefs[];
    staged: StagedSpec[];
    editingId: string | null;
    busyId: string | null;
    armed: boolean;
    onAdd: () => void;
    onSelect: (winner: SpecWinnerWithRefs) => void;
    onRemove: (winner: SpecWinnerWithRefs) => void;
}

export function SpecWinnersSection({winners, staged, editingId, busyId, armed, onAdd, onSelect, onRemove}: Props) {
    const replaced = new Set(staged.map(s => s.spec.id));
    const rows: Row[] = [
        ...winners.map(winner => ({kind: "saved" as const, winner})),
        ...staged.map(s => ({kind: "staged" as const, staged: s})),
    ];
    const groups = groupBySpecPosition(rows, r => (r.kind === "saved" ? r.winner.spec : r.staged.spec));

    return (
        <section>
            <SectionHeader title="Spec winners" meta={winners.length > 0 ? `${winners.length}` : undefined}>
                <TextAction armed={armed} aria-pressed={armed} onClick={onAdd}>+ Award spec</TextAction>
            </SectionHeader>
            {rows.length === 0 && <EmptyRows>No spec winners yet</EmptyRows>}
            {groups.map((group, gi) => (
                <div key={group.key}>
                    <SubLabel split={gi > 0}>{group.label}</SubLabel>
                    <div className="[&>*:last-child]:border-b-0">
                        {group.items.map(row => {
                            if (row.kind === "staged") {
                                const s = row.staged;
                                return (
                                    <div key={s.tempId} className={cn(CELLS, "border-b border-border")}>
                                        <StarCount awarded={s.stars} max={s.spec.stars} />
                                        <span className="flex min-w-0 items-baseline gap-1.5">
                                            <span className="truncate">
                                                {s.spec.name} <span className="text-muted-foreground">@{s.player.username ?? s.player.id}</span>
                                            </span>
                                            <NewLabel />
                                        </span>
                                    </div>
                                );
                            }
                            const w = row.winner;
                            const busy = busyId === w.id;
                            const selected = w.id === editingId;
                            return (
                                <div key={w.id} className={cn("group flex h-8 items-center border-b border-border pr-1", selected && "bg-muted")}>
                                    <button
                                        type="button"
                                        aria-label={`Edit ${w.spec.name}, @${w.player.username}, ${w.stars_awarded} of ${w.spec.stars} stars`}
                                        aria-current={selected || undefined}
                                        onClick={() => onSelect(w)}
                                        className={cn(CELLS, "min-w-0 flex-1", ROW_INTERACTIVE, selected && "font-semibold hover:bg-muted")}
                                    >
                                        <StarCount awarded={w.stars_awarded} max={w.spec.stars} />
                                        <span className="truncate">
                                            <span className={replaced.has(w.spec_id) ? "text-muted-foreground line-through" : undefined}>{w.spec.name}</span>
                                            {" "}<span className="font-normal text-muted-foreground">@{w.player.username}</span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Remove ${w.spec.name} winner @${w.player.username}`}
                                        disabled={busy}
                                        onClick={() => onRemove(w)}
                                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-destructive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 motion-reduce:transition-none"
                                    >
                                        {busy ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> : <X className="size-3.5" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </section>
    );
}
