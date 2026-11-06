"use client";

import type {RefObject} from "react";
import Link from "next/link";
import styles from "./landing.module.css";
import type {ContinueLink} from "./landingData";

interface LandingMenuProps {
    active: boolean;
    continueLink: ContinueLink | null;
    leagueButtonRef: RefObject<HTMLButtonElement | null>;
    onLeague: () => void;
    onGame: () => void;
}

function withMonoNumbers(text: string) {
    return text.split(/(\d+)/).map((part, i) =>
        i % 2 === 1 ? <span key={i} className="font-mono">{part}</span> : part,
    );
}

export default function LandingMenu({active, continueLink, leagueButtonRef, onLeague, onGame}: LandingMenuProps) {
    const tabIndex = active ? 0 : -1;

    return (
        <div className={styles.menu} aria-hidden={!active}>
            <p className={styles.subtitle}>Confederate Volleyball Roblox Network</p>
            <div className={styles.rows}>
                {continueLink && (
                    <Link
                        href={continueLink.href}
                        prefetch={false}
                        tabIndex={tabIndex}
                        className={`${styles.row} ${styles.rowContinue}`}
                    >
                        Continue · {withMonoNumbers(continueLink.label)}
                    </Link>
                )}
                <button
                    ref={leagueButtonRef}
                    type="button"
                    tabIndex={tabIndex}
                    className={styles.row}
                    onClick={onLeague}
                >
                    View League
                </button>
                <button type="button" tabIndex={tabIndex} className={styles.row} onClick={onGame}>
                    View Game
                </button>
            </div>
        </div>
    );
}
