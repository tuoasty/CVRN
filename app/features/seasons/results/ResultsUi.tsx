"use client";

import Image from "next/image";
import {ImageIcon, Loader2} from "lucide-react";
import type {ComponentProps, ReactNode} from "react";
import {cn} from "@/lib/utils";

export function SectionHeader({title, meta, children}: {title: string; meta?: ReactNode; children?: ReactNode}) {
    return (
        <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
            <h2 className="flex min-w-0 items-baseline gap-2 text-sm font-semibold">
                <span className="shrink-0">{title}</span>
                {meta && <span className="truncate text-xs font-normal text-muted-foreground">{meta}</span>}
            </h2>
            {children && <div className="flex shrink-0 items-baseline gap-3">{children}</div>}
        </div>
    );
}

type TextActionProps = ComponentProps<"button"> & {armed?: boolean; tone?: "action" | "danger" | "quiet"};

export function TextAction({armed, tone = "action", className, type = "button", ...props}: TextActionProps) {
    return (
        <button
            type={type}
            className={cn(
                "inline-flex h-6 shrink-0 items-center gap-1 rounded-md text-xs font-medium underline-offset-4 transition-colors duration-150 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "disabled:pointer-events-none disabled:opacity-50",
                armed
                    ? "font-semibold text-foreground underline decoration-2"
                    : tone === "danger"
                        ? "text-destructive hover:underline"
                        : tone === "quiet"
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-primary hover:underline",
                className,
            )}
            {...props}
        />
    );
}

export function AwardThumb({url, name}: {url: string | null | undefined; name: string}) {
    return (
        <span className="relative block size-6 shrink-0 overflow-hidden bg-muted">
            {url ? (
                <Image src={url} alt="" fill sizes="24px" unoptimized className="object-cover object-top" />
            ) : (
                <span aria-hidden className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    {name.charAt(0).toUpperCase()}
                </span>
            )}
        </span>
    );
}

export function NewLabel() {
    return <span className="shrink-0 text-xs font-semibold text-primary">new</span>;
}

export function CaptainMark() {
    return (
        <span
            title="Captain"
            aria-label="Captain"
            className="inline-flex h-4 shrink-0 items-center bg-foreground px-1 font-mono text-xs font-bold leading-none text-background"
        >
            C
        </span>
    );
}

export function EmptyRows({children}: {children: ReactNode}) {
    return <p className="flex h-16 items-center justify-center text-sm text-muted-foreground">{children}</p>;
}

export function SubLabel({children, split}: {children: ReactNode; split?: boolean}) {
    return (
        <p className={cn(
            "mt-2 mb-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
            split && "mt-3 border-t border-border pt-2",
        )}>
            {children}
        </p>
    );
}

interface StarPickerProps {
    value: number;
    max?: number;
    onChange: (n: number) => void;
    disabled?: boolean;
    label: string;
    showCount?: boolean;
}

export function StarPicker({value, max, onChange, disabled, label, showCount = true}: StarPickerProps) {
    return (
        <div role="group" aria-label={label} className={cn("flex items-center", disabled && "opacity-50")}>
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    aria-pressed={n === value}
                    onClick={() => onChange(value === n ? 0 : n)}
                    className={cn(
                        "inline-flex size-6 items-center justify-center rounded-md text-sm leading-none transition-colors duration-150 motion-reduce:transition-none",
                        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none",
                        n <= value ? "text-foreground" : "text-border hover:text-muted-foreground",
                    )}
                >
                    ★
                </button>
            ))}
            {showCount && (
                <span className="ml-1 w-8 font-mono text-xs tabular-nums text-muted-foreground">
                    {value}/{max ?? 5}
                </span>
            )}
        </div>
    );
}

export function AvatarRefreshButton({username, busy, disabled, onClick}: {username: string; busy: boolean; disabled?: boolean; onClick: () => void}) {
    return (
        <button
            type="button"
            aria-label={`Refresh avatar for @${username}`}
            title="Refresh avatar"
            disabled={disabled || busy}
            onClick={onClick}
            className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,opacity] duration-150 hover:text-foreground motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none",
                busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100",
            )}
        >
            {busy ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> : <ImageIcon className="size-3.5" />}
        </button>
    );
}

