"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { getAllTeamsWithRegionsAction } from "@/app/actions/team.actions";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/card";
import { TeamWithRegion } from "@/server/dto/team.dto";

export default function TeamsList() {
    const [teams, setTeams] = useState<TeamWithRegion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const teamsResult = await getAllTeamsWithRegionsAction();

            if (!teamsResult.ok) {
                setError(teamsResult.error.message);
                return;
            }

            setTeams(teamsResult.value);
        } catch (error) {
            console.log(error);
            setError("Failed to load teams");
        } finally {
            setLoading(false);
        }
    };

    const handleTeamClick = (team: TeamWithRegion) => {
        if (!team.regions || !team.slug) return;
        const regionCode = team.regions.code.toLowerCase();
        router.push(`/admin/teams/${regionCode}/${team.slug}`);
    };

    if (loading) {
        return <div className="p-4 text-muted-foreground">Loading teams...</div>;
    }

    if (error) {
        return <div className="p-4 text-destructive">{error}</div>;
    }

    if (teams.length === 0) {
        return <div className="p-4 text-muted-foreground">No teams found</div>;
    }

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-2xl font-bold">Teams</h2>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {teams.map((team, index) => (
                    <Card
                        key={team.id}
                        className={`${team.regions ? 'cursor-pointer hover:border-primary' : 'opacity-50'} transition-colors`}
                        onClick={() => handleTeamClick(team)}
                    >
                        <CardContent className="p-4 text-center">
                            {team.logo_url && (
                                <div className="relative w-[150px] h-[150px] mx-auto">
                                    <Image
                                        src={team.logo_url}
                                        alt={team.name || ""}
                                        fill
                                        sizes="150px"
                                        className="object-contain"
                                        priority={index < 6}
                                    />
                                </div>
                            )}
                            <h3 className="font-semibold mt-2">{team.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                {team.regions ? team.regions.code.toUpperCase() : "No Region"}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}