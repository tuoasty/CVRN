import { cn } from "@/lib/utils";

export function getLogoClassName(bgRemoved: boolean): string {
    return cn(
        "object-contain",
        "drop-shadow-[0_0_3px_rgba(0,0,0,0.5)] dark:drop-shadow-[0_0_3px_rgba(255,255,255,0.4)]"
    );
}
