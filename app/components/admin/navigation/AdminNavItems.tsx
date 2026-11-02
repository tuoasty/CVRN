"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
    adminNavHrefs,
    buildAdminNav,
    findCurrentHref,
    type AdminNavModel,
    type AdminNavPage,
} from "@/app/components/admin/navigation/adminNav";
import { cn } from "@/lib/utils";

const ITEM_BASE = cn(
    "inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-sm font-medium outline-none transition-colors xl:px-3",
    "focus-visible:ring-2 focus-visible:ring-ring"
);
const ITEM_ON = "font-semibold text-foreground underline decoration-2 underline-offset-[6px]";
const ITEM_OFF = "text-muted-foreground hover:text-foreground hover:underline hover:decoration-2 hover:decoration-muted-foreground hover:underline-offset-[6px]";
const SHEET_ON = "bg-accent text-foreground font-semibold";
const SHEET_OFF = "text-muted-foreground";

interface AdminNavItemsProps {
    layout?: "horizontal" | "vertical";
    userRole?: string | null;
    onNavigate?: () => void;
}

export default function AdminNavItems({ layout = "horizontal", userRole, onNavigate }: AdminNavItemsProps) {
    const pathname = usePathname();
    const model = useMemo(() => buildAdminNav(userRole), [userRole]);
    const currentHref = findCurrentHref(pathname, adminNavHrefs(model));

    if (layout === "vertical") {
        return <VerticalNav model={model} currentHref={currentHref} onNavigate={onNavigate} />;
    }
    return <HorizontalNav model={model} currentHref={currentHref} pathname={pathname} />;
}

function NavLabel({ label }: { label: string }) {
    return (
        <span className="flex flex-col text-center">
            <span>{label}</span>
            <span aria-hidden className="invisible h-0 overflow-hidden font-semibold">{label}</span>
        </span>
    );
}

function HorizontalNav({ model, currentHref, pathname }: { model: AdminNavModel; currentHref: string | null; pathname: string }) {
    const [open, setOpen] = useState<{ label: string; pathname: string } | null>(null);
    const navRef = useRef<HTMLElement>(null);
    const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const stripId = useId();

    const openLabel = open?.pathname === pathname ? open.label : null;
    const openGroup = model.groups.find(group => group.label === openLabel) ?? null;

    useEffect(() => {
        if (!openLabel) return;

        const handleClick = (event: MouseEvent) => {
            if (!navRef.current?.contains(event.target as Node)) setOpen(null);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            triggerRefs.current[openLabel]?.focus();
            setOpen(null);
        };

        document.addEventListener("click", handleClick, true);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("click", handleClick, true);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [openLabel]);

    const renderLink = (page: AdminNavPage) => {
        const isCurrent = page.href === currentHref;
        return (
            <Link
                key={page.href}
                href={page.href}
                onClick={() => setOpen(null)}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(ITEM_BASE, isCurrent ? ITEM_ON : ITEM_OFF)}
            >
                <NavLabel label={page.label} />
            </Link>
        );
    };

    return (
        <nav ref={navRef} className="hidden items-center gap-1 lg:flex">
            {model.primary.map(renderLink)}

            {model.groups.length > 0 && <div className="mx-2 h-5 w-px shrink-0 bg-border" aria-hidden />}

            {model.groups.map(group => {
                const isOpen = group.label === openLabel;
                const holdsCurrent = group.pages.some(page => page.href === currentHref);
                return (
                    <button
                        key={group.label}
                        ref={element => { triggerRefs.current[group.label] = element; }}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? stripId : undefined}
                        onClick={() => setOpen(isOpen ? null : { label: group.label, pathname })}
                        className={cn(ITEM_BASE, isOpen || holdsCurrent ? ITEM_ON : ITEM_OFF)}
                    >
                        <NavLabel label={group.label} />
                        <ChevronDown
                            aria-hidden
                            className={cn(
                                "hidden h-3 w-3 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none xl:block",
                                isOpen && "rotate-180"
                            )}
                        />
                    </button>
                );
            })}

            {openGroup && (
                <div
                    id={stripId}
                    className="absolute inset-x-0 top-[calc(100%+1px)] h-11 border-b border-border bg-card shadow-lg animate-in fade-in-0 slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
                >
                    <div className="page-wide flex h-full items-center">
                        <div className="-ml-2 flex items-center gap-1 xl:-ml-3">
                            {openGroup.pages.map(renderLink)}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}

function VerticalNav({ model, currentHref, onNavigate }: { model: AdminNavModel; currentHref: string | null; onNavigate?: () => void }) {
    const groupLabelId = useId();

    const renderLink = (page: AdminNavPage) => (
        <Button
            key={page.href}
            asChild
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start rounded-sm text-sm", page.href === currentHref ? SHEET_ON : SHEET_OFF)}
        >
            <Link href={page.href} onClick={onNavigate} aria-current={page.href === currentHref ? "page" : undefined}>
                {page.label}
            </Link>
        </Button>
    );

    return (
        <nav className="flex w-full flex-col gap-1">
            {model.primary.map(renderLink)}
            {model.groups.map(group => {
                const labelId = `${groupLabelId}-${group.label}`;
                return (
                    <div key={group.label} role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
                        <span id={labelId} className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {group.label}
                        </span>
                        {group.pages.map(renderLink)}
                    </div>
                );
            })}
        </nav>
    );
}
