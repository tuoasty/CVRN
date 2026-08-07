"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import GfxFrame from "@/app/features/media/GfxFrame";
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
};

export type FeaturedAwardSlide = {
    kind: "totw" | "potw";
    gfx: MediaPost;
    subjectName: string;
    href: string | null;
};

export type FeaturedSlide = FeaturedMatchSlide | FeaturedAwardSlide;

const SLIDE_MS = 380;
const CHROME_FADE_MS = 130;

const LOGO_SHADOW =
    "[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.65))_drop-shadow(0_1px_3px_rgba(0,0,0,0.85))]";

export default function FeaturedMatchCarousel({
    slides,
    regionCode,
}: {
    slides: FeaturedSlide[];
    regionCode?: string;
}) {
    const [index, setIndex] = useState(0);
    const [displayIndex, setDisplayIndex] = useState(0);
    const [fading, setFading] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (index === displayIndex) return;
        setFading(true);
        timer.current = setTimeout(() => {
            setDisplayIndex(index);
            setFading(false);
        }, CHROME_FADE_MS);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [index, displayIndex]);

    if (slides.length === 0) return null;

    const many = slides.length > 1;

    const shown = slides[displayIndex];
    const regionTimezone = regionCode ? getRegionTimezone(regionCode) : undefined;

    const step = (delta: number) => setIndex(i => (i + delta + slides.length) % slides.length);

    const ariaLabel = shown.kind === "match"
        ? `${shown.homeTeam?.name ?? "TBD"} vs ${shown.awayTeam?.name ?? "TBD"}`
        : shown.subjectName;

    return (
        <div

            className="panel relative overflow-hidden aspect-video min-h-[280px] bg-black transition-colors hover:border-primary/60"
            onKeyDown={e => {
                if (!many) return;

                if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
                if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
            }}
        >
            <div
                className="absolute inset-0 flex transition-transform ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
                style={{ transform: `translateX(-${index * 100}%)`, transitionDuration: `${SLIDE_MS}ms` }}
            >
                {slides.map((slide, i) => (
                    <GfxFrame
                        key={slide.gfx.id}
                        src={slide.gfx.image_url!}
                        alt={slide.gfx.title}
                        priority={i === 0}
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
                                onClick={() => setIndex(i)}
                                aria-label={`Show match ${i + 1} of ${slides.length}`}
                                aria-current={i === index}
                                className={cn(
                                    "h-[3px] w-[22px] transition-colors motion-reduce:transition-none",
                                    i === index ? "bg-white" : "bg-white/30 hover:bg-white/60"
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
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-5 py-4 bg-gradient-to-b from-black/85 to-transparent">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-white/85">
                    {slide.isRecent ? "Result" : "Up Next"}
                </h3>
                <span className="text-[13px] font-semibold uppercase tracking-wider text-white/70">
                    {slide.matchLabel}
                </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 px-5 pt-12 pb-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
                <div className="flex items-center gap-3">
                    <SlideTeam team={slide.homeTeam} dim={isCompleted && !homeWon} />
                    <span className="shrink-0 text-xl font-bold tabular-nums text-white">
                        {isCompleted ? `${match.home_sets_won} – ${match.away_sets_won}` : "VS"}
                    </span>
                    <SlideTeam team={slide.awayTeam} dim={isCompleted && !awayWon} reverse />
                    <span className="shrink-0 ml-auto flex items-center gap-1.5 text-xs text-white/75">
                        <Calendar className="h-3.5 w-3.5" />
                        {when}
                    </span>
                </div>
            </div>
        </>
    );
}

function AwardChrome({ slide }: { slide: FeaturedAwardSlide }) {
    const heading = slide.kind === "totw" ? "Team of the Week" : "Player of the Week";

    return (
        <>
            <div className="absolute inset-x-0 top-0 flex items-center px-5 py-4 bg-gradient-to-b from-black/85 to-transparent">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-white/85">
                    {heading}
                </h3>
            </div>

            <div className="absolute inset-x-0 bottom-0 px-5 pt-12 pb-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
                <span className="block text-lg font-bold text-white truncate">
                    {slide.subjectName}
                </span>
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
            <span className={cn("text-sm font-bold text-white truncate min-w-0", reverse && "text-right")}>
                {team?.name || "TBD"}
            </span>
        </div>
    );
}
