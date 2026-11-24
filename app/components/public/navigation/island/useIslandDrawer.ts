"use client";

import {useCallback, useEffect, useId, useRef, useState, type RefObject} from "react";
import {usePathname} from "next/navigation";

export type DrawerKind = "seasons" | "theme" | "account";

export function useIslandDrawer(): {
    open: DrawerKind | null;
    toggle(kind: DrawerKind): void;
    close(): void;
    rootRef: RefObject<HTMLDivElement | null>;
    triggerRef(kind: DrawerKind): (el: HTMLButtonElement | null) => void;
    drawerId: string;
} {
    const pathname = usePathname();
    const [state, setState] = useState<{kind: DrawerKind; pathname: string} | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const triggers = useRef<Partial<Record<DrawerKind, HTMLButtonElement | null>>>({});
    const drawerId = useId();

    const open = state && state.pathname === pathname ? state.kind : null;

    const close = useCallback(() => setState(null), []);

    const toggle = useCallback((kind: DrawerKind) => {
        setState(prev => (prev && prev.kind === kind && prev.pathname === pathname ? null : {kind, pathname}));
    }, [pathname]);

    const triggerRef = useCallback((kind: DrawerKind) => (el: HTMLButtonElement | null) => {
        triggers.current[kind] = el;
    }, []);

    useEffect(() => {
        if (!open) return;

        const handlePointer = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setState(null);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            triggers.current[open]?.focus();
            setState(null);
        };

        document.addEventListener("pointerdown", handlePointer, true);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointer, true);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    return {open, toggle, close, rootRef, triggerRef, drawerId};
}
