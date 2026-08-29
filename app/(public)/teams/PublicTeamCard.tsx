"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { TeamWithRegion } from "@/server/domains/team";
import { getBrickDisplayColor } from "@/app/lib/brickColor";
import { getLogoClassName } from "@/app/lib/logoClass";

interface PublicTeamCardProps {
    team: TeamWithRegion;
    isPriority?: boolean;
}

function getInitials(name: string | null | undefined): string {
    if (!name) return "??";
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export default function PublicTeamCard({ team, isPriority }: PublicTeamCardProps) {
    const { resolvedTheme } = useTheme();

    const regionCode = team.seasons?.regions?.code?.toLowerCase();
    const seasonSlug = team.seasons?.slug?.toLowerCase();
    const teamSlug = team.slug?.toLowerCase();

    const canNavigate = !!regionCode && !!seasonSlug && !!teamSlug;
    const brickColor = getBrickDisplayColor(team.brick_color, resolvedTheme === "dark");

    const href = canNavigate
        ? `/${encodeURIComponent(regionCode!)}/${encodeURIComponent(seasonSlug!)}/teams/${encodeURIComponent(teamSlug!)}`
        : null;

    const cardClasses = `group flex flex-col overflow-hidden panel transition-[border-color,box-shadow,transform] duration-150 motion-reduce:transition-none ${
        canNavigate
            ? "cursor-pointer hover:border-primary hover:shadow-sm hover:-translate-y-px motion-reduce:hover:translate-y-0"
            : "opacity-60"
    }`;

    const inner = (
        <>
            <div className="flex items-center gap-2 px-3.5 py-3 border-b border-border">
                <span className="text-sm font-semibold tracking-tight truncate min-w-0 flex-1">
                    {team.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {team.playerCount ?? 0} players
                </span>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[208px] bg-card">
                {team.logo_url ? (
                    <div className="relative w-[108px] h-[108px]" suppressHydrationWarning>
                        <Image
                            src={team.logo_url}
                            alt={team.name || "Team"}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            priority={isPriority}
                            className={getLogoClassName(team.logo_bg_removed)}
                        />
                    </div>
                ) : (
                    <div className="w-[108px] h-[108px] rounded-sm border border-border bg-muted flex items-center justify-center">
                        <span className="text-3xl font-extrabold uppercase tracking-wide text-muted-foreground">
                            {getInitials(team.name)}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-border">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {team.captain ? (
                        <>
                            {team.captain.avatarUrl ? (
                                <Image
                                    src={team.captain.avatarUrl}
                                    alt={team.captain.displayName ?? "Captain"}
                                    width={18}
                                    height={18}
                                    sizes="18px"
                                    className="rounded-full object-cover shrink-0"
                                    unoptimized
                                />
                            ) : (
                                <div
                                    className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center"
                                    style={{ backgroundColor: brickColor ?? "hsl(var(--muted-foreground))" }}
                                    suppressHydrationWarning
                                >
                                    <span className="text-xs font-bold uppercase leading-none text-white">
                                        {team.captain.displayName?.slice(0, 1) ?? "?"}
                                    </span>
                                </div>
                            )}
                            <span className="text-xs text-muted-foreground truncate min-w-0">
                                {team.captain.displayName}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground">No captain</span>
                    )}
                </div>

                {team.brick_number != null && (
                    <span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded-sm shrink-0 tabular-nums font-mono"
                        style={
                            brickColor
                                ? {
                                      backgroundColor: `${brickColor}20`,
                                      color: brickColor,
                                      border: `1px solid ${brickColor}40`,
                                  }
                                : undefined
                        }
                        suppressHydrationWarning
                    >
                        <span className={brickColor ? "" : "text-muted-foreground"}>#{team.brick_number}</span>
                    </span>
                )}
            </div>
        </>
    );

    if (href) {
        return (
            <Link href={href} prefetch={false} className={cardClasses}>
                {inner}
            </Link>
        );
    }

    return <div className={cardClasses}>{inner}</div>;
}
