"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { getAllTeamsAction } from "@/app/actions/team.actions";
import { getAllRegionsAction } from "@/app/actions/region.actions";
import { Team, Region } from "@/shared/types/db";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/card";

export default function TeamsList() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
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
            const [teamsResult, regionsResult] = await Promise.all([
                getAllTeamsAction(),
                getAllRegionsAction(),
            ]);

            if (!teamsResult.ok) {
                setError(teamsResult.error.message);
                return;
            }

            if (!regionsResult.ok) {
                setError(regionsResult.error.message);
                return;
            }

            setTeams(teamsResult.value);
            setRegions(regionsResult.value);
        } catch (error) {
            console.log(error);
            setError("Failed to load teams");
        } finally {
            setLoading(false);
        }
    };

    const getRegionCode = (regionId: string | null): string => {
        if (!regionId) return "unknown";
        const region = regions.find((r) => r.id === regionId);
        return region?.code.toLowerCase() || "unknown";
    };

    const handleTeamClick = (team: Team) => {
        if (!team.region_id) return;
        const regionCode = getRegionCode(team.region_id);
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
                {teams.map((team) => (
                    <Card
                        key={team.id}
                        className={`${team.region_id ? 'cursor-pointer hover:border-primary' : 'opacity-50'} transition-colors`}
                        onClick={() => handleTeamClick(team)}
                    >
                        <CardContent className="p-4 text-center">
                            {team.logo_url && (
                                <Image
                                    src={team.logo_url}
                                    alt={team.name || ""}
                                    width={150}
                                    height={150}
                                    className="object-contain mx-auto"
                                />
                            )}
                            <h3 className="font-semibold mt-2">{team.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                {team.region_id ? getRegionCode(team.region_id).toUpperCase() : "No Region"}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}