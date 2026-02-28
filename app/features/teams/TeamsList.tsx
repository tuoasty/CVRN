"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/card";
import { TeamWithRegion } from "@/server/dto/team.dto";
import { useTeamsStore } from "@/app/stores/teamStore";
import { clientLogger } from "@/app/utils/clientLogger";

export default function TeamsList() {
    const { allTeamsCache, loading, error, fetchAllTeams } = useTeamsStore();
    const router = useRouter();

    useEffect(() => {
        clientLogger.info('TeamsList', 'Component mounted, fetching teams');
        fetchAllTeams();
    }, []);

    const handleTeamClick = (team: TeamWithRegion) => {
        if (!team.seasons?.regions?.code || !team.seasons?.slug) {
            clientLogger.warn('TeamsList', 'Cannot navigate - missing season or region data', { teamId: team.id });
            return;
        }

        const regionCode = team.seasons.regions.code.toLowerCase();
        const seasonSlug = team.seasons.slug.toLowerCase();
        const teamSlug = team.slug.toLowerCase();

        router.push(`/admin/teams/${regionCode}/${seasonSlug}/${teamSlug}`);
    };

    const teams = allTeamsCache?.data || [];

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
                {teams.map((team) => {
                    const hasRequiredData = team.seasons?.regions?.code && team.seasons?.slug;
                    const regionName = team.seasons?.regions?.name || "Unknown Region";
                    const regionCode = team.seasons?.regions?.code?.toUpperCase() || "??";
                    const seasonName = team.seasons?.name || "Unknown Season";

                    return (
                        <Card
                            key={team.id}
                            className={`${hasRequiredData ? 'cursor-pointer hover:border-primary' : 'opacity-50'} transition-colors`}
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
                                    {regionCode} - {regionName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {seasonName}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}