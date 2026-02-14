"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { getAllTeamsAction } from "@/app/actions/team.actions";
import { Team } from "@/shared/types/db";
import {useRouter} from "next/navigation";

export default function TeamsList() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter()

    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await getAllTeamsAction();

            if (!result.ok) {
                setError(result.error.message);
                return;
            }

            setTeams(result.value);
        } catch (error) {
            console.log(error);
            setError("Failed to load teams");
        } finally {
            setLoading(false);
        }
    };

    const handleTeamClick= (team: Team) => {
        const region = (team.region || "Unknown").toLowerCase();
        const teamName = team.name.toLowerCase();
        router.push(`/admin/teams/${encodeURIComponent(region)}/${encodeURIComponent(teamName)}`)
    }

    if (loading) {
        return <div>Loading teams...</div>;
    }

    if (error) {
        return <div style={{ color: "red" }}>{error}</div>;
    }

    if (teams.length === 0) {
        return <div>No teams found</div>;
    }

    return (
        <div>
            <h2>Teams</h2>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "1rem",
                }}
            >
                {teams.map((team) => (
                    <div
                        key={team.id}
                        style={{
                            border: "1px solid #ccc",
                            padding: "1rem",
                            borderRadius: "8px",
                            textAlign: "center",
                        }}
                        onClick={() => handleTeamClick(team)}
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
                        <h3>{team.name}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
}