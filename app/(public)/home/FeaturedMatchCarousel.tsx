"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import GfxFrame from "@/app/features/media/GfxFrame";
import AvatarImage from "@/app/components/ui/AvatarImage";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { cn } from "@/lib/utils";
import type { MatchWithDetails } from "@/server/domains/match";
import type { TeamWithRegion } from "@/server/domains/team";
import type { MediaPost } from "@/server/domains/media";

export type FeaturedMatchSlide = {
    kind: "match";
    matchDetails: MatchWithDetails;
    homeTeam?: TeamWithRegion;
    awayTeam?: TeamWithRegion;
    gfx: MediaPost;
    matchLabel: string;
    href: string | null;
    isRecent: boolean;
    authorName?: string | null;
};

export type FeaturedAwardSlide = {
    kind: "totw" | "potw";
    gfx: MediaPost;
    subjectName: string | null;
    subjectAvatarUrl?: string | null;
    subjectSubtext?: string | null;
    weekLabel?: string | null;
    authorName?: string | null;
    href: string | null;
};

export type FeaturedSlide = FeaturedMatchSlide | FeaturedAwardSlide;

const SLIDE_MS = 380;
const CHROME_FADE_MS = 130;
const AUTO_ADVANCE_MS = 7000;

const LOGO_SHADOW =
    "[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.65))_drop-shadow(0_1px_3px_rgba(0,0,0,0.85))]";

