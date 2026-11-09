"use client";

import {ChevronLeft, ChevronRight} from "lucide-react";
import {cn} from "@/lib/utils";
import {InlineSwitch} from "@/app/components/filters/InlineSwitch";
import type {ScheduleKind} from "./types";

type Props = {
    kind: ScheduleKind;
    playoffsEnabled: boolean;
    weeks: number[];
    week: number;
    onKindChange: (kind: ScheduleKind) => void;
    onWeekChange: (week: number) => void;
    stickyTop?: string;
};

function WeekPicker({weeks, week, onWeekChange}: Pick<Props, "weeks" | "week" | "onWeekChange">) {
    const index = weeks.indexOf(week);
    const prev = index > 0 ? weeks[index - 1] : null;
    const next = index >= 0 && index < weeks.length - 1 ? weeks[index + 1] : null;
    return (
        <>
            <div role="group" aria-label="Week" className="hidden items-center gap-1 sm:flex">
                <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Week</span>
                {weeks.map(w => {
                    const selected = w === week;
                    return (
                        <button
                            key={w}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onWeekChange(w)}
                            className={cn(
                                "min-w-7 px-1 py-1 text-center font-mono text-sm tabular-nums transition-colors duration-150 motion-reduce:transition-none",
                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                                selected
                                    ? "font-semibold text-foreground underline decoration-2 underline-offset-[6px]"
                                    : w < week
                                        ? "text-muted-foreground/70 hover:text-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {w}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center sm:hidden">
                <button
                    type="button"
                    aria-label="Previous week"
                    disabled={prev == null}
                    onClick={() => prev != null && onWeekChange(prev)}
                    className="flex h-11 w-11 items-center justify-center text-foreground disabled:text-muted-foreground/30"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[72px] text-center text-sm font-semibold">Week {week}</span>
                <button
                    type="button"
                    aria-label="Next week"
                    disabled={next == null}
                    onClick={() => next != null && onWeekChange(next)}
                    className="flex h-11 w-11 items-center justify-center text-foreground disabled:text-muted-foreground/30"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </>
    );
}

export function ScheduleControls({kind, playoffsEnabled, weeks, week, onKindChange, onWeekChange, stickyTop = "top-[61px]"}: Props) {
    return (
        <div className={cn("sticky z-30 -mx-2 flex min-h-[57px] flex-wrap items-center justify-between gap-x-6 border-b border-border bg-background px-2 py-1.5", stickyTop)}>
            <InlineSwitch
                label="Match type"
                className="-ml-2"
                options={[
                    {value: "season", label: "Regular season"},
                    {value: "playoffs", label: "Playoffs", disabled: !playoffsEnabled},
                ]}
                value={kind}
                onChange={onKindChange}
            />
            {kind === "season" && weeks.length > 0 && <WeekPicker weeks={weeks} week={week} onWeekChange={onWeekChange} />}
        </div>
    );
}
