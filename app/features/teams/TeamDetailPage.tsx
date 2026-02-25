"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

import { TeamWithRegion } from "@/server/dto/team.dto";
import AddPlayerToTeam from "@/app/features/players/AddPlayerToTeam";
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
import {useTeamStore} from "@/app/stores/teamStore";
import {usePlayersStore} from "@/app/stores/playersStore";

export default function TeamDetailPage() {
    const params = useParams();

    const region = decodeURIComponent(
        String(params.region || "")
    ).toLowerCase();

    const teamName = decodeURIComponent(
        String(params.teamName || "")
    ).toLowerCase();

    const router = useRouter();
    const [showAddForm, setShowAddForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { fetchTeamBySlug, deleteTeam, isLoading, error: teamError } = useTeamStore();
    const { fetchPlayersForTeam, getPlayersByTeam } = usePlayersStore();
    const [team, setTeam] = useState<TeamWithRegion | null>(null);

    useEffect(() => {
        if (!region || !teamName) return;

        loadTeamData();
    }, [region, teamName]);

    const loadTeamData = async () => {
        const fetchedTeam = await fetchTeamBySlug(region, teamName);
        if (fetchedTeam) {
            setTeam(fetchedTeam);
            await fetchPlayersForTeam(fetchedTeam.id);
        }
    };

    const players = team ? getPlayersByTeam(team.id) : [];
    const error = teamError;

    const handlePlayerAdded = async () => {
        setShowAddForm(false);
        if (team) {
            await fetchPlayersForTeam(team.id, { force: true });
        }
    };

    const handleDeleteTeam = async () => {
        if (!team?.id) return;
        const result = await deleteTeam(team.id);
        if (result.ok) {
            router.push("/admin/dashboard");
            // TODO change to relative path
        }
    };

    if (isLoading) {
        return <div className="p-4 text-muted-foreground">Loading team...</div>;
    }

    if (error) {
        return <div className="p-4 text-destructive">{error}</div>;
    }

    if (!team) {
        return <div className="p-4 text-muted-foreground">Team not found</div>;
    }

    return (
        <div className="p-4 space-y-4">
            <span className="text-sm text-muted-foreground">
                {team.regions ? `${team.regions.code.toUpperCase()} - ${team.regions.name}` : "No Region"}
            </span>

            <div className="flex items-center gap-4">
                {team.logo_url && (
                    <div className="relative w-[150px] h-[150px]">
                        <Image
                            src={team.logo_url}
                            alt={team.name || ""}
                            fill
                            sizes="150px"
                            className="object-contain"
                            priority
                        />
                    </div>
                )}
                <div>
                    <h2 className="text-2xl font-bold">{team.name}</h2>
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
                            <AlertDialogTitle>Delete {team.name}?</AlertDialogTitle>
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
                <AddPlayerToTeam teamId={team.id} onSuccess={handlePlayerAdded} />
            )}

            {players.length === 0 ? (
                <p className="text-muted-foreground">No players in this team yet</p>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
                    {players.map((player) => (
                        <PlayerCard key={player.id} player={player} onRemoved={loadTeamData} />
                    ))}
                </div>
            )}
        </div>
    );
}