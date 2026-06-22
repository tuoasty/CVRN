import { redirect } from "next/navigation";

type PageProps = {
    params: Promise<{
        region: string;
        season: string;
        code: string;
        teams: string;
    }>;
};

export default async function OldMatchDetailPage({ params }: PageProps) {
    const { region, season, code, teams } = await params;
    redirect(`/${region}/${season}/matches/${code}/${teams}`);
}
