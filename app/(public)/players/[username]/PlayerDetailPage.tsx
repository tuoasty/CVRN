"use client";

import Image from "next/image";
import {getLogoClassName} from "@/app/lib/logoClass";
import {cn} from "@/lib/utils";
import {PlayerDetail, PlayerAward, PlayerTeamHistoryEntry} from "@/server/domains/player";
import PlayerSeasonStatsTable from "@/app/features/player/PlayerSeasonStatsTable";
import BackButton from "@/app/components/public/BackButton";

const ROLE_LABELS: Record<string, string> = {
    captain: "Captain",
    vice_captain: "Vice Captain",
    court_captain: "Court Captain",
};

const CATEGORY_DOT: Record<string, string> = {
    individual_winners: "bg-yellow-400",
    first_team: "bg-blue-400",
    champion_roster: "bg-green-400",
    runner_up: "bg-slate-400",
    third_place: "bg-amber-600",
};

const PODIUM_CATEGORIES = new Set(["champion_roster", "runner_up", "third_place"]);

function awardLabel(award: PlayerAward): string {
    const team = award.team_name ? `${award.team_name} · ` : "";
    if (award.category === "champion_roster") return `CHAMPION · ${team}${award.season_name}`;
    if (award.category === "runner_up") return `RUNNER UP · ${team}${award.season_name}`;
    if (award.category === "third_place") return `THIRD PLACE · ${team}${award.season_name}`;
    if (award.category === "first_team") return `First Team ${award.award_name}`;
    return award.award_name;
}

type Props = {
    detail: PlayerDetail;
};

export default function PlayerDetailPage({detail}: Props) {
    const {player, seasonStats, awards, teamHistory} = detail;
    const team = player.current_team;

    return (
        <div className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">
            <BackButton />

            {/* Header */}
            <div className="flex gap-6 items-start">
                {/* Full-body avatar */}
                <div className="relative shrink-0 w-[180px] h-[240px] rounded-md overflow-hidden bg-muted border border-border">
                    {player.full_avatar_url ? (
                        <Image
                            src={player.full_avatar_url}
                            alt={player.username ?? ""}
                            fill
                            sizes="180px"
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="absolute inset-0 bg-muted/50" />
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1 pt-1 min-w-0">
                    {/* Region tag */}
                    {team && (
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                            {team.region_code} · {team.season_name}
                        </p>
                    )}

                    {/* Display name */}
                    <h1 className="text-2xl font-bold leading-tight truncate">
                        {player.display_name || player.username}
                    </h1>

                    {/* Username */}
                    {player.username && (
                        <p className="text-sm text-muted-foreground">@{player.username}</p>
                    )}

                    {/* Current team — with brick color accent */}
                    {team && (
                        <div
                            className="flex items-center gap-3 mt-3 px-3 py-2 rounded-md border border-border w-fit"
                            style={team.team_brick_color ? {borderLeftColor: team.team_brick_color, borderLeftWidth: 3} : {}}
                        >
                            {team.team_logo_url && (
                                <div className="relative w-9 h-9 rounded-sm overflow-hidden shrink-0">
                                    <Image
                                        src={team.team_logo_url}
                                        alt={team.team_name}
                                        fill
                                        sizes="36px"
                                        className={cn("object-contain", getLogoClassName(team.team_logo_bg_removed))}
                                        unoptimized
                                    />
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-semibold leading-tight">{team.team_name}</p>
                                <p className="text-xs text-muted-foreground">{team.region_code} · {team.season_name}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Season Stats */}
            <PlayerSeasonStatsTable rows={seasonStats} />

            {/* Awards */}
            {awards.filter(a => a.category !== "staff_team").length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Awards &amp; Championships</h2>
                    <div className="panel divide-y divide-border">
                        {awards.filter(a => a.category !== "staff_team").map(award => (
                            <AwardRow key={award.id} award={award} />
                        ))}
                    </div>
                </div>
            )}

            {/* Team History */}
            {teamHistory.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Team History</h2>
                    <div className="panel divide-y divide-border">
                        {teamHistory.map((entry, i) => (
                            <TeamHistoryRow key={`${entry.team_id}-${entry.season_id}-${i}`} entry={entry} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function AwardRow({award}: {award: PlayerAward}) {
    const dotClass = CATEGORY_DOT[award.category] ?? "bg-muted-foreground";
    const isPodium = PODIUM_CATEGORIES.has(award.category);
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotClass)} />
            <span className={cn("flex-1 font-medium", isPodium ? "text-base" : "text-sm")}>
                {awardLabel(award)}
            </span>
            {!isPodium && (
                <span className="text-xs text-muted-foreground shrink-0 px-2 py-0.5 bg-muted rounded-sm">
                    {award.region_code} · {award.season_name}
                </span>
            )}
        </div>
    );
}

function TeamHistoryRow({entry}: {entry: PlayerTeamHistoryEntry}) {
    const roleLabel = entry.role !== "player" ? ROLE_LABELS[entry.role] : null;
    const isActive = !entry.left_at;
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            {/* Color bar */}
            <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{backgroundColor: entry.team_brick_color ?? "hsl(var(--border))"}}
            />
            {/* Logo */}
            {entry.team_logo_url && (
                <div className="relative w-7 h-7 rounded-sm overflow-hidden shrink-0">
                    <Image
                        src={entry.team_logo_url}
                        alt={entry.team_name}
                        fill
                        sizes="28px"
                        className={cn("object-contain", getLogoClassName(entry.team_logo_bg_removed))}
                        unoptimized
                    />
                </div>
            )}
            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{entry.team_name}</span>
                    {roleLabel && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded-sm text-muted-foreground">
                            {roleLabel}
                        </span>
                    )}
                    {isActive && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm">
                            Active
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">{entry.region_code} · {entry.season_name}</p>
            </div>
            {/* Season badge */}
            <span className="text-xs text-muted-foreground shrink-0 px-2 py-0.5 bg-muted rounded-sm">
                {entry.season_name}
            </span>
        </div>
    );
}
