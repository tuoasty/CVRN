"use client";

import {Fragment} from "react";
import {cn} from "@/lib/utils";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/app/components/ui/tooltip";

type Option<T extends string> = {value: T; label: string; disabled?: boolean; tooltip?: string};

type Props<T extends string> = {
    label: string;
    options: readonly Option<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
};

export function InlineSwitch<T extends string>({label, options, value, onChange, className}: Props<T>) {
    const hasTooltips = options.some((o) => o.tooltip);

    const group = (
        <div role="group" aria-label={label} className={cn("flex items-center gap-0.5", className)}>
            {options.map((option, index) => {
                const selected = option.value === value;
                const button = (
                    <button
                        type="button"
                        aria-pressed={selected}
                        disabled={option.disabled}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "px-2 py-1 text-sm transition-colors duration-150 motion-reduce:transition-none",
                            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            selected
                                ? "font-semibold text-foreground underline decoration-2 underline-offset-[6px]"
                                : "font-medium text-muted-foreground hover:text-foreground",
                            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground",
                        )}
                    >
                        {option.label}
                    </button>
                );
                return (
                    <Fragment key={option.value}>
                        {index > 0 && (
                            <span aria-hidden className="text-sm text-border">
                                /
                            </span>
                        )}
                        {option.tooltip ? (
                            <Tooltip>
                                <TooltipTrigger asChild>{button}</TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[240px]">
                                    {option.tooltip}
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            button
                        )}
                    </Fragment>
                );
            })}
        </div>
    );

    return hasTooltips ? <TooltipProvider delayDuration={200}>{group}</TooltipProvider> : group;
}
