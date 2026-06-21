import PublicTeamDetailPage from "@/app/(public)/teams/[region]/[season]/[teamName]/PublicTeamDetailPage";

type PageProps = {
    params: Promise<{
        region: string;
        season: string;
        teamName: string;
    }>;
};

async function TeamDetailWrapper({ params }: PageProps) {
    const { region, season, teamName } = await params;
    return (
        <PublicTeamDetailPage
            regionCode={region}
            seasonSlug={season}
            teamSlug={teamName}
        />
    );
}

export default function TeamPage(props: PageProps) {
    return <TeamDetailWrapper params={props.params} />;
}
