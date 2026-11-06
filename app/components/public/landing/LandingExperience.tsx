"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ChevronRight} from "lucide-react";
import styles from "./landing.module.css";
import LeagueStage from "./LeagueStage";
import LandingMenu from "./LandingMenu";
import {REPRESENTATIVES, type RepresentativeRegion} from "./representatives";
import {headerSeasonNumber, type ContinueLink, type RegionTargets} from "./landingData";

export type LandingView = "menu" | "league";

const PHONE_ORDER: RepresentativeRegion[] = ["as", "eu", "na"];
const PHONE_REGIONS = PHONE_ORDER.map(region => REPRESENTATIVES.find(r => r.region === region)!);

interface Props {
    regionTargets: RegionTargets;
    continueLink: ContinueLink | null;
}

export default function LandingExperience({regionTargets, continueLink}: Props) {
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
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || view !== "league") return;
            if (focused) setFocused(null);
            else changeView("menu");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [changeView, focused, view]);

    const focusedRep = REPRESENTATIVES.find(r => r.region === focused);
    const seasonNumber = headerSeasonNumber(regionTargets, focused);

    return (
        <div
            className={styles.root}
            data-landing-root=""
            data-view={view}
            data-focus={focused ?? undefined}
        >
            <LeagueStage
                active={view === "league"}
                focused={focused}
                onFocusChange={focusRegion}
                regionHrefs={regionHrefs}
                navRef={navRef}
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
                <Link href="/information" prefetch={false} className={styles.phoneRow}>
                    <span className={styles.phoneName}>View Game</span>
                    <ChevronRight className={styles.chevron} aria-hidden />
                </Link>
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
    );
}
