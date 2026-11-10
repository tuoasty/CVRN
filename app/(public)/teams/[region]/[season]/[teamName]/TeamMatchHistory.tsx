import Image from "next/image";
import { DefaultTeamLogo } from "@/app/components/ui/DefaultTeamLogo";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buildPublicMatchHref } from "@/app/utils/matchDetailHref";
import { formatDateInTimezone, getRegionTimezone } from "@/app/utils/timezoneOptions";
import { getLogoClassName } from "@/app/lib/logoClass";
import { cn } from "@/lib/utils";
import type { MatchWithDetails } from "@/server/domains/match";
import type { TeamWithRegion } from "@/server/domains/team";
import type { StandingMethod } from "@/shared/types/standing";
import { SectionHeading } from "@/app/(public)/home/sections/SectionHeading";
import { formatStrength, ordinal, type RankedValue } from "@/app/features/teams/model/strength";

function orientForTeam(md: MatchWithDetails, teamId: string): MatchWithDetails {
    const m = md.match;
    if (m.home_team_id === teamId) return md;
    return {
        ...md,
        match: {
            ...m,
            home_team_id: m.away_team_id,
            away_team_id: m.home_team_id,
            home_sets_won: m.away_sets_won,
            away_sets_won: m.home_sets_won,
            home_team_points: m.away_team_points,
            away_team_points: m.home_team_points,
            home_team_bonus: m.away_team_bonus,
            away_team_bonus: m.home_team_bonus,
            home_team_lvr: m.away_team_lvr,
            away_team_lvr: m.home_team_lvr,
        },
        sets: md.sets.map(s => ({ ...s, home_score: s.away_score, away_score: s.home_score })),
    };
}

const WIN_TEXT = "text-success";
const LOSS_TEXT = "text-destructive";
const GRID = cn(
    "grid items-center gap-2 px-2 sm:gap-3.5 sm:px-4",
    "grid-cols-[52px_minmax(0,1fr)_96px_14px]",
    "sm:grid-cols-[56px_minmax(0,1fr)_96px_64px_14px]",
    "md:grid-cols-[56px_minmax(0,1fr)_96px_minmax(140px,1.4fr)_72px_14px]",
    "lg:grid-cols-[56px_minmax(0,1fr)_104px_96px_minmax(140px,1.4fr)_72px_14px]",
);
const LABEL = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function roundLabel(md: MatchWithDetails): string {
    const m = md.match;
    if (m.match_type === "playoffs") return m.match_code ?? "PO";
    if (m.week != null) return `Week ${m.week}`;
    return "Season";
}

function OpponentCrest({ team }: { team?: TeamWithRegion }) {
    if (team?.logo_url) {
        return (
            <div className="relative w-7 h-7 shrink-0">
                <Image src={team.logo_url} alt={team.name} fill sizes="28px" className={getLogoClassName(team.logo_bg_removed)} />
            </div>
        );
    }
    if (team && !team.is_bye) {
        return (
            <div className="relative w-7 h-7 shrink-0">
                <DefaultTeamLogo sizes="28px" alt={team.name} />
            </div>
        );
    }
    const label = team?.is_bye ? "BYE" : "?";
    if (team?.brick_color) {
        return (
            <div
                className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0"
                style={{ backgroundColor: team.brick_color }}
            >
                <span className="text-xs font-bold uppercase text-white leading-none">{label}</span>
            </div>
        );
    }
    return (
        <div className="w-7 h-7 rounded-sm border border-border bg-muted flex items-center justify-center shrink-0">
            <span className="text-xs font-bold uppercase text-muted-foreground leading-none">{label}</span>
        </div>
    );
}

type Props = {
    matches: MatchWithDetails[];
    teams: Record<string, TeamWithRegion>;
    teamId: string;
    regionCode: string;
    seasonSlug: string;
    standingMethod: StandingMethod;
    strengths: Record<string, number | null>;
    teamStrength: RankedValue;
    schedule: RankedValue;
};

function StrengthNote({ label, value, suffix }: { label: string; value: RankedValue; suffix?: string }) {
    return (
        <span>
            {label} <span className="font-mono tabular-nums text-foreground">{formatStrength(value.value)}</span>
            {value.rank != null && ` (${ordinal(value.rank)}${suffix ?? ""})`}
        </span>
    );
}

