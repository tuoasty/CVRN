"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useTeamsStore } from "@/app/stores/teamStore";
import { ArrowRight, Users, Calendar, LayoutDashboard } from "lucide-react";
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
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <LayoutDashboard className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage teams, matches, and league operations
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <Card className="rounded-sm border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
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

                                        const regions = allRegionsCache?.data || [];

                                        return Object.entries(activeSeasonsByRegion).length > 0 ? (
                                            Object.entries(activeSeasonsByRegion).map(([regionId, regionSeasons]) => {
                                                const region = regions.find(r => r.id === regionId);
                                                return (
                                                    <div key={regionId} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                                                        <div>
                                                            <div className="font-mono text-xs font-bold text-primary">
                                                                {region?.code.toUpperCase() || '??'}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {region?.name || 'Unknown Region'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-semibold">
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

                    <Card className="rounded-sm border-l-4 border-l-secondary/30 bg-gradient-to-r from-secondary/5 to-transparent">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                                Total Teams
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-primary tabular-nums">{teams.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Across all regions
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-sm border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
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
                                        <div key={region.id} className="flex items-center justify-between py-1.5">
                                            <div className="text-sm">
                                                <span className="font-mono font-bold text-primary text-xs">
                                                    {region.code.toUpperCase()}
                                                </span>
                                                <span className="text-muted-foreground ml-2">
                                                    {region.name}
                                                </span>
                                            </div>
                                            <div className="text-sm font-bold tabular-nums text-primary">
                                                {teamsByRegion[region.id] || 0}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <Link href="/admin/teams">
                        <Card className="rounded-sm border-l-4 border-l-primary/20 hover:border-l-primary hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full bg-gradient-to-r from-primary/5 to-transparent">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
                                            <Users className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold">Team Management</CardTitle>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Create, edit, and manage teams
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-primary" />
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>

                    <Link href="/admin/matches">
                        <Card className="rounded-sm border-l-4 border-l-primary/20 hover:border-l-primary hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full bg-gradient-to-r from-primary/5 to-transparent">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
                                            <Calendar className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold">Match Management</CardTitle>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Schedule and manage matches
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-primary" />
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}