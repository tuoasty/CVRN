"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import AddPlayerToTeam from "@/app/features/players/AddPlayerToTeam";
import { deleteTeamAction } from "@/app/actions/team.actions";
import PlayerCard from "@/app/features/players/PlayerCard";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { clientLogger } from "@/app/utils/clientLogger";
import { useTeamsStore } from "@/app/stores/teamStore";
import { usePlayerStore } from "@/app/stores/playerStore";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import CaptainSlotCard from "@/app/features/players/CaptainSlotCard";
import { Card, CardContent } from "@/app/components/ui/card";
import UpdateTeamDialog from "@/app/features/teams/UpdateTeamDialog";
import {Player} from "@/shared/types/db";

type TeamDetailPageProps = {
    regionCode: string;
    seasonSlug: string;
    teamSlug: string;
};

export default function TeamDetailPage({
                                           regionCode: regionCodeProp,
                                           seasonSlug: seasonSlugProp,
                                           teamSlug: teamSlugProp
                                       }: TeamDetailPageProps) {
    const router = useRouter();
    const addFormRef = useRef<HTMLDivElement>(null);

    const regionCode = safeDecodeURIComponent(regionCodeProp).toLowerCase();
    const seasonSlug = safeDecodeURIComponent(seasonSlugProp).toLowerCase();
    const teamSlug = safeDecodeURIComponent(teamSlugProp).toLowerCase();

    const [showAddForm, setShowAddForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const teamsStore = useTeamsStore();
    const playersStore = usePlayerStore();

    const teamData = teamsStore.getTeamBySlugAndSeason(teamSlug, seasonSlug);
    const playersCacheKey = teamData?.id && teamData?.season_id ? `${teamData.id}-${teamData.season_id}` : null;
    const players = playersCacheKey ? playersStore.playersByTeamCache.get(playersCacheKey)?.data ?? [] : [];

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
            clientLogger.error('TeamDetailPage', 'Exception loading team data', { error: err });
            setError("Failed to load team data");
            setIsInitialLoad(false);
        }
    };

    const backgroundLazySync = async (teamId: string, seasonId: string) => {
        clientLogger.info('TeamDetailPage', 'Starting background lazy sync for players');

        try {
            await playersStore.fetchTeamPlayers(teamId, seasonId);
            clientLogger.info('TeamDetailPage', 'Background lazy sync completed');
        } catch (err) {
            clientLogger.error('TeamDetailPage', 'Background lazy sync failed', { error: err });
        }
    };

    const handleOpenAddForm = () => {
        setShowAddForm(true);
        setTimeout(() => {
            addFormRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);
    };

    useEffect(() => {
        if (!regionCode || !seasonSlug || !teamSlug) return;

        loadTeamWithPlayers();
    }, [regionCode, seasonSlug, teamSlug]);

    const handlePlayerAdded = (addedPlayer: Player) => {
        if (teamData?.id && teamData?.season_id) {
            const playerWithRole = {
                ...addedPlayer,
                role: 'player' as const
            };

            playersStore.addPlayerToCache(teamData.id, teamData.season_id, playerWithRole);
        }
    };

    const handlePlayerRemoved = (playerId: string) => {
        if (teamData?.id && teamData?.season_id) {
            playersStore.removePlayerFromCache(teamData.id, teamData.season_id, playerId);
        }
    };

    const handleDeleteTeam = async () => {
        if (!teamData?.id) return;

        const result = await deleteTeamAction({ teamId: teamData.id });

        if (!result.ok) {
            clientLogger.error('TeamDetailPage', 'Failed to delete team', { teamId: teamData.id, error: result.error });
            setError(result.error.message);
            return;
        }

        teamsStore.removeTeamFromCache(teamData.id);
        router.push("/admin/teams");
    };

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

    const availableRoles = {
        captain: !sortedPlayers.captain,
        viceCaptain: !sortedPlayers.viceCaptain,
        courtCaptain: !sortedPlayers.courtCaptain,
    };

    const handleRoleChanged = () => {
        if (teamData?.id && teamData?.season_id) {
            playersStore.fetchTeamPlayers(teamData.id, teamData.season_id);
        }
    };

    return (
        <div className="admin-section">
            <div className="admin-header">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/admin/teams")}
                            className="rounded-sm -ml-2"
                        >
                            ← Back to Teams
                        </Button>
                    </div>
                    <h1>{teamData.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-mono font-semibold">{regionCodeDisplay}</span> - {regionName} / {seasonName}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={showAddForm ? "secondary" : "default"}
                        onClick={handleOpenAddForm}
                        className="rounded-sm"
                        disabled={players.length >= 16}
                    >
                        {showAddForm ? "Adding Player" : "Add Player"}
                    </Button>

                    <UpdateTeamDialog team={teamData} onSuccess={loadTeamWithPlayers} />

                    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="rounded-sm">
                                Delete Team
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-sm">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete {teamData.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. All players will be removed from this team.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTeam} className="rounded-sm">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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

            {showAddForm && (
                <div ref={addFormRef} className="panel p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3>Add Player</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Search for a player to add to the team
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddForm(false)}
                            className="rounded-sm"
                        >
                            ✕
                        </Button>
                    </div>
                    <AddPlayerToTeam teamId={teamData.id} seasonId={teamData.season_id} onSuccess={handlePlayerAdded} />
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2>Team Roster</h2>
                    <span className="text-sm text-muted-foreground">
                        {players.length} / 16 {players.length === 1 ? 'player' : 'players'}
                    </span>
                </div>

                {players.length === 0 ? (
                    <div className="panel p-8">
                        <p className="text-muted-foreground text-center">
                            No players in this team yet. Click &quot;Add Player&quot; to get started.
                        </p>
                    </div>
                ) : (
                    <>
                        <div>
                            <h3 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">Leadership</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <CaptainSlotCard
                                    role="captain"
                                    player={sortedPlayers.captain}
                                    gradientFrom="#9e6bff"
                                    gradientTo="#9fc1ff"
                                    teamId={teamData.id}
                                    seasonId={teamData.season_id}
                                    onRoleChanged={handleRoleChanged}
                                    allPlayers={players}
                                    canPromoteToCaptain={availableRoles.captain}
                                />
                                <CaptainSlotCard
                                    role="vice_captain"
                                    player={sortedPlayers.viceCaptain}
                                    gradientFrom="#aea287"
                                    gradientTo="#f1f7ff"
                                    teamId={teamData.id}
                                    seasonId={teamData.season_id}
                                    onRoleChanged={handleRoleChanged}
                                    allPlayers={players}
                                    canPromoteToCaptain={availableRoles.captain}
                                />
                                <CaptainSlotCard
                                    role="court_captain"
                                    player={sortedPlayers.courtCaptain}
                                    gradientFrom="#907575"
                                    gradientTo="#ffcec6"
                                    teamId={teamData.id}
                                    seasonId={teamData.season_id}
                                    onRoleChanged={handleRoleChanged}
                                    allPlayers={players}
                                    canPromoteToCaptain={availableRoles.captain}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">Players</h3>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                                {sortedPlayers.players.map((player) => (
                                    <PlayerCard
                                        key={player.id}
                                        player={player}
                                        teamId={teamData.id}
                                        seasonId={teamData.season_id}
                                        onRoleChanged={handleRoleChanged}
                                        onRemoved={handlePlayerRemoved}
                                        availableRoles={availableRoles}
                                    />
                                ))}

                                {players.length < 16 && (
                                    <Card
                                        className="rounded-sm border-dashed border-2 h-[280px] hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer"
                                        onClick={handleOpenAddForm}
                                    >
                                        <CardContent className="p-4 h-full">
                                            <div className="flex flex-col items-center justify-center text-center h-full space-y-3">
                                                <div className="w-20 h-20 rounded-sm border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex items-center justify-center">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="32"
                                                        height="32"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="text-muted-foreground"
                                                    >
                                                        <path d="M5 12h14" />
                                                        <path d="M12 5v14" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm">Add Player</h4>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Click to add a new player
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}