export default function TeamMatchHistory({ matches, teams, teamId, regionCode, seasonSlug, standingMethod, strengths, teamStrength, schedule }: Props) {
    const isPoints = standingMethod === "points" || standingMethod === "points_without_bonus";
    const regionTimezone = getRegionTimezone(regionCode);

    const header = (
        <SectionHeading title="Matches">
            <span className="flex flex-wrap justify-end gap-x-1.5 text-xs text-muted-foreground">
                <StrengthNote label="Team strength" value={teamStrength} />
                <span aria-hidden>·</span>
                <StrengthNote label="Schedule strength" value={schedule} suffix=" hardest" />
            </span>
        </SectionHeading>
    );

    if (matches.length === 0) {
        return (
            <section aria-label="Matches">
                {header}
                <p className="py-8 text-sm text-muted-foreground">No matches scheduled yet.</p>
            </section>
        );
    }

    const ordered = [...matches].sort((a, b) => {
        const ac = a.match.status === "completed";
        const bc = b.match.status === "completed";
        if (ac !== bc) return ac ? 1 : -1;
        const at = a.match.scheduled_at ? new Date(a.match.scheduled_at).getTime() : 0;
        const bt = b.match.scheduled_at ? new Date(b.match.scheduled_at).getTime() : 0;
        return ac ? bt - at : at - bt;
    });

    return (
        <section aria-label="Matches">
            {header}

            <div className="mt-2">
                        <div className={cn(GRID, "py-2 border-b border-border")}>
                            <span className={LABEL}>Round</span>
                            <span className={LABEL}>Opponent</span>
                            <span className={cn(LABEL, "hidden text-right lg:block")}>Opp strength</span>
                            <span className={LABEL}>Result</span>
                            <span className={cn(LABEL, "hidden md:block")}>Sets</span>
                            <span className={cn(LABEL, "hidden text-right sm:block")}>{isPoints ? "PTS" : "LVR"}</span>
                            <span />
                        </div>

                        {ordered.map(md => {
                            const original = md.match;
                            const originalHome = original.home_team_id ? teams[original.home_team_id] : undefined;
                            const originalAway = original.away_team_id ? teams[original.away_team_id] : undefined;
                            const oriented = orientForTeam(md, teamId);
                            const opponent = oriented.match.away_team_id ? teams[oriented.match.away_team_id] : undefined;

                            const opponentStrength = oriented.match.away_team_id ? strengths[oriented.match.away_team_id] ?? null : null;
                            const isCompleted = oriented.match.status === "completed";
                            const isPlayoff = original.match_type === "playoffs";
                            const subjectSets = oriented.match.home_sets_won ?? 0;
                            const oppSets = oriented.match.away_sets_won ?? 0;
                            const won = subjectSets > oppSets;

                            const subjectLvr = oriented.match.home_team_lvr;
                            const subjectPts = (oriented.match.home_team_points ?? 0) + (standingMethod === "points" ? (oriented.match.home_team_bonus ?? 0) : 0);

                            const href = buildPublicMatchHref({
                                matchCode: original.match_code,
                                homeTeamName: originalHome?.name,
                                awayTeamName: originalAway?.name,
                                regionCode,
                                seasonSlug,
                            });

                            const timeDisplay = original.scheduled_at ? formatDateInTimezone(original.scheduled_at, regionTimezone) : "TBD";

                            const rowInner = (
                                <>
                                    <span className="text-xs font-medium text-muted-foreground truncate font-mono tabular-nums">
                                        {roundLabel(md)}
                                    </span>

                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs text-muted-foreground shrink-0">vs</span>
                                        <OpponentCrest team={opponent} />
                                        <span className="text-sm font-medium truncate min-w-0">
                                            {opponent?.is_bye ? "BYE" : opponent?.name ?? "TBD"}
                                        </span>
                                    </div>

                                    <span className="hidden text-right text-xs font-mono tabular-nums text-foreground lg:block">
                                        {formatStrength(opponentStrength)}
                                    </span>

                                    {isCompleted ? (
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "inline-flex items-center justify-center w-5 h-5 rounded-sm text-xs font-bold border",
                                                won ? cn("bg-success/10 border-success/30", WIN_TEXT) : cn("bg-destructive/10 border-destructive/30", LOSS_TEXT),
                                            )}>
                                                {won ? "W" : "L"}
                                            </span>
                                            <span className="text-base font-bold font-mono tabular-nums text-foreground">
                                                {subjectSets}–{oppSets}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="truncate text-xs font-mono tabular-nums text-muted-foreground">{timeDisplay}</span>
                                    )}

                                    {isCompleted ? (
                                        original.is_forfeit ? (
                                            <span className="hidden text-xs text-muted-foreground md:block">
                                                {won ? "Won" : "Lost"} by forfeit
                                            </span>
                                        ) : (
                                            <span className="hidden items-center gap-3 text-xs tabular-nums overflow-hidden md:flex">
                                                {oriented.sets.map((s, i) => (
                                                    <span key={i} className={cn("shrink-0", s.home_score > s.away_score ? "text-foreground font-medium" : "text-muted-foreground")}>
                                                        {s.home_score}-{s.away_score}
                                                    </span>
                                                ))}
                                            </span>
                                        )
                                    ) : (
                                        <span className="hidden md:block" />
                                    )}

                                    {isPlayoff || !isCompleted ? (
                                        <span className="hidden sm:block" />
                                    ) : !isPoints && subjectLvr != null ? (
                                        <span className={cn("hidden text-right text-xs font-semibold font-mono tabular-nums sm:block", subjectLvr >= 0 ? WIN_TEXT : LOSS_TEXT)}>
                                            {subjectLvr >= 0 ? "+" : ""}{subjectLvr.toFixed(1)}
                                        </span>
                                    ) : isPoints ? (
                                        <span className="hidden text-right text-xs font-semibold font-mono tabular-nums text-foreground sm:block">
                                            +{subjectPts.toFixed(1)}
                                        </span>
                                    ) : (
                                        <span className="hidden sm:block" />
                                    )}

                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" aria-hidden />
                                </>
                            );

                            const rowClasses = cn(GRID, "py-2.5 transition-colors duration-150");

                            return href ? (
                                <Link
                                    key={original.id}
                                    href={href}
                                    prefetch={false}
                                    className={cn(rowClasses, "hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground")}
                                >
                                    {rowInner}
                                </Link>
                            ) : (
                                <div key={original.id} className={rowClasses}>
                                    {rowInner}
                                </div>
                            );
                        })}
            </div>
        </section>
    );
}