export default function FeaturedMatchCarousel({
    slides,
    regionCode,
}: {
    slides: FeaturedSlide[];
    regionCode?: string;
}) {
    const N = slides.length;
    const many = N > 1;

    const [pos, setPos] = useState(1);
    const [displayIndex, setDisplayIndex] = useState(0);
    const [fading, setFading] = useState(false);
    const [autoPlay, setAutoPlay] = useState(true);
    const [hovering, setHovering] = useState(false);
    const [noAnim, setNoAnim] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lockRef = useRef(false);
    const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const realIndex = many ? (((pos - 1) % N) + N) % N : 0;

    useEffect(() => {
        if (realIndex === displayIndex) return;
        setFading(true);
        timer.current = setTimeout(() => {
            setDisplayIndex(realIndex);
            setFading(false);
        }, CHROME_FADE_MS);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [realIndex, displayIndex]);

    useEffect(() => {
        if (!many || !autoPlay || hovering) return;
        const id = setInterval(() => setPos(p => p + 1), AUTO_ADVANCE_MS);
        return () => clearInterval(id);
    }, [many, autoPlay, hovering]);

    useEffect(() => {
        if (!many || (pos !== N + 1 && pos !== 0)) return;
        const id = setTimeout(() => {
            setNoAnim(true);
            setPos(pos === N + 1 ? 1 : N);
        }, SLIDE_MS);
        return () => clearTimeout(id);
    }, [pos, many, N]);

    useEffect(() => {
        if (!noAnim) return;
        const raf = requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
        return () => cancelAnimationFrame(raf);
    }, [noAnim]);

    useEffect(() => () => { if (lockTimer.current) clearTimeout(lockTimer.current); }, []);

    if (N === 0) return null;

    const extended = many ? [slides[N - 1], ...slides, slides[0]] : slides;
    const trackPos = many ? pos : 0;
    const shown = slides[displayIndex];
    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    const step = (delta: number) => {
        if (lockRef.current) return;
        lockRef.current = true;
        setAutoPlay(false);
        setPos(p => Math.min(N + 1, Math.max(0, p + delta)));
        lockTimer.current = setTimeout(() => { lockRef.current = false; }, SLIDE_MS);
    };

    const ariaLabel = shown.kind === "match"
        ? `${shown.homeTeam?.name ?? "TBD"} vs ${shown.awayTeam?.name ?? "TBD"}`
        : (shown.subjectName ?? (shown.kind === "totw" ? "Team of the Week" : "Player of the Week"));

    return (
        <div

            className="panel relative w-full overflow-hidden aspect-video sm:min-h-[280px] bg-black transition-colors hover:border-primary/60"
            onPointerDown={() => setAutoPlay(false)}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onKeyDown={e => {
                if (!many) return;

                if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
                if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
            }}
        >
            <div
                className={cn(
                    "absolute inset-0 flex ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                    noAnim ? "" : "transition-transform"
                )}
                style={{ transform: `translateX(-${trackPos * 100}%)`, transitionDuration: noAnim ? "0ms" : `${SLIDE_MS}ms` }}
            >
                {extended.map((slide, i) => (
                    <GfxFrame
                        key={i}
                        src={slide.gfx.image_url!}
                        alt={slide.gfx.title}
                        priority={i === (many ? 1 : 0)}
                        sizes="768px"
                        className="flex-none w-full h-full"
                    />
                ))}
            </div>

            {shown.href && (
                <Link
                    href={shown.href}
                    prefetch={false}
                    className="absolute inset-0 z-20"
                    aria-label={ariaLabel}
                />
            )}

            <div
                className={cn(
                    "absolute inset-0 z-30 pointer-events-none transition-opacity motion-reduce:transition-none",
                    fading ? "opacity-0" : "opacity-100"
                )}
                style={{ transitionDuration: `${CHROME_FADE_MS}ms` }}
            >
                {shown.kind === "match" ? (
                    <MatchChrome slide={shown} regionTimezone={regionTimezone} />
                ) : (
                    <AwardChrome slide={shown} />
                )}
            </div>

            {many && (
                <>
                    <Arrow side="left" onClick={() => step(-1)} />
                    <Arrow side="right" onClick={() => step(1)} />

                    <div className="absolute right-4 bottom-4 z-40 flex gap-1.5">
                        {slides.map((slide, i) => (
                            <button
                                key={slide.gfx.id}
                                type="button"
                                onClick={() => { setAutoPlay(false); setPos(i + 1); }}
                                aria-label={`Show match ${i + 1} of ${slides.length}`}
                                aria-current={i === realIndex}
                                className={cn(
                                    "h-[3px] w-[22px] transition-colors motion-reduce:transition-none",
                                    i === realIndex ? "bg-white" : "bg-white/30 hover:bg-white/60"
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function MatchChrome({ slide, regionTimezone }: { slide: FeaturedMatchSlide; regionTimezone?: string }) {
    const { match } = slide.matchDetails;
    const isCompleted = match.status === "completed";
    const homeWon = isCompleted && (match.home_sets_won ?? 0) > (match.away_sets_won ?? 0);
    const awayWon = isCompleted && (match.away_sets_won ?? 0) > (match.home_sets_won ?? 0);
    const when = regionTimezone && match.scheduled_at
        ? formatDateInTimezone(match.scheduled_at, regionTimezone)
        : match.scheduled_at
            ? new Date(match.scheduled_at).toLocaleString()
            : "Time TBD";

    return (
        <>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-5 py-4 bg-gradient-to-b from-black/65 to-transparent">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-white/85">
                    {slide.isRecent ? "Result" : "Up Next"}
                </h3>
                <span className="hidden sm:block text-[13px] font-semibold uppercase tracking-wider text-white/70">
                    {slide.matchLabel}
                </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 px-5 pt-12 pb-4 bg-gradient-to-t from-black/80 via-black/45 to-transparent">
                <div className="flex h-10 items-center justify-center sm:justify-start gap-3">
                    <SlideTeam team={slide.homeTeam} dim={isCompleted && !homeWon} />
                    <span className="shrink-0 text-xl font-bold tabular-nums text-white">
                        {isCompleted ? `${match.home_sets_won} – ${match.away_sets_won}` : "VS"}
                    </span>
                    <SlideTeam team={slide.awayTeam} dim={isCompleted && !awayWon} reverse />
                    <span className="shrink-0 ml-auto hidden sm:flex items-center gap-1.5 text-xs text-white/75">
                        <Calendar className="h-3.5 w-3.5" />
                        {when}

                        {slide.authorName && (
                            <>
                                <span className="text-white/40">•</span>
                                <span className="uppercase tracking-wider text-white/50">
                                    by {slide.authorName}
                                </span>
                            </>
                        )}
                    </span>
                </div>
                {/* {slide.authorName && <AuthorCredit name={slide.authorName} />} */}
            </div>
        </>
    );
}

function AwardChrome({ slide }: { slide: FeaturedAwardSlide }) {
    const heading = slide.kind === "totw" ? "Team of the Week" : "Player of the Week";
    const isPotw = slide.kind === "potw";

    return (
        <>
            <div className="absolute inset-x-0 top-0 flex items-center px-5 py-4 bg-gradient-to-b from-black/65 to-transparent">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-white/85">
                    {heading}
                </h3>
            </div>

            <div className="absolute inset-x-0 bottom-0 px-5 pt-12 pb-4 bg-gradient-to-t from-black/80 via-black/45 to-transparent">
                <div className="flex h-10 items-center gap-3">
                    {slide.subjectAvatarUrl && (
                        isPotw ? (
                            <div className="relative w-11 h-11 shrink-0 overflow-hidden">
                                <AvatarImage src={slide.subjectAvatarUrl} alt={slide.subjectName ?? heading} sizes="44px" />
                            </div>
                        ) : (
                            <div className="relative w-11 h-11 shrink-0">
                                <Image
                                    src={slide.subjectAvatarUrl}
                                    alt={slide.subjectName ?? heading}
                                    fill
                                    sizes="44px"
                                    className={cn("object-contain", LOGO_SHADOW)}
                                />
                            </div>
                        )
                    )}
                    {slide.subjectName && (
                        <div className="min-w-0">
                            <span className="block text-lg font-bold text-white truncate">
                                {slide.subjectName}
                            </span>
                            {slide.subjectSubtext && (
                                <span className="hidden sm:block text-xs text-white/60 truncate">
                                    {slide.subjectSubtext}
                                </span>
                            )}
                        </div>
                    )}
                    {slide.weekLabel && (
                        <span className="hidden sm:block shrink-0 ml-auto text-xs text-white/75 truncate max-w-[220px]">
                            {slide.weekLabel}

                            {slide.authorName && (
                                <span className="uppercase tracking-wider text-white/50">
                                    {" • "}by {slide.authorName}
                                </span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </>
    );
}

function Arrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
    const Icon = side === "left" ? ChevronLeft : ChevronRight;
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={side === "left" ? "Previous match" : "Next match"}
            className={cn(

                "absolute top-1/2 -translate-y-1/2 z-40 grid place-items-center w-10 h-16 text-white",
                "[filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.9))_drop-shadow(0_0_8px_rgba(0,0,0,0.55))]",
                side === "left" ? "left-0.5" : "right-0.5"
            )}
        >
            <Icon className="h-7 w-7" />
        </button>
    );
}

function SlideTeam({ team, dim, reverse }: { team?: TeamWithRegion; dim: boolean; reverse?: boolean }) {
    return (
        <div className={cn("flex items-center gap-2.5 min-w-0", reverse && "flex-row-reverse", dim && "opacity-60")}>
            {team?.logo_url && (
                <div className="relative w-9 h-9 shrink-0">
                    <Image
                        src={team.logo_url}
                        alt={team.name}
                        fill
                        sizes="36px"
                        className={cn("object-contain", LOGO_SHADOW)}
                    />
                </div>
            )}
            <span className={cn("hidden sm:block text-sm font-bold text-white truncate min-w-0", reverse && "text-right")}>
                {team?.name || "TBD"}
            </span>
        </div>
    );
}
