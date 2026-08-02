"use client";

import {useState} from "react";
import Link from "next/link";
import Image from "next/image";
import AvatarImage from "@/app/components/ui/AvatarImage";
import {Badge} from "@/app/components/ui/badge";
import {getLogoClassName} from "@/app/lib/logoClass";
import type {MatchDetail} from "@/server/domains/match";
import type {Team} from "@/shared/types/db";
import {formatMatchDate} from "@/app/lib/formatDate";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import GFXImageDialog from "@/app/features/media/GFXImageDialog";
import {StandingMethod} from "@/shared/types/standing";

const ROUND_LABELS: Record<string, string> = {
    play_in: "Play-In",
    round_of_32: "Round of 32",
    round_of_16: "Round of 16",
    quarterfinal: "Quarterfinals",
    semifinal: "Semifinals",
    final: "Grand Finals",
    third_place: "3rd Place",
};

const getStatusConfig = (status: string): {label: string; className: string} => {
    switch (status) {
        case "pending":
            return {label: "Pending", className: "bg-amber-600/10 text-amber-600 border-amber-600/20"};
        case "scheduled":
            return {label: "Scheduled", className: "bg-blue-600/10 text-blue-600 border-blue-600/20"};
        case "completed":
            return {label: "Completed", className: "bg-green-600/10 text-green-600 border-green-600/20"};
        default:
            return {label: status, className: ""};
    }
};

type Props = {
    detail: MatchDetail;
    regionCode?: string;
    seasonSlug?: string;
    standingMethod?: StandingMethod;
};

