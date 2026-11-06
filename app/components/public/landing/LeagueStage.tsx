"use client";

import {useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import styles from "./landing.module.css";
import {ART, artSrc, artSrcSet, REPRESENTATIVES, type RepresentativeRegion} from "./representatives";
import {isOpaqueAt, loadAlphaMask, type AlphaMask} from "./alphaHitTest";

const STAGE_SIZES = "max(100vw, 177.78vh)";
const BY_Z = [...REPRESENTATIVES].sort((a, b) => b.z - a.z);
const CLEAR_DELAY_MS = 160;

interface Props {
    active: boolean;
    focused: RepresentativeRegion | null;
    onFocusChange: (region: RepresentativeRegion | null) => void;
    regionHrefs: Record<RepresentativeRegion, string>;
    navRef: RefObject<HTMLElement | null>;
}

function pct(n: number, of: number) {
    return `${(n / of) * 100}%`;
}

export default function LeagueStage({active, focused, onFocusChange, regionHrefs, navRef}: Props) {
    const router = useRouter();
    const stageRef = useRef<HTMLDivElement>(null);
    const masksRef = useRef<Partial<Record<RepresentativeRegion, AlphaMask>>>({});
    const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [masksReady, setMasksReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        Promise.all(REPRESENTATIVES.map(async r => {
            masksRef.current[r.region] = await loadAlphaMask(artSrc(r.region, 1920));
        }))
            .then(() => { if (!cancelled) setMasksReady(true); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const cancelClear = useCallback(() => {
        if (clearTimer.current) clearTimeout(clearTimer.current);
        clearTimer.current = null;
    }, []);

    const scheduleClear = useCallback(() => {
        cancelClear();
        clearTimer.current = setTimeout(() => onFocusChange(null), CLEAR_DELAY_MS);
    }, [cancelClear, onFocusChange]);

    useEffect(() => cancelClear, [cancelClear]);

    const regionAt = useCallback((clientX: number, clientY: number): RepresentativeRegion | null => {
        const stage = stageRef.current;
        if (!stage || !masksReady) return null;
        const rect = stage.getBoundingClientRect();
        const sx = (clientX - rect.left) / rect.width;
        const sy = (clientY - rect.top) / rect.height;
        for (const r of BY_Z) {
            const mask = masksRef.current[r.region];
            if (!mask) continue;
            const u = (sx - r.box.x / ART.w) / (r.box.w / ART.w);
            const v = (sy - r.box.y / ART.h) / (r.box.h / ART.h);
            if (isOpaqueAt(mask, u, v)) return r.region;
        }
        return null;
    }, [masksReady]);

    const handleMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
        if (!active || e.pointerType !== "mouse") return;
        const hit = regionAt(e.clientX, e.clientY);
        if (hit) {
            cancelClear();
            if (hit !== focused) onFocusChange(hit);
        } else if (focused) {
            scheduleClear();
        }
    }, [active, cancelClear, focused, onFocusChange, regionAt, scheduleClear]);

    const handleClick = useCallback((e: PointerEvent<HTMLDivElement>) => {
        if (!active) return;
        const hit = regionAt(e.clientX, e.clientY);
        if (hit) router.push(regionHrefs[hit]);
    }, [active, regionAt, regionHrefs, router]);

    return (
        <>
        <div ref={stageRef} className={styles.stage}>
            <div className={styles.scene}>
                <img
                    className={styles.base}
                    src={artSrc("base", 2560)}
                    srcSet={artSrcSet("base", ART.w)}
                    sizes={STAGE_SIZES}
                    alt="Nickey, Keny and Jonn, the Europe, Asia and Americas representatives, under arena lights as the ball rises"
                    fetchPriority="high"
                    draggable={false}
                />
                <div className={styles.vignette} />
                <div className={styles.shade} />
                {REPRESENTATIVES.map(r => (
                    <img
                        key={r.region}
                        className={styles.cut}
                        data-on={focused === r.region ? "" : undefined}
                        src={artSrc(r.region, 2560)}
                        srcSet={artSrcSet(r.region, r.box.w)}
                        sizes={`calc(${STAGE_SIZES} * ${(r.box.w / ART.w).toFixed(4)})`}
                        alt=""
                        loading="eager"
                        draggable={false}
                        style={{
                            left: pct(r.box.x, ART.w),
                            top: pct(r.box.y, ART.h),
                            width: pct(r.box.w, ART.w),
                            height: pct(r.box.h, ART.h),
                        }}
                    />
                ))}
            </div>

            <div
                className={styles.hitLayer}
                onPointerMove={handleMove}
                onPointerLeave={() => { if (focused) scheduleClear(); }}
                onClick={handleClick}
            />

            {REPRESENTATIVES.map(r => (
                <div
                    key={r.region}
                    className={styles.info}
                    data-on={focused === r.region ? "" : undefined}
                    aria-hidden={focused !== r.region}
                    style={{left: `${r.info.left}%`, top: `${r.info.top}%`, "--l": r.info.left / 100} as CSSProperties}
                    onPointerEnter={cancelClear}
                    onPointerLeave={scheduleClear}
                >
                    <div className={styles.displayName} style={{"--i": 0} as CSSProperties}>{r.displayName}</div>
                    <div className={styles.username} style={{"--i": 1} as CSSProperties}>@{r.username}</div>
                    <ul className={styles.awards} style={{"--i": 2} as CSSProperties}>
                        {r.awards.map(a => (
                            <li key={a.label}>
                                <span className={`${styles.awardCount} font-mono tabular-nums`}>{a.count}×</span>
                                {a.label}
                            </li>
                        ))}
                    </ul>
                    <div className={styles.statline} style={{"--i": 3} as CSSProperties}>
                        {r.stats.map(s => (
                            <div key={s.label}>
                                <span className={`${styles.statValue} font-mono tabular-nums`}>{s.placeholder.toLocaleString()}</span>
                                <span className={styles.statLabel}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <nav ref={navRef} tabIndex={-1} aria-label="Regions" aria-hidden={!active} className={styles.names}>
            {REPRESENTATIVES.map(r => (
                <Link
                    key={r.region}
                    href={regionHrefs[r.region]}
                    prefetch={false}
                    tabIndex={active ? 0 : -1}
                    className={styles.title}
                    data-on={focused === r.region ? "" : undefined}
                    style={{"--third": (r.column * 2 + 1) / 6, "--i": r.column} as CSSProperties}
                    onPointerEnter={() => { cancelClear(); onFocusChange(r.region); }}
                    onPointerLeave={scheduleClear}
                    onFocus={() => { cancelClear(); onFocusChange(r.region); }}
                    onBlur={scheduleClear}
                >
                    <span className={`${styles.titleCode} font-mono`}>{r.code}</span>
                    <span className={styles.titleName}>{r.name}</span>
                </Link>
            ))}
        </nav>
        </>
    );
}
