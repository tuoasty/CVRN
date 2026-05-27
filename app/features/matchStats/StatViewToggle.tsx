"use client";

import {cn} from "@/lib/utils";

type Props = {
    detailed: boolean;
    onDetailedChange: (d: boolean) => void;
};

export default function StatViewToggle({detailed, onDetailedChange}: Props) {
    return (
        <div
            role="group"
            aria-label="Stat view"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-muted p-[3px]"
        >
            <button
                type="button"
                aria-pressed={!detailed}
                onClick={() => onDetailedChange(false)}
                className={cn(
                    "h-full px-3 text-sm font-medium rounded-md transition-colors",
                    !detailed
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                )}
            >
                Compact
            </button>
            <button
                type="button"
                aria-pressed={detailed}
                onClick={() => onDetailedChange(true)}
                className={cn(
                    "h-full px-3 text-sm font-medium rounded-md transition-colors",
                    detailed
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                )}
            >
                Detailed
            </button>
        </div>
    );
}
