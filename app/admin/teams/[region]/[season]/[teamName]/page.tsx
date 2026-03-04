import { Suspense } from "react";
import TeamDetailPage from "@/app/features/teams/TeamDetailPage";

type PageProps = {
    params: Promise<{
        region: string;
        season: string;
        teamName: string;
    }>;
};

export default async function TeamPage(props: PageProps) {
    const params = await props.params;

    return (
        <Suspense fallback={
            <div className="admin-section">
                <div className="panel p-6">
                    <p className="text-muted-foreground">Loading team...</p>
                </div>
            </div>
        }>
            <TeamDetailPage
                regionCode={params.region}
                seasonSlug={params.season}
                teamSlug={params.teamName}
            />
        </Suspense>
    );
}