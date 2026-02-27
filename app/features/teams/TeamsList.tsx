"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { getAllRegionsAction } from "@/app/actions/region.actions";
import { Region } from "@/shared/types/db";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/card";
import { TeamWithRegion } from "@/server/dto/team.dto";
import {useTeamsStore} from "@/app/stores/teamStore";
import {clientLogger} from "@/app/utils/clientLogger";

export default function TeamsList() {
    const { allTeamsCache, loading, error, fetchAllTeams } = useTeamsStore();
    const [regions, setRegions] = useState<Region[]>([]);
    const [regionsLoading, setRegionsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        console.log('[TeamsList] Component mounted, fetching teams...');
        fetchAllTeams();
        loadRegions();
    }, []);

    const loadRegions = async () => {
        setRegionsLoading(true);

        try {
            const regionsResult = await getAllRegionsAction();

            if (!regionsResult.ok) {
                clientLogger.error('TeamsList', 'Failed to fetch regions', { error: regionsResult.error });
                return;
            }

            clientLogger.info('TeamsList', 'Regions fetched', { count: regionsResult.value.length });
            setRegions(regionsResult.value);
        } catch (error) {
            clientLogger.error('TeamsList', 'Exception fetching regions', { error });
        } finally {
            setRegionsLoading(false);
        }
    };

    const getRegionCode = (regionId: string | null): string => {
        if (!regionId) return "unknown";
        const region = regions.find((r) => r.id === regionId);
        return region?.code.toLowerCase() || "unknown";
    };

    const handleTeamClick = (team: TeamWithRegion) => {
        if (!team.region_id) return;
        const regionCode = team.regions?.code.toLowerCase() || "unknown";
        router.push(`/admin/teams/${regionCode}/${team.slug}`);
    };

    const teams = allTeamsCache?.data || [];

    if (loading || regionsLoading) {
        return <div className="p-4 text-muted-foreground">Loading teams...</div>;
    }

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
                                        priority
                                        className="object-contain"
                                    />
                                </div>
                            )}
                            <h3 className="font-semibold mt-2">{team.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                {team.regions ? `${team.regions.code.toUpperCase()} - ${team.regions.name}` : "No Region"}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}