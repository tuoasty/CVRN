"use client";

import {RefreshCw} from "lucide-react";
import {cn} from "@/lib/utils";

type Props = {
    stale: boolean;
    onRefresh: () => void;
    message?: string;
};

export default function FreshnessBanner({stale, onRefresh, message}: Props) {
    if (!stale) return null;

    return (
        <div className="inline-flex items-center gap-3 rounded-sm border border-primary/40 bg-primary/5 pl-3 pr-1.5 h-10">
            <RefreshCw className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-medium">
                {message ?? "New results are available."}
            </span>
            <button
                type="button"
                onClick={onRefresh}
                className={cn(
                    "inline-flex items-center h-7 px-3 rounded-sm text-xs font-semibold transition-colors",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                )}
            >
                Refresh
            </button>
        </div>
    );
}
