"use client";

import Image from "next/image";
import Link from "next/link";
import {getLogoClassName} from "@/app/lib/logoClass";
import {cn} from "@/lib/utils";
import {PlayerDetail, PlayerAward, PlayerTeamHistoryEntry} from "@/server/domains/player";
import PlayerSeasonStatsTable from "@/app/features/player/PlayerSeasonStatsTable";
import BackButton from "@/app/components/public/BackButton";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import { clientLogger } from "@/app/utils/clientLogger";

const ROLE_LABELS: Record<string, string> = {
    captain: "Captain",
    vice_captain: "Vice Captain",
    court_captain: "Court Captain",
};

const PODIUM_CATEGORIES = new Set(["champion_roster", "runner_up", "third_place"]);

const ACHIEVEMENT_ROW: Record<string, {row: string; hover: string}> = {
    champion_roster: {row: "bg-yellow-500/5", hover: "hover:bg-yellow-500/10"},
    runner_up:       {row: "bg-slate-500/5",  hover: "hover:bg-slate-400/10"},
    third_place:     {row: "bg-amber-600/5",  hover: "hover:bg-amber-600/10"},
};

const AWARD_CATEGORY_STYLE: Record<string, {dot: string; text: string}> = {
    individual_winners: {dot: "bg-yellow-400", text: "text-yellow-500 dark:text-yellow-400"},
    first_team:         {dot: "bg-blue-400",   text: "text-blue-500 dark:text-blue-400"},
};

function formatDate(isoString: string | null): string {
    if (!isoString) return "—";
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {year: "numeric", month: "short", day: "numeric"});
}

function placeLabel(category: string): {text: string; className: string} {
    if (category === "champion_roster") return {text: "1st", className: "font-bold text-yellow-500"};
    if (category === "runner_up") return {text: "2nd", className: "font-bold text-slate-400"};
    if (category === "third_place") return {text: "3rd", className: "font-bold text-amber-600"};
    return {text: "—", className: "text-muted-foreground"};
}

function awardLabel(award: PlayerAward): string {
    if (award.category === "first_team") return `First Team ${award.award_name}`;
    return award.award_name;
}

type Props = {
    detail: PlayerDetail;
};