export default function MatchHeader({detail, regionCode, seasonSlug, standingMethod = "lvr"}: Props) {
    const {match, sets, homeTeam, awayTeam, officials, playoffRound} = detail;
    const [gfxOpen, setGfxOpen] = useState(false);

    const gfx = detail.mediaPosts.find(p => p.type === "gfx" && p.image_url) ?? null;
    const isPoints = standingMethod === "points" || standingMethod === "points_without_bonus";
    // 'points' shows base + margin bonus; 'points_without_bonus' shows base only.
    const homePts = (match.home_team_points ?? 0) + (standingMethod === "points" ? (match.home_team_bonus ?? 0) : 0);
    const awayPts = (match.away_team_points ?? 0) + (standingMethod === "points" ? (match.away_team_bonus ?? 0) : 0);

    const homeSets = match.home_sets_won ?? 0;
    const awaySets = match.away_sets_won ?? 0;
    const homeWon = homeSets > awaySets;
    const awayWon = awaySets > homeSets;
    const isCompleted = match.status === "completed";

    const statusConfig = getStatusConfig(match.status);
    const referees = officials.filter(o => o.official_type === "referee");
    const media = officials.filter(o => o.official_type === "media");

    const roundLabel = playoffRound ? (ROUND_LABELS[playoffRound] ?? playoffRound) : null;
    const homeTeamHref = homeTeam && !homeTeam.is_bye && !homeTeam.deleted_at
        ? buildPublicTeamHref({regionCode, seasonSlug, teamSlug: homeTeam.slug})
        : null;
    const awayTeamHref = awayTeam && !awayTeam.is_bye && !awayTeam.deleted_at
        ? buildPublicTeamHref({regionCode, seasonSlug, teamSlug: awayTeam.slug})
        : null;

    const setChips = <SetChips sets={sets} visible={isCompleted && sets.length > 0} />;
    const marginRow = (
        <MarginRow
            isCompleted={isCompleted}
            isPoints={isPoints}
            match={match}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            homePts={homePts}
            awayPts={awayPts}
        />
    );
    const officialsRow = <OfficialsRow referees={referees} media={media} />;

    return (
        <div className="space-y-4 pb-6 border-b border-border">
            {/* Metadata row */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-border">
                <div className="flex flex-col gap-1.5">
                    {(roundLabel ?? match.match_code) && (
                        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                            {roundLabel ?? match.match_code}
                        </span>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {match.is_forfeit ? (
                            <Badge
                                variant="outline"
                                className="rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider bg-red-600/10 text-red-600 border-red-600/20"
                            >
                                Forfeit
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className={`rounded-sm text-[10px] h-5 px-2 font-semibold uppercase tracking-wider ${statusConfig.className}`}
                            >
                                {statusConfig.label}
                            </Badge>
                        )}
                        <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2">
                            BO{match.best_of}
                        </Badge>
                        {match.match_type === "playoffs" && (
                            <Badge
                                variant="outline"
                                className="rounded-sm text-[10px] h-5 px-2 bg-purple-600/10 text-purple-600 border-purple-600/20"
                            >
                                Playoff
                            </Badge>
                        )}
                        {match.week !== null && match.week !== undefined && match.match_type === "season" && (
                            <Badge variant="outline" className="rounded-sm text-[10px] h-5 px-2">
                                Week {match.week}
                            </Badge>
                        )}
                    </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                    {match.scheduled_at ? formatMatchDate(match.scheduled_at) : "TBD"}
                </span>
            </div>

            {gfx?.image_url ? (
                /* With a graphic the page is a two-column spread: at 1440px a full-width 16:9
                   GFX is 810px tall and pushes the entire result below the fold. Side by side
                   both land ~430px and the graphic is never cropped. */
                <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-5 lg:gap-6">
                    <button
                        type="button"
                        onClick={() => setGfxOpen(true)}
                        className="relative aspect-video w-full overflow-hidden rounded-sm border border-border transition-shadow hover:shadow-md"
                        aria-label={`View ${gfx.title} full size`}
                    >
                        <Image
                            src={gfx.image_url}
                            alt={gfx.title}
                            fill
                            priority
                            sizes="(min-width: 1024px) 55vw, 100vw"
                            className="object-cover"
                        />
                    </button>

                    <div className="flex flex-col justify-center gap-3 min-w-0">
                        <TeamScoreRow
                            team={homeTeam}
                            href={homeTeamHref}
                            setsWon={homeSets}
                            won={homeWon}
                            isCompleted={isCompleted}
                        />
                        <TeamScoreRow
                            team={awayTeam}
                            href={awayTeamHref}
                            setsWon={awaySets}
                            won={awayWon}
                            isCompleted={isCompleted}
                        />
                        {setChips}
                        {marginRow}
                        {officialsRow}
                    </div>
                </div>
            ) : (
                <>
                    {/* Team matchup */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 py-2 sm:py-3">
                        <TeamColumn team={homeTeam} href={homeTeamHref} won={homeWon} />

                        {isCompleted ? (
                            <div className="flex items-center gap-2 sm:gap-4 px-1 sm:px-2">
                                <span
                                    className={`text-4xl sm:text-5xl font-bold tabular-nums ${
                                        homeWon ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    {homeSets}
                                </span>
                                <span className="text-2xl sm:text-3xl text-muted-foreground/50 font-medium">−</span>
                                <span
                                    className={`text-4xl sm:text-5xl font-bold tabular-nums ${
                                        awayWon ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    {awaySets}
                                </span>
                            </div>
                        ) : (
                            <span className="text-lg sm:text-2xl font-bold text-muted-foreground/50 px-2">VS</span>
                        )}

                        <TeamColumn team={awayTeam} href={awayTeamHref} won={awayWon} />
                    </div>

                    {setChips}
                    {marginRow}
                    {officialsRow}
                </>
            )}

            {gfx?.image_url && (
                <GFXImageDialog
                    url={gfx.image_url}
                    title={gfx.title}
                    open={gfxOpen}
                    onOpenChange={setGfxOpen}
                />
            )}
        </div>
    );
}

function TeamLogo({team, sizes}: {team: Team | null; sizes: string}) {
    if (team?.is_bye) {
        return (
            <div className="w-full h-full bg-orange-600/10 border border-orange-600/20 flex items-center justify-center">
                <span className="text-sm text-orange-600 font-bold">BYE</span>
            </div>
        );
    }
    if (team?.logo_url) {
        return (
            <Image
                src={team.logo_url}
                alt={team.name}
                fill
                priority
                sizes={sizes}
                className={getLogoClassName(team.logo_bg_removed)}
            />
        );
    }
    return (
        <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
            <span className="text-lg text-muted-foreground font-bold">?</span>
        </div>
    );
}

/** Split layout: one row per team, so the set count reads as that team's result. */
function TeamScoreRow({
    team,
    href,
    setsWon,
    won,
    isCompleted,
}: {
    team: Team | null;
    href: string | null;
    setsWon: number;
    won: boolean;
    isCompleted: boolean;
}) {
    const nameClass = `text-base sm:text-lg truncate ${
        won ? "font-bold text-foreground" : "font-medium text-muted-foreground"
    }`;

    return (
        <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-sm overflow-hidden shrink-0">
                <TeamLogo team={team} sizes="56px" />
            </div>
            <div className="flex-1 min-w-0">
                {href ? (
                    <Link href={href} prefetch={false} className={`${nameClass} block hover:underline`}>
                        {team!.name}
                    </Link>
                ) : (
                    <span className={`${nameClass} block`}>
                        {team?.name || "TBD"}
                        {team?.deleted_at && (
                            <span className="block text-[10px] text-muted-foreground/50 font-normal">disbanded</span>
                        )}
                    </span>
                )}
            </div>
            <span
                className={`text-3xl sm:text-4xl font-bold tabular-nums shrink-0 ${
                    won ? "text-foreground" : "text-muted-foreground"
                }`}
            >
                {isCompleted ? setsWon : "–"}
            </span>
        </div>
    );
}

/** Default layout: logo above name, mirrored either side of the score. */
function TeamColumn({team, href, won}: {team: Team | null; href: string | null; won: boolean}) {
    const nameClass = `w-full text-sm sm:text-lg text-center truncate ${
        won ? "font-bold text-foreground" : "font-medium text-muted-foreground"
    }`;

    return (
        <div className="flex flex-col items-center gap-2 min-w-0">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-sm overflow-hidden">
                <TeamLogo team={team} sizes="96px" />
            </div>
            {href ? (
                <Link href={href} prefetch={false} className={`${nameClass} hover:underline`}>
                    {team!.name}
                </Link>
            ) : (
                <span className={nameClass}>
                    {team?.name || "TBD"}
                    {team?.deleted_at && (
                        <span className="block text-[10px] text-muted-foreground/50 font-normal normal-case tracking-normal">disbanded</span>
                    )}
                </span>
            )}
        </div>
    );
}

function SetChips({sets, visible}: {sets: MatchDetail["sets"]; visible: boolean}) {
    if (!visible) return null;
    return (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {sets.map(set => (
                <div
                    key={set.set_number}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-muted/50 border border-border/50"
                >
                    <span
                        className={`text-sm font-semibold tabular-nums ${
                            set.home_score > set.away_score ? "text-foreground" : "text-muted-foreground"
                        }`}
                    >
                        {set.home_score}
                    </span>
                    <span className="text-xs text-muted-foreground">−</span>
                    <span
                        className={`text-sm font-semibold tabular-nums ${
                            set.away_score > set.home_score ? "text-foreground" : "text-muted-foreground"
                        }`}
                    >
                        {set.away_score}
                    </span>
                </div>
            ))}
        </div>
    );
}

function MarginRow({
    isCompleted,
    isPoints,
    match,
    homeTeam,
    awayTeam,
    homePts,
    awayPts,
}: {
    isCompleted: boolean;
    isPoints: boolean;
    match: MatchDetail["match"];
    homeTeam: Team | null;
    awayTeam: Team | null;
    homePts: number;
    awayPts: number;
}) {
    if (!isCompleted) return null;

    if (isPoints) {
        if (match.home_team_points === null && match.away_team_points === null) return null;
        return (
            <div className="flex items-center justify-between gap-2 pt-1">
                <div>
                    {!homeTeam?.is_bye && match.home_team_points !== null && match.home_team_points !== undefined && (
                        <Badge
                            variant="outline"
                            className="h-5 px-2 text-[11px] font-semibold tabular-nums bg-primary/10 text-primary border-primary/20"
                        >
                            +{homePts.toFixed(1)} pts
                        </Badge>
                    )}
                </div>
                <div>
                    {!awayTeam?.is_bye && match.away_team_points !== null && match.away_team_points !== undefined && (
                        <Badge
                            variant="outline"
                            className="h-5 px-2 text-[11px] font-semibold tabular-nums bg-primary/10 text-primary border-primary/20"
                        >
                            +{awayPts.toFixed(1)} pts
                        </Badge>
                    )}
                </div>
            </div>
        );
    }

    if (match.home_team_lvr === null && match.away_team_lvr === null) return null;
    return (
        <div className="flex items-center justify-between gap-2 pt-1">
            <div>
                {!homeTeam?.is_bye && match.home_team_lvr !== null && match.home_team_lvr !== undefined && (
                    <Badge
                        variant="outline"
                        className={`h-5 px-2 text-[11px] font-semibold tabular-nums ${
                            match.home_team_lvr >= 0
                                ? "bg-green-600/10 text-green-600 border-green-600/20"
                                : "bg-red-600/10 text-red-600 border-red-600/20"
                        }`}
                    >
                        {match.home_team_lvr >= 0 ? "+" : ""}
                        {match.home_team_lvr.toFixed(1)} LVR
                    </Badge>
                )}
            </div>
            <div>
                {!awayTeam?.is_bye && match.away_team_lvr !== null && match.away_team_lvr !== undefined && (
                    <Badge
                        variant="outline"
                        className={`h-5 px-2 text-[11px] font-semibold tabular-nums ${
                            match.away_team_lvr >= 0
                                ? "bg-green-600/10 text-green-600 border-green-600/20"
                                : "bg-red-600/10 text-red-600 border-red-600/20"
                        }`}
                    >
                        {match.away_team_lvr >= 0 ? "+" : ""}
                        {match.away_team_lvr.toFixed(1)} LVR
                    </Badge>
                )}
            </div>
        </div>
    );
}

function OfficialsRow({
    referees,
    media,
}: {
    referees: MatchDetail["officials"];
    media: MatchDetail["officials"];
}) {
    if (referees.length === 0 && media.length === 0) return null;

    return (
        <div className="flex flex-wrap items-start gap-x-6 gap-y-2 pt-3 border-t border-border">
            {referees.length > 0 && <OfficialGroup label="Refs" people={referees} />}
            {media.length > 0 && <OfficialGroup label="Media" people={media} />}
        </div>
    );
}

function OfficialGroup({label, people}: {label: string; people: MatchDetail["officials"]}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {label}
            </span>
            <div className="flex gap-2 flex-wrap">
                {people.map(official => (
                    <div key={official.id} className="flex items-center gap-1.5">
                        <div className="relative w-5 h-5 rounded-full overflow-hidden border border-border shrink-0">
                            <AvatarImage
                                src={official.avatar_url}
                                alt={official.username || "Official"}
                                sizes="20px"
                            />
                        </div>
                        <span className="text-xs">
                            {official.display_name || official.username || "Unknown"}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
