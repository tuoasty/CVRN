import Link from "next/link";
import Image from "next/image";
import AvatarImage from "@/app/components/ui/AvatarImage";
import {Badge} from "@/app/components/ui/badge";
import {getLogoClassName} from "@/app/lib/logoClass";
import type {MatchDetail} from "@/server/domains/match";
import {formatMatchDate} from "@/app/lib/formatDate";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";

const ROUND_LABELS: Record<string, string> = {
    play_in: "Play-In",
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
};

export default function MatchHeader({detail, regionCode, seasonSlug}: Props) {
    const {match, sets, homeTeam, awayTeam, officials, playoffRound} = detail;

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

    return (
        <div className="panel p-4 sm:p-6 space-y-4">
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

            {/* Team matchup */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 py-2 sm:py-3">
                {/* Home */}
                <div className="flex flex-col items-center gap-2 min-w-0">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-sm overflow-hidden">
                        {homeTeam?.is_bye ? (
                            <div className="w-full h-full bg-orange-600/10 border border-orange-600/20 flex items-center justify-center">
                                <span className="text-sm text-orange-600 font-bold">BYE</span>
                            </div>
                        ) : homeTeam?.logo_url ? (
                            <Image
                                src={homeTeam.logo_url}
                                alt={homeTeam.name}
                                fill
                                priority
                                sizes="96px"
                                className={getLogoClassName(homeTeam.logo_bg_removed)}
                            />
                        ) : (
                            <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
                                <span className="text-lg text-muted-foreground font-bold">?</span>
                            </div>
                        )}
                    </div>
                    {homeTeamHref ? (
                        <Link
                            href={homeTeamHref}
                            className={`w-full text-sm sm:text-lg text-center truncate hover:underline ${
                                homeWon ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                            }`}
                        >
                            {homeTeam!.name}
                        </Link>
                    ) : (
                        <span
                            className={`w-full text-sm sm:text-lg text-center truncate ${
                                homeWon ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                            }`}
                        >
                            {homeTeam?.name || "TBD"}
                            {homeTeam?.deleted_at && (
                                <span className="block text-[10px] text-muted-foreground/50 font-normal normal-case tracking-normal">disbanded</span>
                            )}
                        </span>
                    )}
                </div>

                {/* Score / VS */}
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

                {/* Away */}
                <div className="flex flex-col items-center gap-2 min-w-0">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-sm overflow-hidden">
                        {awayTeam?.is_bye ? (
                            <div className="w-full h-full bg-orange-600/10 border border-orange-600/20 flex items-center justify-center">
                                <span className="text-sm text-orange-600 font-bold">BYE</span>
                            </div>
                        ) : awayTeam?.logo_url ? (
                            <Image
                                src={awayTeam.logo_url}
                                alt={awayTeam.name}
                                fill
                                priority
                                sizes="96px"
                                className={getLogoClassName(awayTeam.logo_bg_removed)}
                            />
                        ) : (
                            <div className="w-full h-full rounded-sm bg-muted/50 border border-border flex items-center justify-center">
                                <span className="text-lg text-muted-foreground font-bold">?</span>
                            </div>
                        )}
                    </div>
                    {awayTeamHref ? (
                        <Link
                            href={awayTeamHref}
                            className={`w-full text-sm sm:text-lg text-center truncate hover:underline ${
                                awayWon ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                            }`}
                        >
                            {awayTeam!.name}
                        </Link>
                    ) : (
                        <span
                            className={`w-full text-sm sm:text-lg text-center truncate ${
                                awayWon ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                            }`}
                        >
                            {awayTeam?.name || "TBD"}
                            {awayTeam?.deleted_at && (
                                <span className="block text-[10px] text-muted-foreground/50 font-normal normal-case tracking-normal">disbanded</span>
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* Set chips */}
            {isCompleted && sets.length > 0 && (
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
            )}

            {/* LVR row */}
            {isCompleted && (match.home_team_lvr !== null || match.away_team_lvr !== null) && (
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
            )}

            {/* Officials */}
            {(referees.length > 0 || media.length > 0) && (
                <div className="flex flex-wrap items-start gap-x-6 gap-y-2 pt-3 border-t border-border">
                    {referees.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                Refs
                            </span>
                            <div className="flex gap-2 flex-wrap">
                                {referees.map(official => (
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
                    )}
                    {media.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                Media
                            </span>
                            <div className="flex gap-2 flex-wrap">
                                {media.map(official => (
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
                    )}
                </div>
            )}
        </div>
    );
}
