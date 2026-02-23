"use client";

import { useState, useEffect } from "react";
import {useParams, useRouter} from "next/navigation";
import Image from "next/image";

import { Player, Team } from "@/shared/types/db";
import { getTeamPlayersAction } from "@/app/actions/player.actions";
import AddPlayerToTeam from "@/app/features/players/AddPlayerToTeam";
import {deleteTeamAction, getTeamByNameAndRegionAction} from "@/app/actions/team.actions";
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
import {Button} from "@/app/components/ui/button";

export default function TeamDetailPage() {
    const params = useParams();

    const region = decodeURIComponent(
        String(params.region || "")
    ).toLowerCase();

    const teamName = decodeURIComponent(
        String(params.teamName || "")
    ).toLowerCase();

    const [team, setTeam] = useState<Team | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!region || !teamName) return;

        loadTeamData();
    }, [region, teamName]);

    const loadTeamData = async () => {
        setLoading(true);
        setError(null);

        try {
            const teamResult = await getTeamByNameAndRegionAction({
                region,
                name: teamName,
            });

            if (!teamResult.ok) {
                setError(teamResult.error.message);
                return;
            }

            const foundTeam = teamResult.value;

            if (!foundTeam) {
                setError("Team not found");
                return;
            }

            setTeam(foundTeam);

            const playersResult = await getTeamPlayersAction({
                teamId: foundTeam.id,
            });

            if (!playersResult.ok) {
                setError(playersResult.error.message);
                return;
            }

            setPlayers(playersResult.value);
        } catch (err) {
            console.error(err);
            setError("Failed to load team data");
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerAdded = () => {
        setShowAddForm(false);
        loadTeamData();
    };

    const handleDeleteTeam = async () => {
        if (!team?.id) return;
        const result = await deleteTeamAction({ teamId: team.id });
        if (!result.ok) {
            setError(result.error.message);
            return;
        }
        router.push("/admin/dashboard");
    //     @TODO Change the push to correct admin teams page
    };

    if (loading) {
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
            <span className="text-sm text-muted-foreground">{team.region}</span>

            <div className="flex items-center gap-4">
                {team.logo_url && (
                    <Image
                        src={team.logo_url}
                        alt={team.name || ""}
                        width={150}
                        height={150}
                        className="object-contain"
                    />
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
