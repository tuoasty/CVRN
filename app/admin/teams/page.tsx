"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import TeamsDataTable from "@/app/features/teams/TeamsDataTable";
import CreateTeamForm from "@/app/features/teams/CreateTeamForm";
import { Users } from "lucide-react";

export default function AdminTeamsPage() {
    const [activeTab, setActiveTab] = useState("view");

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <Users className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Team Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage teams, rosters, and team information
                        </p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="rounded-sm bg-muted/50 p-1">
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
                        <div className="panel p-6 border-l-4 border-l-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                            <CreateTeamForm onSuccess={() => setActiveTab("view")} />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}