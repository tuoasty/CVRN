"use client";

import React, { Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import TeamsDataTable from "@/app/features/teams/TeamsDataTable";
import CreateTeamForm from "@/app/features/teams/CreateTeamForm";
import { Users } from "lucide-react";
import { AdminPageHeader } from "@/app/components/admin/AdminPageHeader";
import { useHasGroup } from "@/app/admin/AdminRoleProvider";

export default function AdminTeamsPage() {
    const [activeTab, setActiveTab] = useState("view");
    const canCreate = useHasGroup("admin");

    return (
        <div className="admin-container">
            <div className="admin-section">
                <AdminPageHeader
                    icon={Users}
                    title="Team Management"
                    description="Manage teams, rosters, and team information"
                />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="rounded-sm bg-muted/50 p-1">
                        <TabsTrigger value="view" className="rounded-sm">
                            All Teams
                        </TabsTrigger>
                        {canCreate && (
                            <TabsTrigger value="create" className="rounded-sm">
                                Create Team
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="view" className="mt-6">
                        {}
                        <Suspense
                            fallback={
                                <div className="panel p-6">
                                    <p className="text-muted-foreground">Loading teams...</p>
                                </div>
                            }
                        >
                            <TeamsDataTable />
                        </Suspense>
                    </TabsContent>

                    {canCreate && (
                        <TabsContent value="create" className="mt-6">
                            <div className="panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                                <CreateTeamForm onSuccess={() => setActiveTab("view")} />
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}