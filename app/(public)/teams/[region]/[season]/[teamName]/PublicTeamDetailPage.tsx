"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTeamsStore } from "@/app/stores/teamStore";
import { usePlayerStore } from "@/app/stores/playerStore";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { ChevronLeft, Users } from "lucide-react";
import { PlayerWithRole } from "@/server/dto/player.dto";
import { Card, CardContent } from "@/app/components/ui/card";
import { clientLogger } from "@/app/utils/clientLogger";

const ROLE_BADGE_CONFIG = {
    captain: { label: "C", className: "bg-purple-600/15 text-purple-600 border-purple-600/30" },
    vice_captain: { label: "VC", className: "bg-amber-600/15 text-amber-600 border-amber-600/30" },
    court_captain: { label: "CC", className: "bg-orange-600/15 text-orange-600 border-orange-600/30" },
};

function PublicPlayerCard({ player, index }: { player: PlayerWithRole; index: number }) {
    const roleBadge = player.role && player.role !== "player" ? ROLE_BADGE_CONFIG[player.role] : null;
    const displayBadge = roleBadge ? roleBadge.label : `#${index + 1}`;
    const badgeClassName = roleBadge ? roleBadge.className : "bg-muted/50 text-muted-foreground border-border";

    return (
        <Card className="rounded-sm hover:border-primary/50 transition-colors">
            <CardContent className="p-3 relative">
                <Badge
                    variant="outline"
                    className={`absolute top-2 right-2 rounded-sm text-[10px] h-5 px-1.5 font-semibold ${badgeClassName}`}
                >
                    {displayBadge}
                </Badge>
                <div className="flex flex-col items-center text-center space-y-2 pt-2">
                    {player.avatar_url ? (
                        <div className="relative w-14 h-14 rounded-sm overflow-hidden border border-border">
                            <Image
                                src={player.avatar_url}
                                alt={player.username || ""}
                                fill
                                sizes="56px"
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <div className="relative w-14 h-14 rounded-sm overflow-hidden border border-border bg-muted/50 flex items-center justify-center">
                            <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                    )}
                    <div className="w-full">
                        <h4 className="font-semibold text-xs truncate">
                            {player.display_name || player.username}
                        </h4>
                        <p className="text-[10px] text-muted-foreground truncate">
                            @{player.username}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
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

    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const teamsStore = useTeamsStore();
    const playersStore = usePlayerStore();

    const teamData = teamsStore.getTeamBySlugAndSeason(teamSlug, seasonSlug);
    const playersCacheKey = teamData?.id && teamData?.season_id
        ? `${teamData.id}-${teamData.season_id}`
        : null;
    const cachedData = playersCacheKey
        ? playersStore.playersByTeamCache.get(playersCacheKey)
        : null;
    const players = cachedData?.data ?? [];

    const loadTeamWithPlayers = async () => {
        setError(null);

        try {
            const result = await teamsStore.fetchTeamWithPlayers(teamSlug, seasonSlug, regionCode);

            if (teamsStore.error) {
                setError(teamsStore.error);
                setIsInitialLoad(false);
                return;
            }

            if (result) {
                playersStore.setTeamPlayersCache(result.team.id, result.team.season_id, result.players);

                backgroundLazySync(result.team.id, result.team.season_id);
            }

            setIsInitialLoad(false);
        } catch (err) {
            clientLogger.error('PublicTeamDetailPage', 'Exception loading team data', { error: err });
            setError("Failed to load team data");
            setIsInitialLoad(false);
        }
    };

    const backgroundLazySync = async (teamId: string, seasonId: string) => {
        clientLogger.info('PublicTeamDetailPage', 'Starting background lazy sync for players');

        try {
            await playersStore.fetchTeamPlayers(teamId, seasonId);
            clientLogger.info('PublicTeamDetailPage', 'Background lazy sync completed');
        } catch (err) {
            clientLogger.error('PublicTeamDetailPage', 'Background lazy sync failed', { error: err });
        }
    };

    useEffect(() => {
        if (!regionCode || !seasonSlug || !teamSlug) return;
        loadTeamWithPlayers();
    }, [regionCode, seasonSlug, teamSlug]);

    const loading = isInitialLoad && teamsStore.loading;
    const displayError = error || teamsStore.error;

    if (loading && !teamData) {
        return (
            <div className="admin-section">
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
            <div className="admin-section">
                <div className="panel p-6">
                    <p className="text-destructive">{displayError}</p>
                </div>
            </div>
        );
    }

    if (!teamData) {
        return (
            <div className="admin-section">
                <div className="panel p-6">
                    <p className="text-muted-foreground">Team not found</p>
                </div>
            </div>
        );
    }

    const regionName = teamData.seasons?.regions?.name || "Unknown Region";
    const regionCodeDisplay = teamData.seasons?.regions?.code?.toUpperCase() || "??";
    const seasonName = teamData.seasons?.name || "Unknown Season";
    const sortedPlayers = playersStore.getSortedTeamPlayers(teamData.id, teamData.season_id);

    const allPlayersSorted = [
        ...(sortedPlayers.captain ? [sortedPlayers.captain] : []),
        ...(sortedPlayers.viceCaptain ? [sortedPlayers.viceCaptain] : []),
        ...(sortedPlayers.courtCaptain ? [sortedPlayers.courtCaptain] : []),
        ...sortedPlayers.players,
    ];

    return (
        <div className="admin-section">
            <div className="admin-header">
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
                    <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-mono font-semibold">{regionCodeDisplay}</span>
                        {" - "}{regionName}{" / "}{seasonName}
                    </p>
                </div>
            </div>

            <div className="panel p-6">
                <div className="flex items-start gap-6">
                    {teamData.logo_url && (
                        <div className="relative w-32 h-32 shrink-0">
                            <Image
                                src={teamData.logo_url}
                                alt={teamData.name || ""}
                                fill
                                sizes="128px"
                                className="object-contain"
                            />
                        </div>
                    )}
                    <div className="space-y-3">
                        <div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                                Team Name
                            </div>
                            <div className="text-xl font-semibold">{teamData.name}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                                    Brick Number
                                </div>
                                <div className="font-mono font-semibold">{teamData.brick_number}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                                    Brick Color
                                </div>
                                <div className="flex items-center gap-2">
                                    {teamData.brick_color && (
                                        <div
                                            className="w-6 h-6 rounded-sm border border-border"
                                            style={{ backgroundColor: teamData.brick_color }}
                                        />
                                    )}
                                    <span className="font-mono text-sm">{teamData.brick_color}</span>
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                                    Total Players
                                </div>
                                <div className="font-semibold">{players.length} / 16</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {players.length === 0 ? (
                    <div className="panel p-8">
                        <p className="text-muted-foreground text-center">No players on this roster</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm uppercase tracking-wide text-muted-foreground">
                                Roster
                            </h3>
                            <span className="text-sm text-muted-foreground">
                                {players.length} / 16
                            </span>
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                            {allPlayersSorted.map((player, index) => (
                                <PublicPlayerCard key={player.id} player={player} index={index} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}