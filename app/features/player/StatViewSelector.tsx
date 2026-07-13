"use client";

import {cn} from "@/lib/utils";
import {StatView, STAT_VIEWS} from "./playerStatColumnMeta";

type Props = {
    value: StatView;
    onChange: (v: StatView) => void;
};

export default function StatViewSelector({value, onChange}: Props) {
    return (
        <div
            role="group"
            aria-label="Stat view"
            className="inline-flex h-9 max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted p-[3px]"
        >
            {STAT_VIEWS.map(({value: v, label}) => {
                const active = v === value;
                return (
                    <button
                        key={v}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(v)}
                        className={cn(
                            "h-full shrink-0 rounded-md px-3 text-sm font-medium transition-colors",
                            active
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
