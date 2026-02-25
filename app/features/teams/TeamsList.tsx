"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/card";
import { TeamWithRegion } from "@/server/dto/team.dto";
import {useTeamStore} from "@/app/stores/teamStore";

export default function TeamsList() {
    const router = useRouter();
    const { teamsById, isLoading, error, fetchAllTeams } = useTeamStore();
    const teams = Array.from(teamsById.values());

    useEffect(() => {
        fetchAllTeams();
    }, [fetchAllTeams]);

    const handleTeamClick = (team: TeamWithRegion) => {
        if (!team.regions || !team.slug) return;
        const regionCode = team.regions.code.toLowerCase();
        router.push(`/admin/teams/${regionCode}/${team.slug}`);
    };

    if (isLoading) {
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