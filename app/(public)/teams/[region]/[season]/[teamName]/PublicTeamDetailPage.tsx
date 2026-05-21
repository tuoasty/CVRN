"use client";

import Image from "next/image";
import AvatarImage from "@/app/components/ui/AvatarImage";
import { useRouter } from "next/navigation";
import { useTeamWithPlayers } from "@/app/hooks/useTeams";
import { useTeamNameHistory } from "@/app/hooks/useTeamNameHistory";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import { Button } from "@/app/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getLogoClassName } from "@/app/lib/logoClass";
import { PlayerWithRole } from "@/server/domains/player";

const LEADERSHIP_CONFIG = {
    captain:       { label: "Captain",       from: "#9e6bff", to: "#9fc1ff" },
    vice_captain:  { label: "Vice Captain",  from: "#aea287", to: "#f1f7ff" },
    court_captain: { label: "Court Captain", from: "#907575", to: "#ffcec6" },
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
                            className="absolute top-1 left-1 bg-black/70 text-[7px] uppercase tracking-widest font-bold px-1 py-0.5 rounded-sm leading-none"
                            style={{ color: config.from }}
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
                            className="absolute top-1 left-1 bg-black/70 text-[7px] uppercase tracking-widest font-bold px-1 py-0.5 rounded-sm leading-none"
                            style={{ color: config.from }}
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
            <div className="page-wide py-6">
                <div className="panel p-6">
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-muted-foreground">Loading team...</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
                <div>
                    <div className="flex items-center gap-2 mb-2">
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
                    <h1>{teamData.name}</h1>
                    {formerNames.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Formerly: {formerNames.join(", ")}
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-mono font-semibold">{regionCodeDisplay}</span>
                        {" - "}{regionName}{" / "}{seasonName}
                    </p>
                </div>
            </div>

            {/* Team info */}
            <div className="panel p-4 sm:p-6">
                <div className="flex items-start gap-4">
                    {teamData.logo_url && (
                        <div className="relative w-16 h-16 sm:w-32 sm:h-32 shrink-0 rounded-sm border border-border/50 overflow-hidden bg-muted/40">
                            <Image
                                src={teamData.logo_url}
                                alt={teamData.name || ""}
                                fill
                                sizes="(max-width: 640px) 64px, 128px"
                                className={`${getLogoClassName(teamData.logo_bg_removed)} p-1.5 sm:p-2`}
                            />
                        </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
                        <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Team Name</div>
                            <div className="text-base sm:text-xl font-semibold truncate">{teamData.name}</div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                            <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Brick #</div>
                                <div className="font-mono font-semibold text-sm">{teamData.brick_number ?? "-"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Color</div>
                                <div className="flex items-center gap-1.5">
                                    {teamData.brick_color && (
                                        <div
                                            className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm border border-border shrink-0"
                                            style={{ backgroundColor: teamData.brick_color }}
                                        />
                                    )}
                                    <span className="font-mono text-xs truncate">{teamData.brick_color ?? "-"}</span>
                                </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Roster</div>
                                <div className="font-semibold text-sm">{players.length} / 18</div>
                            </div>
                        </div>
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
