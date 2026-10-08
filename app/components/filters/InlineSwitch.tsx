"use client";

import {Fragment} from "react";
import {cn} from "@/lib/utils";

type Props<T extends string> = {
    label: string;
    options: readonly {value: T; label: string}[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
};

export function InlineSwitch<T extends string>({label, options, value, onChange, className}: Props<T>) {
    return (
        <div role="group" aria-label={label} className={cn("flex items-center gap-0.5", className)}>
            {options.map((option, index) => {
                const selected = option.value === value;
                return (
                    <Fragment key={option.value}>
                        {index > 0 && (
                            <span aria-hidden className="text-sm text-border">
                                /
                            </span>
                        )}
                        <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onChange(option.value)}
                            className={cn(
                                "px-2 py-1 text-sm transition-colors duration-150 motion-reduce:transition-none",
                                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                selected
                                    ? "font-semibold text-foreground underline decoration-2 underline-offset-[6px]"
                                    : "font-medium text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {option.label}
                        </button>
                    </Fragment>
                );
            })}
        </div>
    );
}
