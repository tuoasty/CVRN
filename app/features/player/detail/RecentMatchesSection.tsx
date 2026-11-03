import type {CSSProperties} from "react";
import Link from "next/link";
import type {PlayerMatchSide, PlayerRecentMatch} from "@/server/domains/match";
import {cn} from "@/lib/utils";
import {buildPublicMatchHref} from "@/app/utils/matchDetailHref";
import {getRegionTimezone} from "@/app/utils/timezoneOptions";
import {RuledSection} from "./RuledSection";
import {TeamLogo} from "./TeamLogoLink";

function formatMatchDate(match: PlayerRecentMatch): string | null {
    if (!match.scheduledAt) return null;
    return new Date(match.scheduledAt).toLocaleDateString("en-US", {
        timeZone: getRegionTimezone(match.regionCode),
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function won(own: number | null, other: number | null): boolean {
    return own !== null && other !== null && own > other;
}

function lost(own: number | null, other: number | null): boolean {
    return own !== null && other !== null && own < other;
}

function MatchLogo({team}: {team: PlayerMatchSide}) {
    return (
        <TeamLogo
            team={{team_name: team.name, team_logo_url: team.logoUrl, team_logo_bg_removed: team.logoBgRemoved}}
            className="size-14 lg:size-[calc(var(--match-row)-12px)]"
        />
    );
}

function Score({match}: {match: PlayerRecentMatch}) {
    const {teamSets, opponentSets} = match;
    if (teamSets === null && opponentSets === null) {
        return <span className="font-mono text-2xl font-bold leading-none text-muted-foreground">-</span>;
    }
    return (
        <span className="font-mono text-2xl font-bold tabular-nums leading-none">
            <span className={lost(teamSets, opponentSets) ? "text-muted-foreground" : "text-foreground"}>{teamSets ?? "-"}</span>
            <span className="px-1.5 text-base text-muted-foreground/50">–</span>
            <span className={lost(opponentSets, teamSets) ? "text-muted-foreground" : "text-foreground"}>{opponentSets ?? "-"}</span>
        </span>
    );
}

function nameClass(own: number | null, other: number | null): string {
    if (won(own, other)) return "font-bold text-foreground";
    return lost(own, other) ? "font-medium text-muted-foreground" : "font-medium";
}

function MatchRow({match}: {match: PlayerRecentMatch}) {
    const date = formatMatchDate(match);
    const href = buildPublicMatchHref(match.href);
    const body = (
        <div className="flex h-full items-center gap-3">
            <MatchLogo team={match.team} />
            <div className="min-w-0 flex-1">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-base">
                    <span className={cn("truncate", nameClass(match.teamSets, match.opponentSets))}>{match.team.name}</span>
                    <Score match={match} />
                    <span className={cn("truncate text-right", nameClass(match.opponentSets, match.teamSets))}>{match.opponent.name}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                    <span className="min-w-0 truncate">{match.roundLabel}{date && ` · ${date}`}</span>
                    {match.isForfeit ? (
                        <span className="shrink-0">Forfeit</span>
                    ) : match.setScores.length > 0 && (
                        <span className="shrink-0 font-mono tabular-nums">
                            {match.setScores.map(set => `${set.team}-${set.opponent}`).join(" ")}
                        </span>
                    )}
                </div>
            </div>
            <MatchLogo team={match.opponent} />
        </div>
    );
    return (
        <li className="h-[72px] border-b border-border/60 last:border-b-0 lg:h-[var(--match-row)]">
            {href ? <Link href={href} prefetch={false} className="block h-full transition-colors hover:bg-muted/30">{body}</Link> : body}
        </li>
    );
}

export function RecentMatchesSection({matches, rowHeight}: {matches: PlayerRecentMatch[]; rowHeight: number}) {
    return (
        <RuledSection title="Recent Team Matches">
            <ul style={{"--match-row": `${rowHeight}px`} as CSSProperties}>
                {matches.map(match => <MatchRow key={match.id} match={match} />)}
            </ul>
        </RuledSection>
    );
}
