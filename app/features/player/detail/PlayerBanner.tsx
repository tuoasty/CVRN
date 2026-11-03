import Image from "next/image";
import Link from "next/link";
import {DefaultTeamLogo} from "@/app/components/ui/DefaultTeamLogo";
import {getLogoClassName} from "@/app/lib/logoClass";
import {buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import type {PlayerDetail, PlayerSpecEntry, PlayerTeamHistoryEntry} from "@/server/domains/player";
import {positionLabel} from "@/shared/volleyball/positions";
import {TeamLogo} from "./TeamLogoLink";

function ActiveSpecLine({spec}: {spec: PlayerSpecEntry}) {
    return (
        <p className="mt-1.5 text-xs sm:text-sm font-bold uppercase tracking-wide">
            {spec.spec_name}
            <span className="text-secondary font-mono ml-1.5 tabular-nums">{spec.stars}★</span>
            {spec.dropped && (
                <span className="italic font-normal normal-case text-muted-foreground ml-1.5">dropped</span>
            )}
        </p>
    );
}

function OtherTeamsLine({teams}: {teams: PlayerTeamHistoryEntry[]}) {
    if (teams.length === 0) return null;
    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
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
                        <span className="text-muted-foreground">{team.region_code}</span>
                    </>
                );
                const key = `${team.team_id}-${team.season_id}`;
                return href ? (
                    <Link key={key} href={href} prefetch={false} className="flex min-w-0 items-center gap-1.5 hover:underline">{body}</Link>
                ) : (
                    <span key={key} className="flex min-w-0 items-center gap-1.5">{body}</span>
                );
            })}
        </div>
    );
}

export function PlayerBanner({player, activeSpec, otherTeams}: {
    player: PlayerDetail["player"];
    activeSpec: PlayerSpecEntry | null;
    otherTeams: PlayerTeamHistoryEntry[];
}) {
    const team = player.current_team;
    return (
        <div
            className="relative rounded-lg overflow-hidden"
            style={team?.team_brick_color ? {
                background: `linear-gradient(115deg, ${team.team_brick_color}35 0%, ${team.team_brick_color}18 50%, transparent 100%)`,
            } : undefined}
        >
            <div className="sm:hidden flex items-stretch min-h-[148px]">
                <div className="flex-1 p-4 flex flex-col min-w-0">
                    {team && (
                        <div className="relative w-9 h-9 shrink-0">
                            {team?.team_logo_url ? (
                                <Image
                                    src={team.team_logo_url}
                                    alt={team.team_name}
                                    fill
                                    sizes="36px"
                                    className={getLogoClassName(team.team_logo_bg_removed)}
                                    unoptimized
                                />
                            ) : (
                                <DefaultTeamLogo sizes="36px" alt={team.team_name} />
                            )}
                        </div>
                    )}
                    <div className="mt-auto pt-2">
                        {team && (
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">
                                {team.team_name}
                                {player.current_position && (
                                    <span>
                                        <span className="text-muted-foreground/30 mx-1">·</span>
                                        <span title={positionLabel(player.current_position)} className="text-foreground/85">{player.current_position}</span>
                                    </span>
                                )}
                            </p>
                        )}
                        <h1 className="text-2xl font-black leading-none tracking-tight">
                            {player.display_name || player.username}
                        </h1>
                        {player.username && (
                            <p className="text-xs text-muted-foreground mt-1">@{player.username}</p>
                        )}
                        <OtherTeamsLine teams={otherTeams} />
                        {activeSpec && <ActiveSpecLine spec={activeSpec} />}
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

            <div className="hidden sm:flex gap-1 p-4 pb-0">
                {team && (
                    <div className="self-start relative shrink-0 w-20 h-20">
                        {team?.team_logo_url ? (
                            <Image
                                src={team.team_logo_url}
                                alt={team.team_name}
                                fill
                                sizes="80px"
                                className={getLogoClassName(team.team_logo_bg_removed)}
                                unoptimized
                            />
                        ) : (
                            <DefaultTeamLogo sizes="80px" alt={team.team_name} />
                        )}
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
                            {player.current_position && (
                                <span>
                                    <span className="text-muted-foreground/30 mx-1">·</span>
                                    <span title={positionLabel(player.current_position)} className="text-foreground/85">{player.current_position}</span>
                                </span>
                            )}
                        </p>
                    )}
                    <h1 className="text-4xl lg:text-5xl font-black leading-none tracking-tight truncate">
                        {player.display_name || player.username}
                    </h1>
                    {player.username && (
                        <p className="text-sm text-muted-foreground mt-2">@{player.username}</p>
                    )}
                    <OtherTeamsLine teams={otherTeams} />
                    {activeSpec && <ActiveSpecLine spec={activeSpec} />}
                </div>
            </div>

            {team?.team_brick_color && (
                <div
                    className="mt-2 h-px w-full"
                    style={{background: `linear-gradient(to right, ${team.team_brick_color}80, transparent)`}}
                />
            )}
        </div>
    );
}
