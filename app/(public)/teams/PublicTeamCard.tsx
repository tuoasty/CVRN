import Image from "next/image";
import Link from "next/link";
import { DefaultTeamLogo } from "@/app/components/ui/DefaultTeamLogo";
import AvatarImage from "@/app/components/ui/AvatarImage";
import { getLogoClassName } from "@/app/lib/logoClass";
import { formatStrength, type RankedValue } from "@/app/features/teams/model/strength";
import type { TeamWithRegion } from "@/server/domains/team";

interface PublicTeamCardProps {
    team: TeamWithRegion;
    strength: RankedValue;
    isPriority?: boolean;
}

function teamHref(team: TeamWithRegion): string | null {
    const regionCode = team.seasons?.regions?.code?.toLowerCase();
    const seasonSlug = team.seasons?.slug?.toLowerCase();
    const teamSlug = team.slug?.toLowerCase();
    if (!regionCode || !seasonSlug || !teamSlug) return null;
    return `/${encodeURIComponent(regionCode)}/${encodeURIComponent(seasonSlug)}/teams/${encodeURIComponent(teamSlug)}`;
}

export default function PublicTeamCard({ team, strength, isPriority }: PublicTeamCardProps) {
    const href = teamHref(team);
    const hex = team.brick_color ? team.brick_color.toUpperCase() : null;
    const playerCount = team.playerCount ?? 0;

    const inner = (
        <>
            <div className="relative h-20 w-20 sm:h-28 sm:w-28">
                {team.logo_url ? (
                    <Image
                        src={team.logo_url}
                        alt=""
                        fill
                        sizes="112px"
                        priority={isPriority}
                        className={getLogoClassName(team.logo_bg_removed)}
                    />
                ) : (
                    <DefaultTeamLogo sizes="112px" alt="" />
                )}
            </div>

            <span className="mt-4 max-w-full truncate text-lg font-semibold tracking-tight text-foreground group-hover:underline group-hover:underline-offset-4">
                {team.name}
            </span>

            <span className="mt-1 font-mono text-base tabular-nums text-foreground">
                <span className="sr-only">Strength </span>
                {formatStrength(strength.value)}
            </span>

            <span className="mt-3 flex max-w-full items-center gap-2 text-[13px] text-muted-foreground">
                {team.captain ? (
                    <>
                        <span className="relative h-6 w-6 shrink-0 overflow-hidden">
                            <AvatarImage src={team.captain.avatarUrl} alt="" sizes="24px" />
                        </span>
                        <span className="truncate">{team.captain.displayName}</span>
                    </>
                ) : (
                    "No captain"
                )}
            </span>

            <span className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 text-xs text-muted-foreground">
                <span>
                    <span className="font-mono tabular-nums">{playerCount}</span> {playerCount === 1 ? "player" : "players"}
                </span>
                {hex && (
                    <>
                        <span aria-hidden>·</span>
                        <span className="flex items-center gap-1">
                            <span
                                aria-hidden
                                className="h-2.5 w-2.5 shrink-0 border border-border"
                                style={{ backgroundColor: team.brick_color }}
                            />
                            <span className="font-mono">{hex}</span>
                        </span>
                    </>
                )}
                {team.brick_number != null && (
                    <>
                        <span aria-hidden>·</span>
                        <span className="font-mono tabular-nums">#{team.brick_number}</span>
                    </>
                )}
            </span>
        </>
    );

    const className =
        "group flex min-w-0 flex-col items-center px-2 py-4 text-center transition-colors duration-150 motion-reduce:transition-none";

    if (!href) return <div className={className}>{inner}</div>;

    return (
        <Link
            href={href}
            prefetch={false}
            className={`${className} cursor-pointer hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground`}
        >
            {inner}
        </Link>
    );
}
