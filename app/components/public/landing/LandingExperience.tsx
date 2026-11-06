"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import styles from "./landing.module.css";
import LeagueStage from "./LeagueStage";
import {REPRESENTATIVES, type RepresentativeRegion} from "./representatives";
import type {ContinueLink, RegionTargets} from "./landingData";

export type LandingView = "menu" | "league";

interface Props {
    initialView: LandingView;
    regionTargets: RegionTargets;
    continueLink: ContinueLink | null;
}

function viewFromUrl(): LandingView {
    return new URL(window.location.href).searchParams.get("view") === "league" ? "league" : "menu";
}

export default function LandingExperience({initialView, regionTargets, continueLink}: Props) {
    const [view, setView] = useState<LandingView>(initialView);
    const [focused, setFocused] = useState<RepresentativeRegion | null>(null);
    const regionHrefs = useMemo(() => ({
        eu: regionTargets.eu.href,
        as: regionTargets.as.href,
        na: regionTargets.na.href,
    }), [regionTargets]);

    const changeView = useCallback((next: LandingView) => {
        setFocused(null);
        setView(next);
        const url = new URL(window.location.href);
        if (next === "league") url.searchParams.set("view", "league");
        else url.searchParams.delete("view");
        window.history.pushState(null, "", url);
    }, []);

    useEffect(() => {
        const onPop = () => {
            setFocused(null);
            setView(viewFromUrl());
        };
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
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
        <div className={styles.root} data-landing-root="" data-view={view} data-focus={focused ?? undefined}>
            <LeagueStage
                active={view === "league"}
                focused={focused}
                onFocusChange={setFocused}
                regionHrefs={regionHrefs}
            />

            <div className={styles.menu} aria-hidden={view !== "menu"}>
                <div>
                    <h1 className={styles.menuTitle}>CVR Network</h1>
                    <p className={styles.menuSub}>Confederate Volleyball Roblox Network</p>
                </div>
                <div className={styles.menuActions}>
                    <Link
                        href="/information"
                        prefetch={false}
                        tabIndex={view === "menu" ? 0 : -1}
                        className={styles.menuButton}
                    >
                        View Game
                    </Link>
                    <button
                        type="button"
                        tabIndex={view === "menu" ? 0 : -1}
                        className={styles.menuButton}
                        onClick={() => changeView("league")}
                    >
                        View League
                    </button>
                </div>
            </div>

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

            {continueLink && (
                <Link
                    href={continueLink.href}
                    prefetch={false}
                    className={`${styles.corner} ${styles.continue}`}
                >
                    Continue to {continueLink.label} →
                </Link>
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
