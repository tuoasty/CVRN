"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import TeamsDataTable from "@/app/features/teams/TeamsDataTable";
import CreateTeamForm from "@/app/features/teams/CreateTeamForm";
export default function AdminTeamsPage() {
    const [activeTab, setActiveTab] = useState("view");

    return (
        <div className="admin-section">
            <div className="admin-header">
                <div>
                    <h1>Team Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage teams, rosters, and team information
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="rounded-sm">
                    <TabsTrigger value="view" className="rounded-sm">
                        All Teams
                    </TabsTrigger>
                    <TabsTrigger value="create" className="rounded-sm">
                        Create Team
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="view" className="mt-6">
                    <TeamsDataTable />
                </TabsContent>

                <TabsContent value="create" className="mt-6">
                    <div className="panel p-6 max-w-2xl">
                        <CreateTeamForm onSuccess={() => setActiveTab("view")} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}