export default function PlayerDetailPage({detail}: Props) {
    const {player, seasonStats, awards, teamHistory} = detail;
    const team = player.current_team;

    const achievements = awards.filter(a => PODIUM_CATEGORIES.has(a.category));
    const individualAwards = awards.filter(a => !PODIUM_CATEGORIES.has(a.category) && a.category !== "staff_team");

    const teamLogoBySeasonId = new Map(
        teamHistory.map(e => [e.season_id, {logo_url: e.team_logo_url, logo_bg_removed: e.team_logo_bg_removed}])
    );

    return (
        <div className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">
            <BackButton />

            {/* Header */}
            <div
                className="relative rounded-lg overflow-hidden"
                style={team?.team_brick_color ? {
                    background: `linear-gradient(115deg, ${team.team_brick_color}35 0%, ${team.team_brick_color}18 50%, transparent 100%)`,
                } : undefined}
            >
                {/* Mobile: text + logo left, avatar fills right */}
                <div className="sm:hidden flex items-stretch min-h-[148px]">
                    <div className="flex-1 p-4 flex flex-col min-w-0">
                        {team?.team_logo_url && (
                            <div className="relative w-9 h-9 shrink-0">
                                <Image
                                    src={team.team_logo_url}
                                    alt={team.team_name}
                                    fill
                                    sizes="36px"
                                    className={getLogoClassName(team.team_logo_bg_removed)}
                                    unoptimized
                                />
                            </div>
                        )}
                        <div className="mt-auto pt-2">
                            {team && (
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">
                                    {team.team_name}
                                </p>
                            )}
                            <h1 className="text-2xl font-black leading-none tracking-tight">
                                {player.display_name || player.username}
                            </h1>
                            {player.username && (
                                <p className="text-xs text-muted-foreground mt-1">@{player.username}</p>
                            )}
                        </div>
                    </div>
                    {player.avatar_url && (
                        <div className="relative w-[130px] shrink-0">
                            <Image
                                src={player.avatar_url}
                                alt={player.username ?? ""}
                                fill
                                sizes="130px"
                                className="object-contain object-bottom"
                                unoptimized
                            />
                        </div>
                    )}
                </div>

                {/* Desktop: logo + avatar side by side, info to the right */}
                <div className="hidden sm:flex gap-1 p-4 pb-0">
                    {team?.team_logo_url && (
                        <div className="self-start relative shrink-0 w-20 h-20">
                            <Image
                                src={team.team_logo_url}
                                alt={team.team_name}
                                fill
                                sizes="80px"
                                className={getLogoClassName(team.team_logo_bg_removed)}
                                unoptimized
                            />
                        </div>
                    )}
                    <div className="self-end relative shrink-0 w-[200px] h-[200px]">
                        {player.avatar_url && (
                            <Image
                                src={player.avatar_url}
                                alt={player.username ?? ""}
                                fill
                                sizes="200px"
                                className="object-contain object-bottom"
                                unoptimized
                            />
                        )}
                    </div>
                    <div className="self-center flex flex-col gap-0.5 pl-8 min-w-0 flex-1">
                        {team && (
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                                {team.team_name}
                            </p>
                        )}
                        <h1 className="text-4xl lg:text-5xl font-black leading-none tracking-tight truncate">
                            {player.display_name || player.username}
                        </h1>
                        {player.username && (
                            <p className="text-sm text-muted-foreground mt-2">@{player.username}</p>
                        )}
                    </div>
                </div>

                {team?.team_brick_color && (
                    <div
                        className="mt-2 h-px w-full"
                        style={{background: `linear-gradient(to right, ${team.team_brick_color}80, transparent)`}}
                    />
                )}
            </div>

            <PlayerSeasonStatsTable rows={seasonStats} teamLogoBySeasonId={teamLogoBySeasonId} />

            {(() => {
                const hasSideContent = achievements.length > 0 || individualAwards.length > 0;

                // No achievements/awards: render Team History on its own at full width,
                // with the two leagues side by side (avoids a dead left column).
                if (!hasSideContent) {
                    return teamHistory.length > 0 ? (
                        <TeamHistorySection teamHistory={teamHistory} layout="grid" />
                    ) : null;
                }

                return (
                    <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2 items-start">
                        {/* Left: achievements + awards */}
                        <div className="space-y-8">
                            {achievements.length > 0 && (
                                <AwardSection title="Achievements">
                                    <div className="sm:hidden divide-y divide-border">
                                        {achievements.map(a => (
                                            <AchievementCard key={a.id} award={a} />
                                        ))}
                                    </div>
                                    <DesktopAwardTable valueHeader="Place">
                                        {achievements.map(a => (
                                            <AchievementRow key={a.id} award={a} />
                                        ))}
                                    </DesktopAwardTable>
                                </AwardSection>
                            )}

                            {individualAwards.length > 0 && (
                                <AwardSection title="Awards">
                                    <div className="sm:hidden divide-y divide-border">
                                        {individualAwards.map(a => (
                                            <AwardCard key={a.id} award={a} />
                                        ))}
                                    </div>
                                    <DesktopAwardTable valueHeader="Award">
                                        {individualAwards.map(a => (
                                            <AwardRow key={a.id} award={a} />
                                        ))}
                                    </DesktopAwardTable>
                                </AwardSection>
                            )}
                        </div>

                        {/* Right: team history (main over side) */}
                        {teamHistory.length > 0 && (
                            <TeamHistorySection teamHistory={teamHistory} layout="stacked" />
                        )}
                    </div>
                );
            })()}
        </div>
    );
}

function AwardSection({title, children}: {title: string; children: React.ReactNode}) {
    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="panel overflow-hidden">{children}</div>
        </div>
    );
}

function DesktopAwardTable({valueHeader, children}: {valueHeader: string; children: React.ReactNode}) {
    return (
        <div className="hidden sm:block overflow-x-auto">
            <table className="w-full table-fixed text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/40">
                        <th className="w-[22%] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                        <th className="w-[36%] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Season</th>
                        <th className="w-[32%] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{valueHeader}</th>
                        <th className="w-[10%] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">{children}</tbody>
            </table>
        </div>
    );
}

function TeamHistorySection({teamHistory, layout}: {teamHistory: PlayerTeamHistoryEntry[]; layout: "stacked" | "grid"}) {
    const leagueColumns = [
        {label: "Main League", entries: teamHistory.filter(t => t.league_type === "main")},
        {label: "Side Leagues", entries: teamHistory.filter(t => t.league_type === "side")},
    ].filter(col => col.entries.length > 0);

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold">Team History</h2>
            <div
                className={cn(
                    "grid grid-cols-1",
                    layout === "grid" ? "gap-4 lg:grid-cols-2 items-start" : "gap-8"
                )}
            >
                {leagueColumns.map(col => (
                    <LeagueColumn key={col.label} label={col.label} entries={col.entries} />
                ))}
            </div>
        </div>
    );
}

function TeamLogoLink({award}: {award: PlayerAward}) {
    const href = !award.team_disbanded ? buildPublicTeamHref({
        regionCode: award.region_code,
        seasonSlug: award.season_slug,
        teamSlug: award.team_slug,
    }) : null;
    if (!award.team_logo_url) return <span className="text-muted-foreground">—</span>;
    const logo = (
        <div className="relative w-9 h-9 shrink-0 overflow-hidden">
            <Image
                src={award.team_logo_url}
                alt={award.team_name ?? ""}
                fill
                sizes="36px"
                className={getLogoClassName(award.team_logo_bg_removed)}
                unoptimized
            />
        </div>
    );
    if (!href) return logo;
    return (
        <Link href={href} className="block w-9 h-9 overflow-hidden hover:opacity-70 transition-opacity">
            <div className="relative w-full h-full">
                <Image
                    src={award.team_logo_url}
                    alt={award.team_name ?? ""}
                    fill
                    sizes="36px"
                    className={getLogoClassName(award.team_logo_bg_removed)}
                    unoptimized
                />
            </div>
        </Link>
    );
}

