"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ChevronRight} from "lucide-react";
import styles from "./landing.module.css";
import LeagueStage from "./LeagueStage";
import LandingMenu from "./LandingMenu";
import GameSectionView from "./GameSection";
import SiteFooter from "@/app/components/public/footer/SiteFooter";
import {GAME_SECTIONS} from "./gameSections";
import {FADE_MS, INITIAL_WHEEL, keyIntent, nextWheel, type WheelState} from "./landingGestures";
import {REPRESENTATIVES, type RepresentativeRegion} from "./representatives";
import {headerSeasonNumber, type ContinueLink, type RegionTargets} from "./landingData";
import type {RepresentativeCard} from "./representativeCard";

export type LandingView = "menu" | "league";

const PHONE_ORDER: RepresentativeRegion[] = ["as", "eu", "na"];
const PHONE_REGIONS = PHONE_ORDER.map(region => REPRESENTATIVES.find(r => r.region === region)!);
const PHONE_QUERY = "(max-width: 767px), (max-aspect-ratio: 3/2)";
const INTERACTIVE = "a, button, input, textarea, select, [contenteditable]";

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isPhoneLayout() {
    return window.matchMedia(PHONE_QUERY).matches;
}

interface Props {
    regionTargets: RegionTargets;
    continueLink: ContinueLink | null;
    cards: Record<RepresentativeRegion, RepresentativeCard>;
}

