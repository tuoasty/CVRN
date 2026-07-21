import { cn } from "@/lib/utils";

/**
 * Logos arrive from two sources: some have had their background removed (transparent PNG),
 * some are still raw uploads with an opaque rectangle behind them.
 *
 * Transparent logos get a glow to separate them from the surface. For everything else we add
 * nothing — no ring, no border. Background removal detection has false negatives (a logo can be
 * genuinely transparent yet flagged bgRemoved:false), and in that case a ring would frame a
 * transparent image with a stray rectangle. Skipping the border keeps those cases clean.
 */
export function getLogoClassName(bgRemoved: boolean): string {
    return cn(
        "object-contain",
        bgRemoved &&
            "drop-shadow-[0_0_3px_rgba(0,0,0,0.5)] dark:drop-shadow-[0_0_3px_rgba(255,255,255,0.4)]"
    );
}
