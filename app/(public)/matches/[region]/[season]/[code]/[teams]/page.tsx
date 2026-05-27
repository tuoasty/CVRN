import {notFound} from "next/navigation";
import {getMatchDetailAction} from "@/app/actions/match.actions";
import {safeDecodeURIComponent} from "@/app/utils/decodeURI";
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

export default async function MatchDetailPage({params}: PageProps) {
    const {region, season, code} = await params;

    const regionCode = safeDecodeURIComponent(region).toLowerCase();
    const seasonSlug = safeDecodeURIComponent(season).toLowerCase();
    const matchCode = safeDecodeURIComponent(code);

    const result = await getMatchDetailAction(regionCode, seasonSlug, matchCode);

    if (!result.ok) {
        if (result.error.code === "NOT_FOUND") notFound();
        return (
            <div className="page-wide py-6">
                <div className="panel p-6">
                    <p className="text-destructive">Failed to load match: {result.error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-wide py-6 space-y-4">
            <BackButton />
            <MatchDetailContent
                detail={result.value}
                regionCode={regionCode}
                seasonSlug={seasonSlug}
            />
        </div>
    );
}
