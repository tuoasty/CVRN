"use client";

import {useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {cn} from "@/lib/utils";
import type {MatchDetail} from "@/server/domains/match";
import type {Team} from "@/shared/types/db";
import GFXImageDialog from "@/app/features/media/GFXImageDialog";
import {TeamMark, TodayMark} from "@/app/(public)/home/sections/TeamMark";
import {TapeRows} from "@/app/(public)/home/hero/TapeCard";
import {HERO_ROW_HEIGHT, PORTRAIT_MAX_RATIO} from "@/app/(public)/home/hero/GfxFrame";
import {postRatio} from "@/app/(public)/home/model/ratio";
import {formatRegionDate, formatRegionTime} from "@/app/(public)/home/model/format";
import {isRegionToday} from "@/app/(public)/home/model/phase";
import {getMatchTypeLabel, parseMatchNumber} from "@/app/utils/matchLabel";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import type {MatchExtras} from "./loadMatchExtras";

type Props = {detail: MatchDetail; extras: MatchExtras | null};

function teamHref(team: Team | null, extras: MatchExtras | null): string | null {
    if (!team || team.is_bye || team.deleted_at || !extras) return null;
    return buildPublicTeamHref({regionCode: extras.regionCode, seasonSlug: extras.seasonSlug, teamSlug: team.slug});
}

function Side({team, href, align}: {team: Team | null; href: string | null; align: "left" | "right"}) {
    const mark = {
        id: team?.id ?? "tbd",
        name: team?.name ?? "TBD",
        logoUrl: team?.logo_url ?? null,
        logoBgRemoved: team?.logo_bg_removed ?? false,
        href,
    };
    const name = (
        <span className="block min-w-0 max-w-full break-words text-base font-bold leading-tight line-clamp-2 sm:truncate sm:text-lg">
            {mark.name}
        </span>
    );
    return (
        <div
            className={cn(
                "flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3",
                align === "right" ? "items-end text-right sm:flex-row-reverse" : "items-start",
            )}
        >
            <TeamMark team={mark} size={40} />
            {href ? <Link href={href} className="block min-w-0 max-w-full hover:underline">{name}</Link> : name}
        </div>
    );
}

function Card({detail, extras, centered}: Props & {centered: boolean}) {
    const {match, sets, homeTeam, awayTeam, playoffRound} = detail;
    const isCompleted = match.status === "completed";
    const homeSets = match.home_sets_won ?? 0;
    const awaySets = match.away_sets_won ?? 0;
    const label = getMatchTypeLabel(match.match_type, match.week, playoffRound, parseMatchNumber(match.match_code) ?? undefined);
    const tz = extras?.timeZone;
    const when = match.scheduled_at && tz ? `${formatRegionDate(match.scheduled_at, tz)} · ${formatRegionTime(match.scheduled_at, tz)}` : null;
    const isToday = !!tz && isRegionToday(match.scheduled_at, tz, new Date());
    const orderedSets = [...sets].sort((a, b) => a.set_number - b.set_number);

    return (
        <>
            <div
                className={cn(
                    "flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
                    centered && "justify-center",
                )}
            >
                <span>{label}</span>
                {when && <span aria-hidden>·</span>}
                {when && (isToday ? <TodayMark>Today {formatRegionTime(match.scheduled_at as string, tz as string)}</TodayMark> : <span>{when}</span>)}
                {match.is_forfeit && (
                    <span className="inline-flex items-center rounded-full border border-border px-2 text-xs font-medium normal-case tracking-normal">Forfeit</span>
                )}
            </div>
            <div className={cn("grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3", centered ? "mt-4 gap-4" : "mt-3")}>
                <Side team={homeTeam} href={teamHref(homeTeam, extras)} align={centered ? "right" : "left"} />
                {isCompleted ? (
                    <div className={cn("whitespace-nowrap font-mono font-semibold tabular-nums", centered ? "text-3xl" : "text-2xl")}>
                        <span className={cn(homeSets <= awaySets && "text-muted-foreground")}>{homeSets}</span>
                        <span className="mx-1.5 text-muted-foreground">-</span>
                        <span className={cn(awaySets <= homeSets && "text-muted-foreground")}>{awaySets}</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">vs</span>
                )}
                <Side team={awayTeam} href={teamHref(awayTeam, extras)} align={centered ? "left" : "right"} />
            </div>
            {isCompleted && orderedSets.length > 0 && (
                <div className="mt-1 flex justify-center gap-3 font-mono text-xs tabular-nums text-muted-foreground">
                    {orderedSets.map(s => (
                        <span key={s.set_number}>
                            <span className={cn(s.home_score > s.away_score && "font-medium text-foreground")}>{s.home_score}</span>
                            -
                            <span className={cn(s.away_score > s.home_score && "font-medium text-foreground")}>{s.away_score}</span>
                        </span>
                    ))}
                </div>
            )}
            {extras?.tape && (
                <div className={centered ? "mt-5" : "mt-3"}>
                    <TapeRows tape={extras.tape} inward={centered} />
                </div>
            )}
        </>
    );
}

export default function MatchHero({detail, extras}: Props) {
    const [gfxOpen, setGfxOpen] = useState(false);
    const gfx = detail.mediaPosts.find(p => p.type === "gfx" && p.image_url) ?? null;

    if (!gfx?.image_url) {
        return (
            <section aria-label="Match" className="mx-auto max-w-2xl">
                <Card detail={detail} extras={extras} centered />
            </section>
        );
    }

    const ratio = postRatio(gfx);
    const portrait = ratio < PORTRAIT_MAX_RATIO;

    return (
        <section aria-label="Match" className={cn("flex flex-col gap-6 lg:flex-row lg:gap-10", HERO_ROW_HEIGHT, portrait && "lg:justify-center")}>
            <button
                type="button"
                onClick={() => setGfxOpen(true)}
                aria-label={`View ${gfx.title} full size`}
                className="relative w-full shrink-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:h-full lg:w-auto lg:max-w-[60%]"
                style={{aspectRatio: ratio}}
            >
                <Image src={gfx.image_url} alt="" fill priority sizes="(max-width: 1024px) 100vw, 860px" className="object-contain" />
            </button>
            <div className={cn("min-w-0 flex-1 lg:overflow-y-auto", portrait && "lg:max-w-[560px]")}>
                <Card detail={detail} extras={extras} centered={false} />
            </div>
            <GFXImageDialog url={gfx.image_url} title={gfx.title} open={gfxOpen} onOpenChange={setGfxOpen} />
        </section>
    );
}
