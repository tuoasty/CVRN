import { Suspense } from "react";
import PublicTeamDetailPage from "@/app/(public)/teams/[region]/[season]/[teamName]/PublicTeamDetailPage";
import { Skeleton } from "@/app/components/ui/skeleton";

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
        <PublicTeamDetailPage
            regionCode={resolvedParams.region}
            seasonSlug={resolvedParams.season}
            teamSlug={resolvedParams.teamName}
        />
    );
}

export default function TeamPage(props: PageProps) {
    return (
        <Suspense fallback={
            <div className="space-y-4 py-6">
                <Skeleton className="h-8 w-48 rounded-sm" />
                <Skeleton className="h-32 rounded-sm" />
            </div>
        }>
            <TeamDetailWrapper params={props.params} />
        </Suspense>
    );
}