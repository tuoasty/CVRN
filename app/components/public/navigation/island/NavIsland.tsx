"use client";

import Link from "next/link";
import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {useParams, usePathname} from "next/navigation";
import {ChevronDown, Moon, Sun} from "lucide-react";
import {cn} from "@/lib/utils";
import {useRegions} from "@/app/hooks/useRegions";
import {useSeasons} from "@/app/hooks/useSeasons";
import {useAccount, type Account} from "@/app/components/account/AccountMenu";
import {AccountPanel} from "@/app/components/account/AccountPanel";
import {ISLAND_REGION_CODES, contextHref, islandRegionFor, latestSeason, type IslandRegionCode} from "./islandContext";
import {useIslandDrawer, type DrawerKind} from "./useIslandDrawer";
import {IslandDrawer} from "./IslandDrawer";
import {SeasonsDrawer} from "./SeasonsDrawer";
import {ThemeDrawer} from "./ThemeDrawer";

const SEGMENT_FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground";

const DRAWER_LABELS: Record<DrawerKind, string> = {seasons: "Seasons", theme: "Theme", account: "Account"};

export function IslandAvatar({account, size}: {account: Account; size: number}) {
    if (account.avatarUrl) {
        return <img src={account.avatarUrl} alt="" width={size} height={size} className="object-cover" style={{width: size, height: size}} />;
    }
    return (
        <span
            aria-hidden
            className="flex items-center justify-center bg-muted text-xs font-semibold text-muted-foreground"
            style={{width: size, height: size}}
        >
            {account.displayName.charAt(0).toUpperCase()}
        </span>
    );
}

function Divider() {
    return <span aria-hidden className="w-px shrink-0 self-stretch bg-border" />;
}

