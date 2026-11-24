"use client";

import {useCallback, useEffect, useId, useRef, useState, type RefObject} from "react";
import {usePathname} from "next/navigation";

export type DrawerKind = "seasons" | "theme" | "account";

export function useIslandDrawer(): {
    open: DrawerKind | null;
    toggle(kind: DrawerKind): void;
    close(options?: {restoreFocus?: boolean}): void;
    rootRef: RefObject<HTMLDivElement | null>;
    triggerRef(kind: DrawerKind): (el: HTMLButtonElement | null) => void;
    drawerId: string;
} {
    const pathname = usePathname();
    const [open, setOpen] = useState<DrawerKind | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const triggers = useRef<Partial<Record<DrawerKind, HTMLButtonElement | null>>>({});
    const drawerId = useId();

    const openRef = useRef<DrawerKind | null>(null);

    useEffect(() => {
        openRef.current = open;
    }, [open]);

    useEffect(() => {
        setOpen(null);
    }, [pathname]);

    const close = useCallback((options?: {restoreFocus?: boolean}) => {
        const current = openRef.current;
        if (current && options?.restoreFocus) triggers.current[current]?.focus();
        setOpen(null);
    }, []);

    const toggle = useCallback((kind: DrawerKind) => {
        setOpen(current => (current === kind ? null : kind));
    }, []);

    const triggerRef = useCallback((kind: DrawerKind) => (el: HTMLButtonElement | null) => {
        triggers.current[kind] = el;
    }, []);

    useEffect(() => {
        const root = rootRef.current;
        if (!open || !root) return;

        const focusInside = () => root.contains(document.activeElement);

        const handlePointer = (event: PointerEvent) => {
            if (!root.contains(event.target as Node)) setOpen(null);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (!focusInside() && document.activeElement !== document.body) return;
            triggers.current[open]?.focus();
            setOpen(null);
        };
        const handleFocusOut = (event: FocusEvent) => {
            const next = event.relatedTarget as Node | null;
            if (next && !root.contains(next)) setOpen(null);
        };

        document.addEventListener("pointerdown", handlePointer, true);
        document.addEventListener("keydown", handleKeyDown);
        root.addEventListener("focusout", handleFocusOut);
        return () => {
            document.removeEventListener("pointerdown", handlePointer, true);
            document.removeEventListener("keydown", handleKeyDown);
            root.removeEventListener("focusout", handleFocusOut);
        };
    }, [open]);

    return {open, toggle, close, rootRef, triggerRef, drawerId};
}
