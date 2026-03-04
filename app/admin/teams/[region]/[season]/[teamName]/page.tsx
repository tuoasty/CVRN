import { Suspense } from "react";
import TeamDetailPage from "@/app/features/teams/TeamDetailPage";

type PageProps = {
    params: Promise<{
        region: string;
        season: string;
        teamName: string;
    }>;
};

async function TeamDetailWrapper({ params }: { params: Promise<{ region: string; season: string; teamName: string }> }) {
    const resolvedParams = await params;

    return (
        <TeamDetailPage
            regionCode={resolvedParams.region}
            seasonSlug={resolvedParams.season}
            teamSlug={resolvedParams.teamName}
        />
    );
}

export default function TeamPage(props: PageProps) {
    return (
        <Suspense fallback={
            <div className="admin-section">
                <div className="panel p-6">
                    <p className="text-muted-foreground">Loading team...</p>
                </div>
            </div>
        }>
            <TeamDetailWrapper params={props.params} />
        </Suspense>
    );
}