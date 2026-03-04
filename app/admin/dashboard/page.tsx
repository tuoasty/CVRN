"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useTeamsStore } from "@/app/stores/teamStore";
import { ArrowRight, Users, Calendar } from "lucide-react";
import { useRegionsStore } from "@/app/stores/regionStore";

export default function AdminDashboard() {
    const { allSeasonsCache, fetchAllSeasons } = useSeasonsStore();
    const { allTeamsCache, fetchAllTeams } = useTeamsStore();
    const { allRegionsCache, fetchAllRegions } = useRegionsStore();

    useEffect(() => {
        fetchAllSeasons();
        fetchAllTeams();
        fetchAllRegions();
    }, []);

    const seasons = allSeasonsCache?.data || [];
    const teams = allTeamsCache?.data || [];

    return (
        <div className="space-y-6">
            <div className="admin-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage teams, matches, and league operations
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Card className="rounded-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Active Seasons by Region
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {seasons.length > 0 ? (
                                (() => {
                                    const activeSeasonsByRegion = seasons
                                        .filter(s => s.is_active)
                                        .reduce((acc, season) => {
                                            const regionId = season.region_id;
                                            if (!acc[regionId]) {
                                                acc[regionId] = [];
                                            }
                                            acc[regionId].push(season);
                                            return acc;
                                        }, {} as Record<string, typeof seasons>);

                                    // Get regions data
                                    const regions = allRegionsCache?.data || [];

                                    return Object.entries(activeSeasonsByRegion).length > 0 ? (
                                        Object.entries(activeSeasonsByRegion).map(([regionId, regionSeasons]) => {
                                            const region = regions.find(r => r.id === regionId);
                                            return (
                                                <div key={regionId} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                                                    <div>
                                                        <div className="font-mono text-xs font-semibold text-primary">
                                                            {region?.code.toUpperCase() || '??'}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {region?.name || 'Unknown Region'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium">
                                                            {regionSeasons.map(s => s.name).join(', ')}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {regionSeasons.length} active
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No active seasons</p>
                                    );
                                })()
                            ) : (
                                <p className="text-sm text-muted-foreground">No seasons available</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Total Teams
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{teams.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across all regions
                        </p>
                    </CardContent>
                </Card>
                <Card className="rounded-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Teams by Region
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {(() => {
                                const regions = allRegionsCache?.data || [];

                                if (regions.length === 0) {
                                    return <p className="text-sm text-muted-foreground">No regions</p>;
                                }

                                const teamsByRegion = teams.reduce((acc, team) => {
                                    const regionId = team.seasons?.regions.id;
                                    if (regionId) {
                                        acc[regionId] = (acc[regionId] || 0) + 1;
                                    }
                                    return acc;
                                }, {} as Record<string, number>);

                                return regions.map((region) => (
                                    <div key={region.id} className="flex items-center justify-between py-1">
                                        <div className="text-sm">
                            <span className="font-mono font-semibold text-primary text-xs">
                                {region.code.toUpperCase()}
                            </span>
                                            <span className="text-muted-foreground ml-2">
                                {region.name}
                            </span>
                                        </div>
                                        <div className="text-sm font-medium">
                                            {teamsByRegion[region.id] || 0}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Link href="/admin/teams">
                    <Card className="rounded-sm hover:border-primary transition-colors cursor-pointer h-full">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">Team Management</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Create, edit, and manage teams
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/admin/matches">
                    <Card className="rounded-sm hover:border-primary transition-colors cursor-pointer h-full">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">Match Management</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Schedule and manage matches
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    );
}