export default function LandingExperience({regionTargets, continueLink, cards}: Props) {
    const view: LandingView = useSearchParams().get("view") === "league" ? "league" : "menu";
    const [focused, setFocused] = useState<RepresentativeRegion | null>(null);
    const [focusView, setFocusView] = useState(view);
    if (focusView !== view) {
        setFocusView(view);
        setFocused(null);
    }
    const leagueButtonRef = useRef<HTMLButtonElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const shownView = useRef(view);
    const wheel = useRef<WheelState>(INITIAL_WHEEL);
    const topSince = useRef(-Infinity);
    const pendingReveal = useRef(false);
    const fadeTimer = useRef<number | undefined>(undefined);
    const [blackout, setBlackout] = useState(false);
    const [instant, setInstant] = useState(false);

    useEffect(() => {
        if (shownView.current === view) return;
        shownView.current = view;
        const target = view === "league" ? navRef.current : leagueButtonRef.current;
        target?.focus({preventScroll: true});
    }, [view]);
    const regionHrefs = useMemo(() => ({
        eu: regionTargets.eu.href,
        as: regionTargets.as.href,
        na: regionTargets.na.href,
    }), [regionTargets]);

    const focusRegion = useCallback((region: RepresentativeRegion | null) => {
        setFocused(region !== null && view !== "league" ? null : region);
    }, [view]);

    const changeView = useCallback((next: LandingView) => {
        setFocused(null);
        const url = new URL(window.location.href);
        if (next === "league") url.searchParams.set("view", "league");
        else url.searchParams.delete("view");
        window.history.pushState({landingView: next}, "", url);
    }, []);

    useEffect(() => {
        if (view === "league" && window.scrollY > 0) window.scrollTo({top: 0, behavior: "instant"});
        if (view !== "league" || !pendingReveal.current) return;
        pendingReveal.current = false;
        let inner = 0;
        const outer = requestAnimationFrame(() => {
            inner = requestAnimationFrame(() => {
                setInstant(false);
                setBlackout(false);
            });
        });
        return () => {
            cancelAnimationFrame(outer);
            cancelAnimationFrame(inner);
        };
    }, [view]);

    useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && view === "league") {
                if (focused) setFocused(null);
                else changeView("menu");
                return;
            }
            if (isPhoneLayout()) return;
            const target = e.target instanceof Element ? e.target : null;
            const intent = keyIntent({
                key: e.key,
                view,
                scrollY: window.scrollY,
                targetIsInteractive: target?.closest(INTERACTIVE) != null,
            });
            if (!intent) return;
            e.preventDefault();
            changeView(intent);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [changeView, focused, view]);

    useEffect(() => {
        const onScroll = () => {
            if (window.scrollY > 1) topSince.current = Infinity;
            else if (topSince.current === Infinity) topSince.current = performance.now();
        };
        window.addEventListener("scroll", onScroll, {passive: true});
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const onWheel = (e: WheelEvent) => {
            if (isPhoneLayout()) return;
            const now = performance.now();
            const scrollY = window.scrollY;
            const result = nextWheel(wheel.current, {
                deltaY: e.deltaY,
                deltaMode: e.deltaMode,
                now,
                scrollY,
                atTopFor: scrollY <= 1 ? now - topSince.current : 0,
                view,
            });
            wheel.current = result.state;
            if (result.swallow) e.preventDefault();
            if (result.intent) changeView(result.intent);
        };
        window.addEventListener("wheel", onWheel, {passive: false});
        return () => window.removeEventListener("wheel", onWheel);
    }, [changeView, view]);

    const scrollToGame = useCallback(() => {
        document.getElementById("landing-game")?.scrollIntoView({behavior: prefersReducedMotion() ? "auto" : "smooth"});
    }, []);

    const enterLeagueFromSection = useCallback(() => {
        setBlackout(true);
        window.clearTimeout(fadeTimer.current);
        fadeTimer.current = window.setTimeout(() => {
            pendingReveal.current = true;
            setInstant(true);
            window.scrollTo({top: 0, behavior: "instant"});
            changeView("league");
        }, prefersReducedMotion() ? 0 : FADE_MS);
    }, [changeView]);

    const focusedRep = REPRESENTATIVES.find(r => r.region === focused);
    const seasonNumber = headerSeasonNumber(regionTargets, focused);

    return (
        <>
            <div
                className={styles.root}
                data-landing-root=""
                data-view={view}
                data-focus={focused ?? undefined}
                data-instant={instant ? "" : undefined}
            >
                <LeagueStage
                    active={view === "league"}
                    focused={focused}
                    onFocusChange={focusRegion}
                    regionHrefs={regionHrefs}
                    navRef={navRef}
                    cards={cards}
                />

                <h1 className={styles.brand}>CVR Network</h1>

                <div className={styles.header} aria-hidden={view !== "league"}>
                    {seasonNumber !== null && (
                        <p className={styles.season}>
                            Season <span className="font-mono">{seasonNumber}</span>
                        </p>
                    )}
                    <p className={styles.hint} aria-live="polite">
                        {focusedRep ? `Click to enter ${focusedRep.name}` : "Choose a region"}
                    </p>
                </div>

                <LandingMenu
                    active={view === "menu"}
                    continueLink={continueLink}
                    leagueButtonRef={leagueButtonRef}
                    onLeague={() => changeView("league")}
                    onGame={scrollToGame}
                />

                <nav className={styles.phoneList} aria-label="Menu">
                    {PHONE_REGIONS.map(r => {
                        const n = regionTargets[r.region].seasonNumber;
                        return (
                            <Link key={r.region} href={regionHrefs[r.region]} prefetch={false} className={styles.phoneRow}>
                                <span className={styles.phoneName}>{r.name}</span>
                                {n !== null && (
                                    <span className={styles.phoneSeason}>
                                        Season <span className="font-mono">{n}</span>
                                    </span>
                                )}
                                <ChevronRight className={styles.chevron} aria-hidden />
                            </Link>
                        );
                    })}
                    <button type="button" className={styles.phoneRow} onClick={scrollToGame}>
                        <span className={styles.phoneName}>View Game</span>
                        <ChevronRight className={styles.chevron} aria-hidden />
                    </button>
                </nav>

                <button
                    type="button"
                    tabIndex={view === "league" ? 0 : -1}
                    className={`${styles.corner} ${styles.back}`}
                    onClick={() => changeView("menu")}
                >
                    ← Back
                </button>
            </div>
            <div id="landing-game" className={styles.sections}>
                {GAME_SECTIONS.map(section => (
                    <GameSectionView key={section.id} section={section} onLeague={enterLeagueFromSection} />
                ))}
            </div>
            <div className={styles.footerSnap}>
                <SiteFooter surface="plain" />
            </div>
            <div className={styles.blackout} data-on={blackout ? "" : undefined} aria-hidden />
        </>
    );
}
