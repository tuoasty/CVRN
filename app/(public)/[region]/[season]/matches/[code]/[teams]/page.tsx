import { notFound } from "next/navigation";
import { getCachedMatchDetail } from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import MatchDetailContent from "@/app/features/matchStats/MatchDetailContent";
import BackButton from "@/app/components/public/BackButton";

type PageProps = {
    params: Promise<{
        region: string;
        season: string;
        code: string;
        teams: string;
    }>;
};

/**
 * Empty on purpose — see players/[username]/page.tsx. Declaring it is what registers the
 * route for ISR; without it a dynamic-param route gets no Full Route Cache at all and
 * re-renders on every request. Match codes fill the cache as they are visited.
 */
export async function generateStaticParams() {
    return [];
}

export default async function MatchDetailPage({ params }: PageProps) {
    const { region, season, code } = await params;

    const regionCode = safeDecodeURIComponent(region).toLowerCase();
    const seasonSlug = safeDecodeURIComponent(season).toLowerCase();
    const matchCode = safeDecodeURIComponent(code);

    // Null only for a genuine miss; infrastructure failures throw rather than being
    // cached as a permanent 404.
    const detail = await getCachedMatchDetail(regionCode, seasonSlug, matchCode);
    if (!detail) notFound();

    return (
        <div className="page-wide py-6 space-y-4">
            <BackButton />
            <MatchDetailContent
                detail={detail}
                regionCode={regionCode}
                seasonSlug={seasonSlug}
            />
        </div>
    );
}
