"use client";

import { useState, useEffect } from "react";
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
import {safeDecodeURIComponent} from "@/app/utils/decodeURI";

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

    const regionCode = safeDecodeURIComponent(regionCodeProp).toLowerCase();
    const seasonSlug = safeDecodeURIComponent(seasonSlugProp).toLowerCase();
    const teamSlug = safeDecodeURIComponent(teamSlugProp).toLowerCase();

    const [showAddForm, setShowAddForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const teamsStore = useTeamsStore();
    const playersStore = usePlayerStore();

    const teamData = teamsStore.getTeamBySlugAndSeason(teamSlug, seasonSlug);
    const playersCacheKey = teamData?.id && teamData?.season_id ? `${teamData.id}-${teamData.season_id}` : null;
    const players = playersCacheKey ? playersStore.playersByTeamCache.get(playersCacheKey)?.data ?? [] : [];

    const loadTeam = async () => {
        setError(null);

        try {
            await teamsStore.fetchTeamDetails(teamSlug, seasonSlug, regionCode);

            if (teamsStore.error) {
                setError(teamsStore.error);
            }
        } catch (err) {
            clientLogger.error('TeamDetailPage', 'Exception loading team data', { error: err });
            setError("Failed to load team data");
        }
    };

    useEffect(() => {
        if (!regionCode || !seasonSlug || !teamSlug) return;

        loadTeam();
    }, [regionCode, seasonSlug, teamSlug]);

    useEffect(() => {
        if (teamData?.id && teamData?.season_id) {
            playersStore.fetchTeamPlayers(teamData.id, teamData.season_id);
        }
    }, [teamData?.id, teamData?.season_id]);

    const handlePlayerAdded = () => {
        setShowAddForm(false);
        if (teamData?.id && teamData?.season_id) {
            playersStore.clearCache();
            playersStore.fetchTeamPlayers(teamData.id, teamData.season_id);
        }
    };

    const handlePlayerRemoved = () => {
        if (teamData?.id && teamData?.season_id) {
            playersStore.clearCache();
            playersStore.fetchTeamPlayers(teamData.id, teamData.season_id);
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

    const loading = teamsStore.loading || playersStore.loading;
    const displayError = error || teamsStore.error || playersStore.error;

    if (loading && !teamData) {
        return (
            <div className="admin-section">
                <div className="panel p-6">
                    <p className="text-muted-foreground">Loading team...</p>
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
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="rounded-sm"
                    >
                        {showAddForm ? "Cancel" : "Add Player"}
                    </Button>

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
                                <div className="font-semibold">{players.length}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showAddForm && (
                <div className="panel p-6">
                    <AddPlayerToTeam teamId={teamData.id} onSuccess={handlePlayerAdded} />
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2>Team Roster</h2>
                    <span className="text-sm text-muted-foreground">
                        {players.length} {players.length === 1 ? 'player' : 'players'}
                    </span>
                </div>

                {players.length === 0 ? (
                    <div className="panel p-8">
                        <p className="text-muted-foreground text-center">
                            No players in this team yet. Click &quot;Add Player&quot; to get started.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                        {players.map((player) => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                seasonId={teamData.season_id}
                                onRemoved={handlePlayerRemoved}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}