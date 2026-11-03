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

function setsText(match: PlayerRecentMatch): string {
    if (match.teamSets === null && match.opponentSets === null) return "-";
    return `${match.teamSets ?? "-"} - ${match.opponentSets ?? "-"}`;
}

function resultClass(own: number | null, other: number | null): string {
    if (own === null || other === null || own === other) return "";
    return own > other ? "font-semibold" : "text-muted-foreground";
}

function Side({team, className, reverse}: {team: PlayerMatchSide; className: string; reverse?: boolean}) {
    return (
        <span className={cn("flex min-w-0 items-center gap-2", reverse && "flex-row-reverse text-right", className)}>
            <TeamLogo team={{team_name: team.name, team_logo_url: team.logoUrl, team_logo_bg_removed: team.logoBgRemoved}} size={24} />
            <span className="truncate">{team.name}</span>
        </span>
    );
}

function MatchRow({match}: {match: PlayerRecentMatch}) {
    const date = formatMatchDate(match);
    const href = buildPublicMatchHref(match.href);
    const body = (
        <div className="py-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-sm">
                <Side team={match.team} className={resultClass(match.teamSets, match.opponentSets)} />
                <span className="font-mono tabular-nums">{setsText(match)}</span>
                <Side team={match.opponent} className={resultClass(match.opponentSets, match.teamSets)} reverse />
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
    );
    return (
        <li className="border-b border-border/60 last:border-b-0">
            {href ? <Link href={href} prefetch={false} className="block transition-colors hover:bg-muted/30">{body}</Link> : body}
        </li>
    );
}

export function RecentMatchesSection({matches}: {matches: PlayerRecentMatch[]}) {
    return (
        <RuledSection title="Recent Team Matches">
            <ul>
                {matches.map(match => <MatchRow key={match.id} match={match} />)}
            </ul>
        </RuledSection>
    );
}
