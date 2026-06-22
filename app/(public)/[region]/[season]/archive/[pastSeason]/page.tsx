import { redirect } from "next/navigation";

export default async function ArchiveDetailRedirect({ params }: { params: Promise<{ region: string; season: string; pastSeason: string }> }) {
    const { region, pastSeason } = await params;
    redirect(`/${region}/${pastSeason}/archive`);
}
