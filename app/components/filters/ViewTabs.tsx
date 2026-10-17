"use client";

import {useRef, type KeyboardEvent, type ReactNode} from "react";
import {cn} from "@/lib/utils";

export type ViewTab<T extends string> = {value: T; label: ReactNode};

const WRAP = {
    sm: {
        grid: "sm:grid-cols-[minmax(0,1fr)_auto]",
        tools: "row-start-2 mt-2 sm:col-start-2 sm:row-start-1 sm:mt-0 sm:self-end sm:justify-self-end",
    },
    xl: {
        grid: "xl:grid-cols-[minmax(0,1fr)_auto]",
        tools: "row-start-2 mt-2 xl:col-start-2 xl:row-start-1 xl:mt-0 xl:self-end xl:justify-self-end",
    },
} as const;

const DENSITY = {
    default: {list: "gap-1", tab: "px-3.5"},
    compact: {list: "gap-0.5", tab: "px-3"},
} as const;

export function viewTabId(idBase: string, value: string): string {
    return `${idBase}-tab-${value}`;
}

export function viewPanelId(idBase: string): string {
    return `${idBase}-panel`;
}

type Props<T extends string> = {
    label: string;
    idBase?: string;
    tabs: readonly ViewTab<T>[];
    value: T;
    onChange: (value: T) => void;
    density?: keyof typeof DENSITY;
    wrapToolsBelow?: keyof typeof WRAP;
    toolsClassName?: string;
    className?: string;
    children?: ReactNode;
};

export function ViewTabs<T extends string>({
    label,
    idBase,
    tabs,
    value,
    onChange,
    density = "default",
    wrapToolsBelow = "sm",
    toolsClassName,
    className,
    children,
}: Props<T>) {
    const listRef = useRef<HTMLDivElement>(null);

    const activate = (index: number) => {
        const wrapped = (index + tabs.length) % tabs.length;
        onChange(tabs[wrapped].value);
        listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[wrapped]?.focus();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const current = tabs.findIndex(t => t.value === value);
        const targets: Record<string, number> = {
            ArrowRight: current + 1,
            ArrowLeft: current - 1,
            Home: 0,
            End: tabs.length - 1,
        };
        if (!(event.key in targets)) return;
        event.preventDefault();
        activate(targets[event.key]);
    };

    return (
        <div className={cn("grid grid-cols-1", WRAP[wrapToolsBelow].grid, className)}>
            <div aria-hidden className="col-span-full row-start-1 border-b border-border" />
            <div
                ref={listRef}
                role="tablist"
                aria-label={label}
                onKeyDown={onKeyDown}
                className={cn("relative col-start-1 row-start-1 flex min-w-0 overflow-x-auto", DENSITY[density].list)}
            >
                {tabs.map(tab => {
                    const selected = tab.value === value;
                    return (
                        <button
                            key={tab.value}
                            id={idBase ? viewTabId(idBase, tab.value) : undefined}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-controls={idBase ? viewPanelId(idBase) : undefined}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => onChange(tab.value)}
                            className={cn(
                                "h-11 shrink-0 border-b-2 text-sm transition-colors duration-150 motion-reduce:transition-none",
                                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
                                DENSITY[density].tab,
                                selected
                                    ? "border-foreground font-semibold text-foreground"
                                    : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            {children && (
                <div className={cn("relative min-w-0", WRAP[wrapToolsBelow].tools, toolsClassName)}>{children}</div>
            )}
        </div>
    );
}
