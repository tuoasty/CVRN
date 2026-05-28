import PublicTeamDetailPage from "@/app/(public)/teams/[region]/[season]/[teamName]/PublicTeamDetailPage";

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
    return <TeamDetailWrapper params={props.params} />;
}