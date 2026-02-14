import TeamDetailPage from "@/app/features/teams/TeamDetailPage";
import React, {Suspense} from "react";

export default function TeamPage() {
    return (
        <Suspense fallback={<div>Loading team...</div>}>
            <TeamDetailPage />
        </Suspense>
    );
}