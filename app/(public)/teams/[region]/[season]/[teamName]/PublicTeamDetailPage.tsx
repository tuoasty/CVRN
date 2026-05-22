"use client";

import Image from "next/image";
import AvatarImage from "@/app/components/ui/AvatarImage";
import { useRouter } from "next/navigation";
import { useTeamWithPlayers } from "@/app/hooks/useTeams";
import { useTeamNameHistory } from "@/app/hooks/useTeamNameHistory";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLogoClassName } from "@/app/lib/logoClass";
import { PlayerWithRole } from "@/server/domains/player";

const LEADERSHIP_CONFIG = {
    captain:       { label: "Captain",       from: "#9e6bff", to: "#9fc1ff", textColor: "#ffffff" },
    vice_captain:  { label: "Vice Captain",  from: "#aea287", to: "#f1f7ff", textColor: "#2d2416" },
    court_captain: { label: "Court Captain", from: "#907575", to: "#ffcec6", textColor: "#ffffff" },
};

const TEXT_SHADOW = "0 1px 4px rgba(0,0,0,0.95)";

function PublicLeadershipCard({
    role,
    player,
}: {
    role: "captain" | "vice_captain" | "court_captain";
    player: PlayerWithRole | null;
}) {
    const config = LEADERSHIP_CONFIG[role];
    return (
        <div
            className="rounded-md overflow-hidden"
            style={{ border: `1px solid ${config.from}40` }}
        >
            <div className="relative aspect-square w-full">
                {player ? (
                    <>
                        <AvatarImage
                            src={player.avatar_url}
                            alt={player.username || ""}
                            sizes="(max-width: 640px) 34vw, 160px"
                        />
                        <div
                            className="absolute top-1 left-1 text-[7px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-sm leading-none"
                            style={{
                                background: `linear-gradient(to right, ${config.from}, ${config.to})`,
                                color: config.textColor,
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.35)",
                                textShadow: config.textColor === "#ffffff"
                                    ? "-1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5)"
                                    : "0 1px 0 rgba(255,255,255,0.4)",
                            }}
                        >
                            {config.label}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-1.5 pt-6 pb-1.5">
                            <p className="text-white text-[10px] font-semibold truncate leading-tight" style={{ textShadow: TEXT_SHADOW }}>
                                {player.display_name || player.username}
                            </p>
                            <p className="text-white/50 text-[8px] truncate" style={{ textShadow: TEXT_SHADOW }}>
                                @{player.username}
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-muted/30 flex items-center justify-center">
                            <span className="text-2xl text-muted-foreground/20">?</span>
                        </div>
                        <div
                            className="absolute top-1 left-1 text-[7px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-sm leading-none"
                            style={{
                                background: `linear-gradient(to right, ${config.from}, ${config.to})`,
                                color: config.textColor,
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.35)",
                                textShadow: config.textColor === "#ffffff"
                                    ? "-1px -1px 0 rgba(0,0,0,0.5), 1px -1px 0 rgba(0,0,0,0.5), -1px 1px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.5)"
                                    : "0 1px 0 rgba(255,255,255,0.4)",
                            }}
                        >
                            {config.label}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-1.5 pt-6 pb-1.5">
                            <p className="text-white/30 text-[10px] truncate">Vacant</p>
                        </div>
                    </>
                )}
            </div>
            <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${config.from}, ${config.to})` }} />
        </div>
    );
}

function PublicPlayerCard({
    player,
    index,
    teamColor,
}: {
    player: PlayerWithRole;
    index: number;
    teamColor?: string | null;
}) {
    return (
        <div className="col-span-3 sm:col-span-1 rounded-md overflow-hidden border border-border hover:border-primary/50 transition-colors">
            {/* Mobile: horizontal row */}
            <div
                className="flex items-center gap-3 px-3 py-2.5 sm:hidden"
                style={teamColor ? { borderLeft: `3px solid ${teamColor}` } : undefined}
            >
                <div className="relative w-10 h-10 rounded shrink-0 overflow-hidden">
                    <AvatarImage src={player.avatar_url} alt={player.username || ""} sizes="40px" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate leading-tight">{player.display_name || player.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{player.username}</p>
                </div>
                <span className="text-xs text-muted-foreground/60 shrink-0">#{index}</span>
            </div>
            {/* Desktop: square card */}
            <div className="hidden sm:block">
                <div className="relative aspect-square w-full">
                    <AvatarImage
                        src={player.avatar_url}
                        alt={player.username || ""}
                        sizes="160px"
                    />
                    <div
                        className="absolute top-1 right-1 text-white/70 text-[8px] font-semibold"
                        style={{ textShadow: TEXT_SHADOW }}
                    >
                        #{index}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pt-6 pb-1.5">
                        <p className="text-white text-[10px] font-semibold truncate leading-tight" style={{ textShadow: TEXT_SHADOW }}>
                            {player.display_name || player.username}
                        </p>
                        <p className="text-white/60 text-[8px] truncate" style={{ textShadow: TEXT_SHADOW }}>
                            @{player.username}
                        </p>
                    </div>
                </div>
                {teamColor && <div className="h-[3px]" style={{ backgroundColor: teamColor }} />}
            </div>
        </div>
    );
}

function PublicOpenSlotCard({ index }: { index: number }) {
    return (
        <div className="hidden sm:flex sm:col-span-1 rounded-md border border-dashed border-border/40 aspect-square w-full items-center justify-center">
            <span className="text-[9px] text-muted-foreground/25">#{index}</span>
        </div>
    );
}

type Props = {
    regionCode: string;
    seasonSlug: string;
    teamSlug: string;
};

export default function PublicTeamDetailPage({
    regionCode: regionCodeProp,
    seasonSlug: seasonSlugProp,
    teamSlug: teamSlugProp,
}: Props) {
    const router = useRouter();

    const regionCode = safeDecodeURIComponent(regionCodeProp).toLowerCase();
    const seasonSlug = safeDecodeURIComponent(seasonSlugProp).toLowerCase();
    const teamSlug = safeDecodeURIComponent(teamSlugProp).toLowerCase();

    const { team: teamData, players, isLoading: loading, error: displayError } = useTeamWithPlayers(teamSlug, seasonSlug, regionCode);
    const { history } = useTeamNameHistory(teamData?.id ?? null);

    if (loading && !teamData) {
        return (
            <div className="page-wide space-y-6 py-6">
                {/* Header */}
                <div className="pt-2 pb-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="h-8 w-28 rounded-sm" />
                    </div>
                    <div className="flex items-center gap-5">
                        <Skeleton className="w-36 h-36 sm:w-44 sm:h-44 shrink-0 rounded-sm" />
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-52 rounded-sm" />
                            <Skeleton className="h-3 w-32 rounded-sm" />
                            <Skeleton className="h-4 w-44 rounded-sm" />
                            <Skeleton className="h-3 w-28 rounded-sm" />
                        </div>
                    </div>
                </div>
                {/* Roster */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-16 rounded-sm" />
                        <Skeleton className="h-3 w-10 rounded-sm" />
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 sm:gap-3">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="col-span-3 sm:col-span-1 rounded-md overflow-hidden">
                                <Skeleton className="aspect-square w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (displayError) {
        return (
            <div className="page-wide py-6">
                <div className="panel p-6">
                    <p className="text-destructive">{displayError}</p>
                </div>
            </div>
        );
    }

    if (!teamData) {
        return (
            <div className="page-wide py-6">
                <div className="panel p-6">
                    <p className="text-muted-foreground">Team not found</p>
                </div>
            </div>
        );
    }

    const regionName = teamData.seasons?.regions?.name || "Unknown Region";
    const regionCodeDisplay = teamData.seasons?.regions?.code?.toUpperCase() || "??";
    const seasonName = teamData.seasons?.name || "Unknown Season";
    const teamColor = teamData.brick_color || null;

    const captain = players.find((p) => p.role === "captain") || null;
    const viceCaptain = players.find((p) => p.role === "vice_captain") || null;
    const courtCaptain = players.find((p) => p.role === "court_captain") || null;
    const otherPlayers = players.filter(
        (p) => p.role !== "captain" && p.role !== "vice_captain" && p.role !== "court_captain"
    );

    const formerNames = [...history].reverse().map(h => h.oldName);
    const openSlots = Math.max(0, 15 - otherPlayers.length);

    return (
        <div className="page-wide space-y-6 py-6">
            {/* Header */}
            {/* Header */}
            {/* Header */}
            <div className="pt-2 pb-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/teams")}
                        className="rounded-sm -ml-2"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to Teams
                    </Button>
                </div>
                <div className="flex items-center gap-5">
                    {teamData.logo_url && (
                        <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0">
                            <Image
                                src={teamData.logo_url}
                                alt={teamData.name || ""}
                                fill
                                sizes="(max-width: 640px) 144px, 176px"
                                className={getLogoClassName(teamData.logo_bg_removed)}
                            />
                        </div>
                    )}
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">{teamData.name}</h1>
                        <p className={cn("text-xs text-muted-foreground mt-1 truncate", formerNames.length === 0 && "invisible")}>
                            Formerly: {formerNames.join(", ")}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-mono font-semibold">{regionCodeDisplay}</span>
                            {" — "}{regionName}{" / "}{seasonName}
                        </p>
                        {(teamData.brick_number != null || teamData.brick_color) && (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                {teamData.brick_color && (
                                    <span
                                        className="inline-block w-3 h-3 rounded-sm border border-border shrink-0"
                                        style={{ backgroundColor: teamData.brick_color }}
                                    />
                                )}
                                {teamData.brick_number != null && (
                                    <>
                                        <span className="text-muted-foreground/40">·</span>
                                        <span className="font-mono font-semibold">{teamData.brick_number}</span>
                                    </>
                                )}
                                {teamData.brick_color && (
                                    <>
                                        <span className="text-muted-foreground/40">·</span>
                                        <span className="font-mono">{teamData.brick_color.toUpperCase()}</span>
                                    </>
                                )}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Unified roster */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm uppercase tracking-wide text-muted-foreground">Roster</h3>
                    <span className="text-sm text-muted-foreground">{players.length} / 18</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 sm:gap-3">
                    <PublicLeadershipCard role="captain" player={captain} />
                    <PublicLeadershipCard role="vice_captain" player={viceCaptain} />
                    <PublicLeadershipCard role="court_captain" player={courtCaptain} />
                    {otherPlayers.map((player, i) => (
                        <PublicPlayerCard
                            key={player.id}
                            player={player}
                            index={i + 4}
                            teamColor={teamColor}
                        />
                    ))}
                    {Array.from({ length: openSlots }).map((_, i) => (
                        <PublicOpenSlotCard
                            key={`slot-${i}`}
                            index={otherPlayers.length + i + 4}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