function RegionCodes({island, active, variant, onPreview}: {
    island: IslandRegionCode;
    active: IslandRegionCode;
    variant: "desktop" | "row";
    onPreview?: (code: IslandRegionCode) => void;
}) {
    const {regions} = useRegions();
    const {seasons} = useSeasons();
    const pathname = usePathname();
    const params = useParams<{region?: string; season?: string}>();
    const current = params.region && params.season ? {region: params.region, season: params.season} : null;
    const refs = useRef<Partial<Record<IslandRegionCode, HTMLElement | null>>>({});
    const [bar, setBar] = useState<{left: number; width: number} | null>(null);

    useLayoutEffect(() => {
        const measure = () => {
            const el = refs.current[active];
            if (el) setBar({left: el.offsetLeft, width: el.offsetWidth});
        };
        measure();
        void document.fonts?.ready.then(measure);
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [active, regions.length, seasons.length]);

    return (
        <div className={cn("relative flex items-stretch px-1", variant === "row" && "px-1.5")}>
            {ISLAND_REGION_CODES.map(code => {
                const latest = latestSeason(code, regions, seasons);
                const className = cn(
                    "flex items-center px-1.5 font-mono font-semibold tracking-[0.04em] transition-colors duration-150 motion-reduce:transition-none",
                    variant === "desktop" ? "text-xs" : "px-2 text-[13px]",
                    code === active ? "text-foreground" : "text-muted-foreground",
                );
                const ref = (el: HTMLElement | null) => {
                    refs.current[code] = el;
                };
                if (latest && onPreview) {
                    return (
                        <button
                            key={code}
                            ref={ref}
                            type="button"
                            aria-pressed={code === active}
                            onClick={() => onPreview(code)}
                            className={cn(className, "hover:text-foreground", SEGMENT_FOCUS)}
                        >
                            {code}
                        </button>
                    );
                }
                return latest ? (
                    <Link
                        key={code}
                        ref={ref}
                        href={contextHref(code, latest.slug, pathname, current)}
                        aria-current={code === island ? "true" : undefined}
                        className={cn(className, "hover:text-foreground", SEGMENT_FOCUS)}
                    >
                        {code}
                    </Link>
                ) : (
                    <span key={code} ref={ref} className={className}>
                        {code}
                    </span>
                );
            })}
            {bar && (
                <span
                    aria-hidden
                    className={cn(
                        "pointer-events-none absolute left-0 h-0.5 bg-foreground transition-[transform,width] duration-200 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                        variant === "desktop" ? "bottom-[7px]" : "bottom-[11px]",
                    )}
                    style={{width: Math.max(bar.width - (variant === "desktop" ? 12 : 16), 0), transform: `translateX(${bar.left + (variant === "desktop" ? 6 : 8)}px)`}}
                />
            )}
        </div>
    );
}

export function NavIsland({variant}: {variant: "desktop" | "row"}) {
    const params = useParams<{region?: string; season?: string}>();
    const {regions} = useRegions();
    const {seasons} = useSeasons();
    const account = useAccount();
    const {open, toggle, close, rootRef, triggerRef, drawerId} = useIslandDrawer();
    const [lastOpen, setLastOpen] = useState<DrawerKind | null>(null);
    const [browse, setBrowse] = useState<IslandRegionCode | null>(null);
    const [pending, setPending] = useState<IslandRegionCode | null>(null);
    const body = open ?? lastOpen;

    useEffect(() => {
        setPending(null);
    }, [params.region, params.season]);

    useEffect(() => {
        if (open) setLastOpen(open);
    }, [open]);

    const island = params.region && params.season ? islandRegionFor(params.region) : null;
    const urlRegion = params.region?.toUpperCase() ?? "";
    const folded = island !== null && urlRegion !== island;
    const currentRegion = regions.find(r => r.code.toUpperCase() === urlRegion);
    const currentSeason = seasons.find(s => s.slug === params.season && s.region_id === currentRegion?.id);
    const showAccount = variant === "desktop" && account !== null;

    useEffect(() => {
        if (params.region && params.season) {
            document.cookie = `cvrn_last_ctx=${params.region}:${params.season};path=/;max-age=31536000;samesite=lax`;
        }
    }, [params.region, params.season]);

    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => el.style.setProperty("--island-w", `${el.offsetWidth}px`));
        observer.observe(el);
        return () => observer.disconnect();
    }, [rootRef]);

    useEffect(() => {
        if (!open) return;
        const drawer = document.getElementById(drawerId);
        const target = drawer?.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]')
            ?? drawer?.querySelector<HTMLElement>("a, button");
        target?.focus({preventScroll: false});
    }, [open, drawerId]);

    if (variant === "row" && island === null) return null;

    const trigger = (kind: DrawerKind) => ({
        ref: triggerRef(kind),
        type: "button" as const,
        "aria-expanded": open === kind,
        "aria-controls": drawerId,
        onClick: () => {
            if (kind === "seasons" && open !== "seasons") setBrowse(null);
            toggle(kind);
        },
    });

    const browsing = open === "seasons" ? browse : pending;
    const pickSeason = () => {
        setPending(browse);
        close();
    };
    const listRegion = browse ?? island;

    return (
        <div
            ref={rootRef}
            className={cn(
                "relative flex items-stretch rounded-[2px] border border-border bg-background",
                variant === "desktop" ? "h-9 shrink-0" : "h-11 w-full",
                open
                    ? "rounded-b-none border-b-transparent"
                    : "transition-[border-color] [transition-delay:160ms] [transition-duration:0ms] motion-reduce:[transition-delay:0ms]",
            )}
        >
            {island && (
                <>
                    <RegionCodes
                        island={island}
                        active={browsing ?? island}
                        variant={variant}
                        onPreview={open === "seasons" ? setBrowse : undefined}
                    />
                    <Divider />
                    <button
                        {...trigger("seasons")}
                        className={cn(
                            "flex items-center gap-1.5 whitespace-nowrap px-2.5 font-medium text-foreground",
                            variant === "desktop" ? "text-[13px]" : "flex-1 justify-between px-3.5 text-sm",
                            SEGMENT_FOCUS,
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            {folded && <span className="font-mono text-xs font-semibold text-muted-foreground">{urlRegion}</span>}
                            {currentSeason?.name ?? "Season"}
                        </span>
                        <ChevronDown
                            aria-hidden
                            className={cn(
                                "h-3 w-3 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none",
                                open === "seasons" && "rotate-180",
                            )}
                        />
                    </button>
                </>
            )}
            {variant === "desktop" && (
                <>
                    {island && <Divider />}
                    <button {...trigger("theme")} aria-label="Theme" className={cn("relative flex w-9 items-center justify-center text-muted-foreground hover:text-foreground", SEGMENT_FOCUS)}>
                        <Sun aria-hidden className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon aria-hidden className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    </button>
                </>
            )}
            {showAccount && (
                <>
                    <Divider />
                    <button {...trigger("account")} aria-label={account.displayName} className={cn("flex items-center px-1.5", SEGMENT_FOCUS)}>
                        <IslandAvatar account={account} size={24} />
                    </button>
                </>
            )}
            <IslandDrawer open={open !== null} id={drawerId} label={body ? DRAWER_LABELS[body] : "Island"} size={variant}>
                {body === "seasons" && listRegion && <SeasonsDrawer island={listRegion} size={variant} onPick={pickSeason} />}
                {body === "theme" && <ThemeDrawer onPick={close} />}
                {body === "account" && account && <AccountPanel account={account} size={variant} onNavigate={close} />}
            </IslandDrawer>
        </div>
    );
}
