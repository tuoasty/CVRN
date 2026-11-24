"use client";

import type {CSSProperties, ReactNode} from "react";
import {cn} from "@/lib/utils";

export type DrawerSize = "desktop" | "row";

export function rowStyle(index: number): CSSProperties {
    return {"--d": `${Math.min(index, 7) * 18}ms`} as CSSProperties;
}

export function drawerRowClass(size: DrawerSize, current = false): string {
    return cn(
        "island-row group flex w-full items-center justify-between px-3.5 text-left",
        size === "desktop" ? "h-9 text-[13px]" : "h-11 text-sm",
        "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground",
        current ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
    );
}

export function drawerLabelClass(current = false): string {
    return current
        ? "underline decoration-2 underline-offset-[6px]"
        : "group-hover:underline group-hover:decoration-2 group-hover:decoration-muted-foreground group-hover:underline-offset-[6px]";
}

export const DRAWER_HEADING = "island-row px-3.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground";

export function IslandDrawer({open, id, label, size, matchWidth, children}: {
    open: boolean;
    id: string;
    label: string;
    size: DrawerSize;
    matchWidth: boolean;
    children: ReactNode;
}) {
    return (
        <div
            className={cn(
                "absolute top-full z-10 grid transition-[grid-template-rows] motion-reduce:transition-none",
                size === "desktop" && !matchWidth ? "right-[-1px] w-[max(calc(100%+2px),240px)]" : "left-[-1px] right-[-1px]",
                open
                    ? "grid-rows-[1fr] [transition-duration:220ms] ease-[cubic-bezier(.22,1,.36,1)]"
                    : "grid-rows-[0fr] [transition-duration:160ms] ease-[cubic-bezier(.4,0,1,1)]",
            )}
        >
            {size === "desktop" && !matchWidth && (
                <span
                    aria-hidden
                    className={cn(
                        "pointer-events-none absolute left-0 top-0 z-10 h-px bg-border transition-opacity motion-reduce:transition-none",
                        open ? "opacity-100 duration-0" : "opacity-0 [transition-delay:160ms] duration-0",
                    )}
                    style={{width: "calc(100% - var(--island-w, 100%))"}}
                />
            )}
            <div
                id={id}
                role="region"
                aria-label={label}
                inert={!open}
                data-open={open ? "" : undefined}
                className={cn(
                    "min-h-0 overflow-hidden border border-t-0 bg-background bg-clip-padding",
                    open ? "border-border" : "border-transparent transition-[border-color] [transition-delay:160ms] duration-0 motion-reduce:[transition-delay:0ms]",
                )}
            >
                {children}
            </div>
        </div>
    );
}
