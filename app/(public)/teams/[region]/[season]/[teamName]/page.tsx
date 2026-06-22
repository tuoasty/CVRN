import { redirect } from "next/navigation";

type PageProps = {
    params: Promise<{
        region: string;
        season: string;
        teamName: string;
    }>;
};

export default async function OldTeamDetailPage({ params }: PageProps) {
    const { region, season, teamName } = await params;
    redirect(`/${region}/${season}/teams/${teamName}`);
}