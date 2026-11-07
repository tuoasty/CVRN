"use client";

import Link from "next/link";
import {ExternalLink} from "lucide-react";
import styles from "./landing.module.css";
import {ART, artSrc, artSrcSet} from "./representatives";
import type {GameSection} from "./gameSections";

const STAGE_SIZES = "max(100vw, 177.78vh)";

interface Props {
    section: GameSection;
    onLeague: () => void;
}

export default function GameSectionView({section, onLeague}: Props) {
    const headingId = `landing-${section.id}-heading`;
    const {primary, secondary} = section;

    return (
        <section className={styles.section} data-side={section.side} aria-labelledby={headingId}>
            <div className={styles.sectionStage}>
                {section.art && (
                    <img
                        className={styles.sectionArt}
                        src={artSrc(section.art, 1920)}
                        srcSet={artSrcSet(section.art, ART.w)}
                        sizes={STAGE_SIZES}
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />
                )}
                <div className={styles.sectionText}>
                    <h2 id={headingId} className={styles.sectionHeading}>{section.heading}</h2>
                    <p className={styles.sectionBody}>{section.body}</p>
                    {primary.kind === "external" ? (
                        <a href={primary.href} target="_blank" rel="noopener noreferrer" className={styles.sectionPrimary}>
                            {primary.label}
                            <ExternalLink className={styles.sectionExternal} aria-hidden />
                        </a>
                    ) : (
                        <button type="button" className={styles.sectionPrimary} onClick={onLeague}>
                            {primary.label}
                        </button>
                    )}
                    {secondary && (
                        <Link href={secondary.href} prefetch={false} className={styles.sectionSecondary}>
                            {secondary.label} →
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
