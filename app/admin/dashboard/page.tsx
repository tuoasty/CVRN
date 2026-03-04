"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { useSeasonsStore } from "@/app/stores/seasonStore";
import { useTeamsStore } from "@/app/stores/teamStore";
import { ArrowRight, Users, Calendar } from "lucide-react";

export default function AdminDashboard() {
    const { allSeasonsCache, fetchAllSeasons } = useSeasonsStore();
    const { allTeamsCache, fetchAllTeams } = useTeamsStore();

    useEffect(() => {
        fetchAllSeasons();
        fetchAllTeams();
    }, []);

    const seasons = allSeasonsCache?.data || [];
    const teams = allTeamsCache?.data || [];
    const activeSeason = seasons.find((s) => s.is_active);

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
                            Active Season
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">
                            {activeSeason?.name || "None"}
                        </div>
                        {activeSeason && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Started {new Date(activeSeason.start_date).toLocaleDateString()}
                            </p>
                        )}
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
                            Across all seasons
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Total Seasons
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{seasons.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {seasons.filter((s) => s.is_active).length} active
                        </p>
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