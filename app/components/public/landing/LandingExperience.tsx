"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import styles from "./landing.module.css";
import LeagueStage from "./LeagueStage";
import LandingMenu from "./LandingMenu";
import {REPRESENTATIVES, type RepresentativeRegion} from "./representatives";
import type {ContinueLink, RegionTargets} from "./landingData";

export type LandingView = "menu" | "league";

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
            />

            <h1 className={styles.brand}>CVR Network</h1>

            <LandingMenu
                active={view === "menu"}
                continueLink={continueLink}
                leagueButtonRef={leagueButtonRef}
                onLeague={() => changeView("league")}
            />

            <div className={styles.hint} aria-live="polite">
                {focusedRep ? `Click to enter ${focusedRep.name}` : "Choose a region"}
            </div>

            {view === "league" && (
                <nav className={styles.phoneList} aria-label="Regions">
                    {REPRESENTATIVES.map(r => (
                        <Link key={r.region} href={regionHrefs[r.region]} prefetch={false} className={styles.phoneLink}>
                            {r.name}
                            <span className="font-mono">{r.code}</span>
                        </Link>
                    ))}
                </nav>
            )}

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
