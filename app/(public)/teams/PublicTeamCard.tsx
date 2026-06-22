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

export default function PublicTeamCard({ team, isPriority }: PublicTeamCardProps) {
    const { resolvedTheme } = useTheme();

    const regionCode = team.seasons?.regions?.code?.toLowerCase();
    const seasonSlug = team.seasons?.slug?.toLowerCase();
    const teamSlug = team.slug?.toLowerCase();

    const canNavigate = !!regionCode && !!seasonSlug && !!teamSlug;
    const brickColor = getBrickDisplayColor(team.brick_color, resolvedTheme === "dark");

    const hasMeta = team.captain != null || (team.playerCount ?? 0) > 0;

    const href = canNavigate
        ? `/${encodeURIComponent(regionCode!)}/${encodeURIComponent(seasonSlug!)}/teams/${encodeURIComponent(teamSlug!)}`
        : null;

    const cardClasses = `group flex flex-col overflow-hidden rounded-sm border border-border bg-card transition-all duration-150 ${
        canNavigate ? "cursor-pointer hover:border-primary/40 hover:shadow-md" : "opacity-60"
    }`;

    const inner = (
        <>
            {/* Hero area */}
            <div
                className="relative flex items-center justify-center h-36"
                style={{ backgroundColor: brickColor ? `${brickColor}18` : undefined }}
                suppressHydrationWarning
            >
                {brickColor && (
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: brickColor }}
                        suppressHydrationWarning
                    />
                )}

                {team.logo_url ? (
                    <div className="relative w-28 h-24" suppressHydrationWarning>
                        <Image
                            src={team.logo_url}
                            alt={team.name || "Team"}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            priority={isPriority}
                            className={getLogoClassName(team.logo_bg_removed)}
                        />
                    </div>
                ) : (
                    <div
                        className="w-20 h-20 rounded-sm border border-border flex items-center justify-center"
                        style={{ backgroundColor: brickColor ? `${brickColor}30` : undefined }}
                        suppressHydrationWarning
                    >
                        <span
                            className="text-2xl font-bold uppercase"
                            style={{ color: brickColor ?? undefined }}
                            suppressHydrationWarning
                        >
                            {team.name?.slice(0, 2) || "??"}
                        </span>
                    </div>
                )}
            </div>

            {/* Info area */}
            <div className="border-t border-border">
                {/* Name + brick number */}
                <div className={`flex items-center justify-between gap-2 px-3 ${hasMeta ? "pt-2.5 pb-1.5" : "py-2.5"}`}>
                    <span className="text-sm font-bold truncate min-w-0 leading-tight">
                        {team.name}
                    </span>
                    {team.brick_number && brickColor && (
                        <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm shrink-0 tabular-nums"
                            style={{
                                backgroundColor: `${brickColor}20`,
                                color: brickColor,
                                border: `1px solid ${brickColor}40`,
                            }}
                            suppressHydrationWarning
                        >
                            #{team.brick_number}
                        </span>
                    )}
                </div>

                {/* Captain + player count */}
                {hasMeta && (
                    <div className="flex items-center gap-1.5 px-3 pb-2.5 min-w-0">
                        {team.captain && (
                            <>
                                {team.captain.avatarUrl ? (
                                    <Image
                                        src={team.captain.avatarUrl}
                                        alt={team.captain.displayName ?? "Captain"}
                                        width={16}
                                        height={16}
                                        sizes="16px"
                                        className="rounded-full object-cover shrink-0"
                                        unoptimized
                                    />
                                ) : (
                                    <div
                                        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                                        style={{ backgroundColor: brickColor ? `${brickColor}30` : "hsl(var(--muted))" }}
                                        suppressHydrationWarning
                                    >
                                        <span
                                            className="text-[8px] font-bold uppercase leading-none"
                                            style={{ color: brickColor ?? "hsl(var(--muted-foreground))" }}
                                            suppressHydrationWarning
                                        >
                                            {team.captain.displayName?.slice(0, 1) ?? "?"}
                                        </span>
                                    </div>
                                )}
                                <span className="text-[10px] text-muted-foreground truncate min-w-0">
                                    {team.captain.displayName}
                                </span>
                            </>
                        )}

                        {team.captain && (team.playerCount ?? 0) > 0 && (
                            <span className="text-[10px] text-muted-foreground/40 shrink-0">·</span>
                        )}

                        {(team.playerCount ?? 0) > 0 && (
                            <span className="text-[10px] text-muted-foreground/70 shrink-0">
                                {team.playerCount} players
                            </span>
                        )}
                    </div>
                )}
            </div>
        </>
    );

    if (href) {
        return (
            <Link href={href} className={cardClasses}>
                {inner}
            </Link>
        );
    }

    return (
        <div className={cardClasses}>
            {inner}
        </div>
    );
}
