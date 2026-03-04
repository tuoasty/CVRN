import { Suspense } from "react";
import TeamDetailPage from "@/app/features/teams/TeamDetailPage";

export default function TeamPage() {
    return (
        <Suspense fallback={<div className="admin-section"><div className="panel p-6"><p>Loading...</p></div></div>}>
            <TeamDetailPage />
        </Suspense>
    );
}