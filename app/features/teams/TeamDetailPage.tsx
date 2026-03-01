"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {useTeamsStore} from "@/app/stores/teamStore";
import {usePlayersStore} from "@/app/stores/playerStore";

export default function TeamDetailPage() {
    const params = useParams();
    const router = useRouter();

    const regionCode = decodeURIComponent(String(params.region || "")).toLowerCase();
    const seasonSlug = decodeURIComponent(String(params.season || "")).toLowerCase();
    const teamSlug = decodeURIComponent(String(params.teamName || "")).toLowerCase();

    const [showAddForm, setShowAddForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const teamsStore = useTeamsStore();
    const playersStore = usePlayersStore();

    const teamCacheKey = `${teamSlug}-${seasonSlug}`;
    const teamData = teamsStore.teamDetailsCache.get(teamCacheKey)?.data;
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
        router.push("/admin/dashboard");
    };

    const loading = teamsStore.loading || playersStore.loading;
    const displayError = error || teamsStore.error || playersStore.error;

    if (loading && !teamData) {
        return <div className="p-4 text-muted-foreground">Loading team...</div>;
    }

    if (displayError) {
        return <div className="p-4 text-destructive">{displayError}</div>;
    }

    if (!teamData) {
        return <div className="p-4 text-muted-foreground">Team not found</div>;
    }

    const regionName = teamData.seasons?.regions?.name || "Unknown Region";
    const regionCodeDisplay = teamData.seasons?.regions?.code?.toUpperCase() || "??";
    const seasonName = teamData.seasons?.name || "Unknown Season";

    return (
        <div className="p-4 space-y-4">
            <span className="text-sm text-muted-foreground">
                {regionCodeDisplay} - {regionName} / {seasonName}
            </span>

            <div className="flex items-center gap-4">
                {teamData.logo_url && (
                    <Image
                        src={teamData.logo_url}
                        alt={teamData.name || ""}
                        width={150}
                        height={150}
                        loading="eager"
                        className="w-[150px] h-auto object-contain"
                    />
                )}
                <div>
                    <h2 className="text-2xl font-bold">{teamData.name}</h2>
                    <p className="text-sm text-muted-foreground">
                        {players.length} {players.length === 1 ? "player" : "players"}
                    </p>
                </div>
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
                    {showAddForm ? "Cancel" : "Add Player"}
                </Button>

                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete Team</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete {teamData.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteTeam}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {showAddForm && (
                <AddPlayerToTeam teamId={teamData.id} onSuccess={handlePlayerAdded} />
            )}

            {players.length === 0 ? (
                <p className="text-muted-foreground">No players in this team yet</p>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
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
    );
}