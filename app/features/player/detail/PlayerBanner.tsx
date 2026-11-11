import Image from "next/image";
import Link from "next/link";
import type {ReactNode} from "react";
import {DefaultTeamLogo} from "@/app/components/ui/DefaultTeamLogo";
import {specStarClass} from "@/app/features/information/specs/Stars";
import {getLogoClassName} from "@/app/lib/logoClass";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import {cn} from "@/lib/utils";
import type {PlayerDetail, PlayerSpecEntry, PlayerTeamHistoryEntry} from "@/server/domains/player";
import {positionLabel} from "@/shared/volleyball/positions";
import {TeamLogo} from "./TeamLogoLink";

function ActiveSpecLine({spec}: {spec: PlayerSpecEntry}) {
    return (
        <p className="mt-2 text-sm font-semibold text-foreground">
            {spec.spec_name}
            <span className={cn("ml-1.5 font-mono text-xs tabular-nums", specStarClass(spec.stars))}>{spec.stars}★</span>
            {spec.dropped && <span className="ml-1.5 text-xs font-normal text-muted-foreground">dropped</span>}
        </p>
    );
}

function ActiveTeamsLine({teams}: {teams: PlayerTeamHistoryEntry[]}) {
    if (teams.length === 0) return null;
    return (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {teams.map(team => {
                const href = team.team_disbanded ? null : buildPublicTeamHref({
                    regionCode: team.region_code,
                    seasonSlug: team.season_slug,
                    teamSlug: team.team_slug,
                });
                const body = (
                    <>
                        <TeamLogo team={team} size={20} />
                        <span className="truncate">{team.team_name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{team.region_code}</span>
                    </>
                );
                const key = `${team.team_id}-${team.season_id}`;
                return href ? (
                    <Link key={key} href={href} prefetch={false} className="flex min-w-0 items-center gap-1.5 text-foreground hover:underline hover:underline-offset-4">{body}</Link>
                ) : (
                    <span key={key} className="flex min-w-0 items-center gap-1.5 text-foreground">{body}</span>
                );
            })}
        </div>
    );
}

function Identity({player, activeSpec, activeTeams}: {
    player: PlayerDetail["player"];
    activeSpec: PlayerSpecEntry | null;
    activeTeams: PlayerTeamHistoryEntry[];
}) {
    const meta = [
        player.username ? <span key="u">@{player.username}</span> : null,
        player.current_position ? (
            <span key="p" title={positionLabel(player.current_position)} className="font-mono">{player.current_position}</span>
        ) : null,
    ].filter(Boolean);

    return (
        <>
            <h1 className="break-words text-3xl font-semibold leading-none tracking-[-0.025em] text-foreground sm:text-4xl">
                {player.display_name || player.username}
            </h1>
            {meta.length > 0 && (
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
                    {meta.map((node, i) => (
                        <span key={i} className="flex items-center gap-x-1.5">
                            {i > 0 && <span aria-hidden>·</span>}
                            {node}
                        </span>
                    ))}
                </p>
            )}
            <ActiveTeamsLine teams={activeTeams} />
            {activeSpec && <ActiveSpecLine spec={activeSpec} />}
        </>
    );
}

function CurrentTeamLogo({team, size}: {team: NonNullable<PlayerDetail["player"]["current_team"]>; size: number}) {
    return (
        <div className="relative shrink-0" style={{width: size, height: size}}>
            {team.team_logo_url ? (
                <Image
                    src={team.team_logo_url}
                    alt={team.team_name}
                    fill
                    sizes={`${size}px`}
                    className={getLogoClassName(team.team_logo_bg_removed)}
                    unoptimized
                />
            ) : (
                <DefaultTeamLogo sizes={`${size}px`} alt={team.team_name} />
            )}
        </div>
    );
}

export function PlayerBanner({player, activeSpec, activeTeams, top}: {
    player: PlayerDetail["player"];
    activeSpec: PlayerSpecEntry | null;
    activeTeams: PlayerTeamHistoryEntry[];
    top?: ReactNode;
}) {
    const team = player.current_team;
    return (
        <header
            className="relative"
            style={team?.team_brick_color ? {
                background: `linear-gradient(115deg, ${team.team_brick_color}35 0%, ${team.team_brick_color}18 50%, transparent 100%)`,
            } : undefined}
        >
            <div className="page-wide">
            {top && <div className="pt-3">{top}</div>}
            <div className="flex min-h-[148px] items-stretch sm:hidden">
                <div className="flex min-w-0 flex-1 flex-col py-4">
                    {team && <CurrentTeamLogo team={team} size={36} />}
                    <div className="mt-auto pt-3">
                        <Identity player={player} activeSpec={activeSpec} activeTeams={activeTeams} />
                    </div>
                </div>
                {player.avatar_url && (
                    <div className="relative w-[120px] shrink-0">
                        <Image
                            src={player.avatar_url}
                            alt=""
                            fill
                            sizes="120px"
                            className="object-contain object-bottom"
                            unoptimized
                        />
                    </div>
                )}
            </div>

            <div className="hidden gap-1 pt-2 sm:flex">
                {team && (
                    <div className="self-start">
                        <CurrentTeamLogo team={team} size={80} />
                    </div>
                )}
                <div className="relative h-[200px] w-[200px] shrink-0 self-end">
                    {player.avatar_url && (
                        <Image
                            src={player.avatar_url}
                            alt=""
                            fill
                            sizes="200px"
                            className="object-contain object-bottom"
                            unoptimized
                        />
                    )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col self-center pl-8">
                    <Identity player={player} activeSpec={activeSpec} activeTeams={activeTeams} />
                </div>
            </div>
            </div>
        </header>
    );
}
