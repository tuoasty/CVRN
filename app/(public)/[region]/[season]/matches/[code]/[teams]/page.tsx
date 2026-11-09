import { notFound } from "next/navigation";
import { getCachedMatchDetail } from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import MatchDetailContent from "@/app/features/matchStats/MatchDetailContent";
import BackButton from "@/app/components/public/BackButton";
import { loadMatchExtras } from "@/app/features/matchStats/loadMatchExtras";

type PageProps = {
    params: Promise<{
        region: string;
        season: string;
        code: string;
        teams: string;
    }>;
};

export async function generateStaticParams() {
    return [];
}

export default async function MatchDetailPage({ params }: PageProps) {
    const { region, season, code } = await params;

    const regionCode = safeDecodeURIComponent(region).toLowerCase();
    const seasonSlug = safeDecodeURIComponent(season).toLowerCase();
    const matchCode = safeDecodeURIComponent(code);

    const detail = await getCachedMatchDetail(regionCode, seasonSlug, matchCode);
    if (!detail) notFound();
    const extras = await loadMatchExtras(detail);

    return (
        <div className="page-wide py-6">
            <BackButton />
            <div className="mt-4">
                <MatchDetailContent detail={detail} extras={extras} />
            </div>
        </div>
    );
}
