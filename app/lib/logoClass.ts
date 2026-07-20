import { cn } from "@/lib/utils";

/**
 * Logos arrive from two sources: some have had their background removed (transparent PNG),
 * some are still raw uploads with an opaque rectangle behind them.
 *
 * Transparent logos need a glow to separate them from the surface. Opaque ones already have
 * their own edge — glowing them makes the rectangle look like a mistake, so those get a
 * clipped corner and a hairline ring instead, which reads as deliberate.
 */
export function getLogoClassName(bgRemoved: boolean): string {
    return cn(
        "object-contain",
        bgRemoved
            ? "drop-shadow-[0_0_3px_rgba(0,0,0,0.5)] dark:drop-shadow-[0_0_3px_rgba(255,255,255,0.4)]"
            : "rounded-sm ring-1 ring-border"
    );
}
