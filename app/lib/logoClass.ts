import { cn } from "@/lib/utils";

export function getLogoClassName(bgRemoved: boolean): string {
    return cn(
        "object-contain",
        bgRemoved
            ? "[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.25))]"
            : "mix-blend-multiply dark:mix-blend-screen"
    );
}