function AchievementRow({award}: {award: PlayerAward}) {
    const place = placeLabel(award.category);
    const rowStyle = ACHIEVEMENT_ROW[award.category] ?? {row: "", hover: "hover:bg-muted/20"};
    return (
        <tr className={cn("transition-colors", rowStyle.row, rowStyle.hover)}>
            <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDate(award.awarded_at)}</td>
            <td className="px-4 py-3 text-muted-foreground">{award.region_code} · {award.season_name}</td>
            <td className="px-4 py-3">
                <span className={place.className}>{place.text}</span>
            </td>
            <td className="px-4 py-3">
                <TeamLogoLink award={award} />
            </td>
        </tr>
    );
}

function AwardRow({award}: {award: PlayerAward}) {
    const style = AWARD_CATEGORY_STYLE[award.category] ?? {dot: "bg-muted-foreground", text: ""};
    return (
        <tr className="hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDate(award.awarded_at)}</td>
            <td className="px-4 py-3 text-muted-foreground">{award.region_code} · {award.season_name}</td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", style.dot)} />
                    <span className={cn("font-medium", style.text)}>{awardLabel(award)}</span>
                </div>
            </td>
            <td className="px-4 py-3">
                <TeamLogoLink award={award} />
            </td>
        </tr>
    );
}

function AchievementCard({award}: {award: PlayerAward}) {
    const place = placeLabel(award.category);
    const rowStyle = ACHIEVEMENT_ROW[award.category] ?? {row: "", hover: "hover:bg-muted/20"};
    return (
        <div className={cn("flex items-center gap-3 px-4 py-3 transition-colors", rowStyle.row, rowStyle.hover)}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", place.className)}>{place.text}</span>
                    <span className="text-sm text-muted-foreground truncate">{award.region_code} · {award.season_name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{formatDate(award.awarded_at)}</p>
            </div>
            <TeamLogoLink award={award} />
        </div>
    );
}

function AwardCard({award}: {award: PlayerAward}) {
    const style = AWARD_CATEGORY_STYLE[award.category] ?? {dot: "bg-muted-foreground", text: ""};
    return (
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", style.dot)} />
                    <span className={cn("text-sm font-medium truncate", style.text)}>{awardLabel(award)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{award.region_code} · {award.season_name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatDate(award.awarded_at)}</p>
            </div>
            <TeamLogoLink award={award} />
        </div>
    );
}

function LeagueColumn({label, entries}: {label: string; entries: PlayerTeamHistoryEntry[]}) {
    return (
        <div className="panel overflow-hidden self-start">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                </h3>
            </div>
            <div className="divide-y divide-border">
                {entries.map((entry, i) => (
                    <TeamHistoryRow key={`${entry.team_id}-${entry.season_id}-${i}`} entry={entry} />
                ))}
            </div>
        </div>
    );
}

function TeamHistoryRow({entry}: {entry: PlayerTeamHistoryEntry}) {
    const roleLabel = entry.role !== "player" ? ROLE_LABELS[entry.role] : null;
    const seasonEnded = entry.season_end_date ? new Date(entry.season_end_date) < new Date() : false;
    const isActive = !entry.left_at && !seasonEnded;
    const teamHref = !entry.team_disbanded ? buildPublicTeamHref({
        regionCode: entry.region_code,
        seasonSlug: entry.season_slug,
        teamSlug: entry.team_slug,
    }) : null;
    const inner = (
        <div className="flex items-center gap-3 px-4 py-3">
            <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{backgroundColor: entry.team_brick_color ?? "hsl(var(--border))"}}
            />
            {entry.team_logo_url && (
                <div className="relative w-9 h-9 overflow-hidden shrink-0">
                    <Image
                        src={entry.team_logo_url}
                        alt={entry.team_name}
                        fill
                        sizes="36px"
                        className={getLogoClassName(entry.team_logo_bg_removed)}
                        unoptimized
                    />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                        {entry.team_name}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                        {isActive && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm">
                                Active
                            </span>
                        )}
                        {roleLabel && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded-sm text-muted-foreground">
                                {roleLabel}
                            </span>
                        )}
                    </div>
                </div>

                <p className="text-xs text-muted-foreground">
                    {entry.region_code} · {entry.season_name}
                </p>
            </div>
        </div>
    );
    if (teamHref) {
        return (
            <Link href={teamHref} className="block hover:bg-muted/30 transition-colors">
                {inner}
            </Link>
        );
    }
    return inner;
}
