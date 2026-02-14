"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

import { Player, Team } from "@/shared/types/db";
import { getTeamPlayersAction } from "@/app/actions/player.actions";
import AddPlayerToTeam from "@/app/features/players/AddPlayerToTeam";
import {getTeamByNameAndRegion} from "@/server/services/team.service";
import {getTeamByNameAndRegionAction} from "@/app/actions/team.actions";

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

    if (loading) {
        return <div>Loading team...</div>;
    }

    if (error) {
        return <div style={{ color: "red" }}>{error}</div>;
    }

    if (!team) {
        return <div>Team not found</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: "0.5rem" }}>
        <span style={{ color: "#666", fontSize: "0.9rem" }}>
          {team.region}
        </span>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "1rem",
                }}
            >
                {team.logo_url && (
                    <Image
                        src={team.logo_url}
                        alt={team.name || ""}
                        width={150}
                        height={150}
                        style={{ objectFit: "contain" }}
                    />
                )}

                <div>
                    <h2 style={{ margin: 0 }}>{team.name}</h2>

                    <p
                        style={{
                            margin: "0.25rem 0 0 0",
                            color: "#666",
                        }}
                    >
                        {players.length}{" "}
                        {players.length === 1 ? "player" : "players"}
                    </p>
                </div>
            </div>

            <button onClick={() => setShowAddForm(!showAddForm)}>
                {showAddForm ? "Cancel" : "Add Player"}
            </button>

            {showAddForm && (
                <AddPlayerToTeam
                    teamId={team.id}
                    onSuccess={handlePlayerAdded}
                />
            )}

            {players.length === 0 ? (
                <div style={{ marginTop: "1rem" }}>
                    No players in this team yet
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(150px, 1fr))",
                        gap: "1rem",
                        marginTop: "1rem",
                    }}
                >
                    {players.map((player) => (
                        <div
                            key={player.id}
                            style={{
                                border: "1px solid #ccc",
                                padding: "1rem",
                                borderRadius: "8px",
                                textAlign: "center",
                            }}
                        >
                            {player.avatar_url && (
                                <Image
                                    src={player.avatar_url}
                                    alt={player.username || ""}
                                    width={100}
                                    height={100}
                                    style={{ objectFit: "contain" }}
                                />
                            )}

                            <h4
                                style={{
                                    margin: "0.5rem 0 0.25rem 0",
                                }}
                            >
                                {player.display_name || player.username}
                            </h4>

                            <p
                                style={{
                                    fontSize: "0.9rem",
                                    color: "#666",
                                    margin: 0,
                                }}
                            >
                                @{player.username}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
